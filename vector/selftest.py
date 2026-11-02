"""
Quick check that SEMANTIC search really beats keyword matching.
Run from vector/ with the DB_* env vars set (MySQL must be loaded):

    python selftest.py

Each query below shares NO important words with the stored note it should find.
With the real MiniLM model most should PASS; with the TF-IDF fallback they mostly FAIL
(that is exactly the difference between meaning and keywords).
"""
from semantic_core import SemanticIndex

CASES = [
    ("high-pitched screech when slowing down", ["brak"]),
    ("engine does not turn over on cold mornings", ["start", "battery"]),
    ("cabin stays hot even with the climate control on", ["ac ", "air condition", "cooling", "warm air"]),
    ("EV will not recharge from the wall box", ["charg"]),
]

idx = SemanticIndex()
print(f"model={idx.embedder.name} documents={idx.count()} degraded={idx.degraded}\n")
passed = 0
for q, hints in CASES:
    hits = idx.search(q, k=3, min_similarity=0)
    top = hits[0]["snippet"].lower() if hits else ""
    ok = any(h in top for h in hints)
    passed += ok
    print(("PASS" if ok else "FAIL"), "|", q)
    for h in hits:
        print(f"      {h['similarity']:.3f}  #{h['appointment_id']} {h['snippet'][:90]}")
print(f"\n{passed}/{len(CASES)} passed")
