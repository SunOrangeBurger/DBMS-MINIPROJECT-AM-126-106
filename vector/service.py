"""
AutoCare semantic-search HTTP service (FastAPI)

Run (from the vector/ folder, with the DB_* env vars set - see README):

    uvicorn service:app --host 127.0.0.1 --port 8001

Endpoints
    GET  /health                -> status, embedding model in use, indexed documents
    GET  /search?q=...&k=5      -> nearest past appointments (cosine similarity)
    POST /index/{appointment_id}-> (re)index one appointment
    POST /reindex               -> rebuild the whole collection from MySQL

If VECTOR_SERVICE_TOKEN is set, every request must carry the same value in the
X-Internal-Token header (the Next.js backend sends it). Bind to 127.0.0.1 so the
service is only reachable from the same machine.
"""
import hmac
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Query

from semantic_core import SemanticIndex

_state = {"index": None}


@asynccontextmanager
async def lifespan(_app):
    _state["index"] = SemanticIndex()
    if _state["index"].degraded:
        print("[vector] WARNING: sentence model unavailable - using TF-IDF fallback (keyword-like, not semantic).")
    print(
        f"[vector] ready: model={_state['index'].embedder.name} "
        f"documents={_state['index'].count()}"
    )
    yield


app = FastAPI(title="AutoCare semantic search", lifespan=lifespan)


def require_token(x_internal_token: str = Header(default="")):
    expected = os.environ.get("VECTOR_SERVICE_TOKEN", "")
    if expected and not hmac.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail="Invalid service token")


def index() -> SemanticIndex:
    if _state["index"] is None:
        raise HTTPException(status_code=503, detail="Index not ready")
    return _state["index"]


@app.get("/health")
def health():
    idx = index()
    return {
        "status": "degraded" if idx.degraded or idx.last_error else "ok",
        "embedding_model": idx.embedder.name,
        "degraded": idx.degraded,
        "documents": idx.count(),
        "metric": idx.space,
        "min_similarity": idx.min_similarity,
        "last_error": idx.last_error,
    }


@app.get("/search", dependencies=[Depends(require_token)])
def search(
    q: str = Query(..., min_length=2, max_length=500),
    k: int = Query(5, ge=1, le=20),
    min_similarity: float = Query(None, ge=0, le=1),
):
    idx = index()
    if idx.count() == 0:  # index was built before the data existed (or MySQL was down): try once more
        try:
            idx.rebuild()
        except Exception as exc:
            idx.last_error = f"{type(exc).__name__}: {exc}"
    results, best = idx.search_with_stats(q, k, min_similarity)
    return {
        "query": q,
        "model": idx.embedder.name,
        "degraded": idx.degraded,
        "min_similarity": idx.min_similarity if min_similarity is None else min_similarity,
        "best_similarity": best,
        "results": results,
    }


@app.post("/index/{appointment_id}", dependencies=[Depends(require_token)])
def index_one(appointment_id: int):
    return {"indexed": index().upsert(appointment_id)}


@app.post("/reindex", dependencies=[Depends(require_token)])
def reindex():
    try:
        return {"indexed": index().rebuild()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not read MySQL: {exc}")
