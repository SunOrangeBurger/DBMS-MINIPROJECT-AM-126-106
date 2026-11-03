"""
AutoCare - semantic search core (shared by the HTTP service and the CLI demo)
==============================================================================

WHAT IS EMBEDDED
    One document per appointment = complaint_notes + diagnosis_notes
    (free text that SQL can only match by shared keywords).

EMBEDDING MODEL
    Primary : all-MiniLM-L6-v2 sentence-transformer (384 dimensions), shipped
              with Chroma as `DefaultEmbeddingFunction` (ONNX runtime). The model
              file (~80 MB) is downloaded once on first use and cached locally.
    Fallback: TF-IDF vectors (scikit-learn). Used ONLY when the model cannot be
              downloaded (no internet). It matches shared vocabulary, not
              meaning, so results are weaker. /health reports which one is active.
    Select with EMBEDDING_MODE = auto (default) | minilm | tfidf

VECTOR STORE
    Chroma (local, persistent) collection `service_notes`, HNSW index with the
    COSINE metric set explicitly. (Chroma's default is L2 distance.)
    Embeddings are computed here and passed to Chroma directly, so the
    collection never depends on a Python embedding function being re-created
    after a restart.

RETRIEVAL
    query text -> embed -> top-k nearest neighbours by cosine distance.
    similarity = 1 - cosine_distance. The web app joins the returned
    appointment_ids back to MySQL (vw_service_history) for the full context.
"""
import os
from uuid import uuid4

import chromadb
import mysql.connector

COLLECTION_NAME = "service_notes"


# ---------------------------------------------------------------- MySQL
def get_mysql_connection():
    """Credentials come from environment variables - never hard-coded."""
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "autocare"),
        # Do not make FastAPI startup or /reindex hang indefinitely when MySQL
        # is down or the host is wrong. mysql-connector expects whole seconds.
        connection_timeout=max(1, int(os.environ.get("DB_CONNECT_TIMEOUT", "5"))),
    )


_SELECT = """
    SELECT sa.appointment_id, v.registration_no, v.make, v.model,
           st.name AS service_name, sa.status,
           sa.complaint_notes, sa.diagnosis_notes
    FROM service_appointments sa
    JOIN vehicles v       ON v.vehicle_id = sa.vehicle_id
    JOIN service_types st ON st.service_type_id = sa.service_type_id
    WHERE sa.complaint_notes IS NOT NULL
"""


def fetch_notes(appointment_id=None):
    conn = get_mysql_connection()
    try:
        cur = conn.cursor(dictionary=True)
        if appointment_id is None:
            cur.execute(_SELECT)
        else:
            cur.execute(_SELECT + " AND sa.appointment_id = %s", (appointment_id,))
        rows = cur.fetchall()
        cur.close()
        return rows
    finally:
        conn.close()


def combined_text(row):
    """Text that gets embedded: service name + customer complaint + mechanic diagnosis."""
    parts = [row.get("service_name"), row.get("complaint_notes"), row.get("diagnosis_notes")]
    return ". ".join(str(p).strip().rstrip(".") for p in parts if p and str(p).strip())


def metadata_for(row):
    return {
        "appointment_id": int(row["appointment_id"]),
        "registration_no": row["registration_no"],
        "vehicle": f"{row['make']} {row['model']}",
        "service_name": row["service_name"],
        "status": row["status"],
    }


# ---------------------------------------------------------------- embedders
class MiniLMEmbedder:
    name = "all-MiniLM-L6-v2"
    needs_refit = False

    def __init__(self):
        from chromadb.utils import embedding_functions

        self._fn = embedding_functions.DefaultEmbeddingFunction()
        self.encode(["warm up"])  # forces the model download now, so we can fall back

    def fit(self, corpus):
        pass

    def encode(self, texts):
        return [[float(x) for x in vec] for vec in self._fn(list(texts))]


class TfidfEmbedder:
    name = "tfidf-fallback"
    needs_refit = True  # vocabulary changes when documents change

    def __init__(self):
        from sklearn.feature_extraction.text import TfidfVectorizer

        self._vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
        self._fitted = False

    def fit(self, corpus):
        self._vec.fit(corpus)
        self._fitted = True

    def encode(self, texts):
        if not self._fitted:
            raise RuntimeError("TF-IDF embedder is not fitted yet")
        matrix = self._vec.transform(list(texts))
        return [row.toarray().flatten().tolist() for row in matrix]


def make_embedder(mode=None):
    mode = (mode or os.environ.get("EMBEDDING_MODE", "auto")).lower()
    if mode == "tfidf":
        return TfidfEmbedder()
    try:
        return MiniLMEmbedder()
    except Exception as exc:  # no internet / model download failed
        if mode == "minilm":
            raise
        print(f"[vector] MiniLM unavailable ({exc!r}); falling back to TF-IDF.")
        return TfidfEmbedder()


