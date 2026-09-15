"""
AutoCare — Semantic Search over Service Complaint / Diagnosis Notes
=====================================================================

WHAT THIS DEMONSTRATES
-----------------------
Customers describe issues in free text ("weird noise when braking",
"AC blowing warm air", "car won't start"). Exact keyword search misses
paraphrases. A vector DB lets staff search *semantically*: find past
appointments whose complaint/diagnosis is *similar in meaning*, even
with completely different wording, so mechanics can reuse past
diagnoses and estimate repair time/cost from precedent.

DESIGN
------
- Source data (from MySQL):  service_appointments.complaint_notes
  and .diagnosis_notes — one embedding per appointment, built by
  concatenating both fields.
- Embedding approach: see NOTE ON EMBEDDINGS below.
- Vector store: Chroma (open-source, local, persistent, free —
  appropriate for a student project vs. a paid hosted vector DB).
- Similarity metric: cosine similarity (Chroma default for its HNSW
  index), which is standard for text embeddings.
- Retrieval: top-k nearest neighbours to a staff-typed query string,
  returned with appointment_id so the app can join back to MySQL for
  full context (vehicle, customer, mechanic, invoice).

NOTE ON EMBEDDINGS (IMPORTANT — READ BEFORE DEMO / VIVA)
---------------------------------------------------------
Chroma's default embedding function (`all-MiniLM-L6-v2`, a sentence-
transformer) downloads its weights from Hugging Face at first use.
In this development sandbox, outbound network access is restricted to
a fixed allow-list that does not include Hugging Face's model CDN, so
that download fails here.

This script therefore ships a small **TF-IDF based embedding
function** (`TfidfEmbeddingFunction`, using scikit-learn) as a stand-
in, so the full pipeline — store, index, and cosine-similarity
retrieval — can be run and demonstrated end-to-end without internet
access. TF-IDF captures shared vocabulary, not deep semantic meaning
("noise when braking" vs. "squeaking sound near the wheel" will match
less well than a true sentence embedding would).

For your actual submission, on a machine with normal internet access,
switch to a real sentence-transformer embedding by uncommenting
`get_default_embedding_function()` below (or wiring in an API-based
embedding model, e.g. OpenAI/Voyage/Cohere). Everything else
(collection setup, storage, querying, MySQL integration) is unchanged
— only the embedding function is swapped, which is exactly the point
of using Chroma's pluggable EmbeddingFunction interface.
"""

import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import mysql.connector
import os


# ---------------------------------------------------------------
# Fallback offline embedding function (TF-IDF) — see module docstring
# ---------------------------------------------------------------
class TfidfEmbeddingFunction(EmbeddingFunction):
    """
    A minimal EmbeddingFunction that fits a TF-IDF vectorizer over the
    corpus at collection-build time and reuses it for queries.
    Not a substitute for real sentence embeddings, but demonstrates
    the full vector-DB pipeline without any network dependency.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words="english")
        self._fitted = False

    def fit(self, corpus: list[str]):
        self.vectorizer.fit(corpus)
        self._fitted = True

    def __call__(self, input: Documents) -> Embeddings:
        if not self._fitted:
            # Fit-on-the-fly fallback (first call becomes the corpus).
            self.fit(input)
        matrix = self.vectorizer.transform(input)
        return [row.toarray().flatten().tolist() for row in matrix]


def get_default_embedding_function():
    """
    Real sentence-transformer embedding (use this for the actual
    submission on a machine with normal internet access):

        from chromadb.utils import embedding_functions
        return embedding_functions.DefaultEmbeddingFunction()

    This downloads all-MiniLM-L6-v2 once and caches it locally.
    """
    from chromadb.utils import embedding_functions
    return embedding_functions.DefaultEmbeddingFunction()


# ---------------------------------------------------------------
# MySQL connection (reads env vars — never hard-code credentials)
# ---------------------------------------------------------------
def get_mysql_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "autocare"),
    )


def fetch_appointment_notes():
    """Pull appointment_id + combined complaint/diagnosis text from MySQL."""
    conn = get_mysql_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT sa.appointment_id, v.registration_no, v.make, v.model,
               sa.complaint_notes, sa.diagnosis_notes
        FROM service_appointments sa
        JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
        WHERE sa.complaint_notes IS NOT NULL
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


# ---------------------------------------------------------------
# Build / refresh the vector collection from MySQL data
# ---------------------------------------------------------------
def build_collection(persist_path="./chroma_data", use_offline_embeddings=True):
    client = chromadb.PersistentClient(path=persist_path)

    embed_fn = TfidfEmbeddingFunction() if use_offline_embeddings else get_default_embedding_function()

    # Fresh collection each build for a clean demo
    try:
        client.delete_collection("service_notes")
    except Exception:
        pass
    collection = client.create_collection(name="service_notes", embedding_function=embed_fn)

    rows = fetch_appointment_notes()
    documents, ids, metadatas = [], [], []
    for row in rows:
        combined = f"{row['complaint_notes'] or ''} {row['diagnosis_notes'] or ''}".strip()
        documents.append(combined)
        ids.append(str(row["appointment_id"]))
        metadatas.append({
            "appointment_id": row["appointment_id"],
            "registration_no": row["registration_no"],
            "vehicle": f"{row['make']} {row['model']}",
        })

    if use_offline_embeddings:
        embed_fn.fit(documents)  # fit TF-IDF vocabulary over the full corpus first

    collection.add(documents=documents, ids=ids, metadatas=metadatas)
    print(f"Indexed {len(documents)} appointment notes into 'service_notes' collection.")
    return collection, embed_fn


# ---------------------------------------------------------------
# Query: find similar past issues to a new complaint description
# ---------------------------------------------------------------
def find_similar_issues(query_text: str, n_results: int = 3, persist_path="./chroma_data",
                         embed_fn=None):
    """
    embed_fn must be the SAME (fitted) embedding function instance used
    to build the collection — Chroma does not persist a custom Python
    EmbeddingFunction across process restarts, only its output vectors.
    In this demo we rebuild+query in one process, so we pass the fitted
    TfidfEmbeddingFunction through directly.
    """
    client = chromadb.PersistentClient(path=persist_path)
    collection = client.get_collection("service_notes", embedding_function=embed_fn)
    results = collection.query(query_texts=[query_text], n_results=n_results)

    print(f"\nQuery: \"{query_text}\"")
    print("-" * 60)
    for doc, meta, dist in zip(results["documents"][0], results["metadatas"][0], results["distances"][0]):
        print(f"[appointment_id={meta['appointment_id']}] {meta['vehicle']} ({meta['registration_no']})")
        print(f"  distance={dist:.4f}")
        print(f"  notes: {doc[:150]}")
        print()
    return results


if __name__ == "__main__":
    print("Building vector collection from MySQL appointment notes...\n")
    _, fitted_embed_fn = build_collection()

    # Demo queries with different phrasing than the stored text
    find_similar_issues("brakes making a weird sound", embed_fn=fitted_embed_fn)
    find_similar_issues("car battery seems dead, won't start", embed_fn=fitted_embed_fn)
    find_similar_issues("air conditioning blowing hot air", embed_fn=fitted_embed_fn)
