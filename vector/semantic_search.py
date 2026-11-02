"""
AutoCare - command line demo of semantic search over service notes.

    cd vector
    python semantic_search.py
    python semantic_search.py "grinding noise when I brake"

Requires the DB_* environment variables (see README) and a loaded database.
The web application uses the same code through service.py.
"""
import sys

from semantic_core import SemanticIndex

DEMO_QUERIES = [
    "brakes making a weird sound",
    "car battery seems dead, won't start",
    "air conditioning blowing hot air",
    "electric car refuses to charge",
]


def show(idx, query):
    print(f'\nQuery: "{query}"')
    print("-" * 70)
    for r in idx.search(query, k=3):
        print(f"[appointment {r['appointment_id']}] {r['vehicle']} ({r['registration_no']}) "
              f"- {r['service_name']}  similarity={r['similarity']:.3f}")
        print(f"    {r['snippet'][:140]}")


if __name__ == "__main__":
    idx = SemanticIndex()
    print(f"Embedding model : {idx.embedder.name}")
    print(f"Indexed notes   : {idx.count()}  (metric: cosine)")
    queries = [" ".join(sys.argv[1:])] if len(sys.argv) > 1 else DEMO_QUERIES
    for q in queries:
        show(idx, q)