# ---------------------------------------------------------------- index
class SemanticIndex:
    def __init__(self, persist_path=None, mode=None):
        self.persist_path = persist_path or os.environ.get("CHROMA_PATH", "./chroma_data")
        self.client = chromadb.PersistentClient(path=self.persist_path)
        self.embedder = make_embedder(mode)
        self.collection = self._get_or_create_collection()
        self.last_error = None
        # Minimum cosine similarity for a hit to be returned (weak matches are noise).
        default_min = "0.05" if isinstance(self.embedder, TfidfEmbedder) else "0.2"
        self.min_similarity = float(os.environ.get("MIN_SIMILARITY", default_min))
        try:
            self.rebuild()
        except Exception as exc:  # MySQL not up yet: stay alive, /reindex can retry
            self.last_error = f"{type(exc).__name__}: {exc}"
            print(f"[vector] initial index build failed: {self.last_error}")

    @property
    def degraded(self):
        """True when the real sentence-embedding model is NOT in use."""
        return isinstance(self.embedder, TfidfEmbedder)

    def _create_collection(self, name=COLLECTION_NAME):
        """Create a cosine collection across supported Chroma versions."""
        metadata = {"embedding_model": self.embedder.name}
        try:
            return self.client.create_collection(
                name=name,
                configuration={"hnsw": {"space": "cosine"}},
                metadata=metadata,
            )
        except (TypeError, ValueError):
            # Chroma < 0.6 has no `configuration` argument.
            return self.client.create_collection(
                name=name,
                metadata={**metadata, "hnsw:space": "cosine"},
            )

    def _get_or_create_collection(self):
        """Open the persisted index without deleting it during service startup."""
        try:
            col = self.client.get_collection(COLLECTION_NAME)
        except Exception:
            col = self._create_collection()
        self.space = self._detect_space(col)
        return col

    @staticmethod
    def _detect_space(col):
        """Which distance does the collection really use? ('cosine' | 'l2' | 'ip')"""
        try:
            cfg = col.configuration
            cfg = cfg if isinstance(cfg, dict) else getattr(cfg, "__dict__", {}) or {}
            text = str(cfg).lower()
        except Exception:
            text = ""
        text += " " + str(getattr(col, "metadata", "")).lower()
        for name in ("cosine", "ip", "l2"):
            if f"'{name}'" in text or f'"{name}"' in text or f"space: {name}" in text:
                return name
        return "l2" if "l2" in text else "cosine"

    def _similarity(self, dist):
        """Convert Chroma's distance to a cosine similarity (embeddings are unit length)."""
        d = float(dist)
        if self.space == "l2":  # squared L2 on unit vectors = 2 - 2*cos
            return 1.0 - d / 2.0
        return 1.0 - d  # cosine distance, or inner-product distance

    def rebuild(self):
        """Re-read every note and atomically replace the persisted collection.

        Fetching and embedding happen before the live collection is touched. A
        temporary MySQL outage or embedding failure therefore leaves the last
        working search index available instead of erasing it.
        """
        rows = fetch_notes()
        docs = [combined_text(r) for r in rows]
        if docs:
            self.embedder.fit(docs)
            embeddings = self.embedder.encode(docs)
        else:
            embeddings = []

        suffix = uuid4().hex[:12]
        stage_name = f"service_notes_stage_{suffix}"
        backup_name = f"service_notes_backup_{suffix}"
        stage = self._create_collection(stage_name)
        if docs:
            stage.add(
                ids=[str(r["appointment_id"]) for r in rows],
                documents=docs,
                embeddings=embeddings,
                metadatas=[metadata_for(r) for r in rows],
            )

        old = self.collection
        old.modify(name=backup_name)
        try:
            stage.modify(name=COLLECTION_NAME)
        except Exception:
            old.modify(name=COLLECTION_NAME)
            self.client.delete_collection(stage_name)
            raise

        self.collection = self.client.get_collection(COLLECTION_NAME)
        self.space = self._detect_space(self.collection)
        self.client.delete_collection(backup_name)
        self.last_error = None
        return len(docs)

    def upsert(self, appointment_id):
        """Index one appointment. TF-IDF needs a full refit, so it rebuilds."""
        if self.embedder.needs_refit:
            return self.rebuild()
        rows = fetch_notes(appointment_id)
        if not rows:
            return 0
        row = rows[0]
        doc = combined_text(row)
        self.collection.upsert(
            ids=[str(row["appointment_id"])],
            documents=[doc],
            embeddings=self.embedder.encode([doc]),
            metadatas=[metadata_for(row)],
        )
        return 1

    def count(self):
        return self.collection.count()

    def search(self, query_text, k=5, min_similarity=None):
        return self.search_with_stats(query_text, k, min_similarity)[0]

    def search_with_stats(self, query_text, k=5, min_similarity=None):
        """Returns (results above the floor, best similarity seen before filtering)."""
        n = self.count()
        if n == 0:
            return [], None
        floor = self.min_similarity if min_similarity is None else float(min_similarity)
        res = self.collection.query(
            query_embeddings=self.embedder.encode([query_text]),
            n_results=min(int(k), n),
        )
        out = []
        best = None
        for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
            sim = self._similarity(dist)
            best = sim if best is None else max(best, sim)
            if sim < floor:
                continue
            out.append(
                {
                    "appointment_id": meta["appointment_id"],
                    "registration_no": meta["registration_no"],
                    "vehicle": meta["vehicle"],
                    "service_name": meta.get("service_name"),
                    "status": meta.get("status"),
                    "distance": round(float(dist), 4),
                    "similarity": round(sim, 4),  # cosine similarity
                    "snippet": doc[:220],
                }
            )
        return out, (round(best, 4) if best is not None else None)
