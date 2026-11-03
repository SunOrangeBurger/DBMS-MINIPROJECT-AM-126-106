import os
import tempfile
import unittest
from unittest.mock import patch

import semantic_core


ROWS = [
    {
        "appointment_id": 1,
        "registration_no": "KA19AB1234",
        "make": "Maruti Suzuki",
        "model": "Swift",
        "service_name": "Brake Inspection",
        "status": "completed",
        "complaint_notes": "Squeaking noise when braking at low speed",
        "diagnosis_notes": "Front brake pads were worn",
    },
    {
        "appointment_id": 2,
        "registration_no": "KA19CD5678",
        "make": "Honda",
        "model": "City",
        "service_name": "Battery Replacement",
        "status": "completed",
        "complaint_notes": "Car would not start and the dashboard lights were dim",
        "diagnosis_notes": "Battery voltage was below the healthy range",
    },
]


class SemanticIndexTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="autocare-vector-test-")
        self.addCleanup(self.tmp.cleanup)

    def make_index(self):
        with patch.object(semantic_core, "fetch_notes", return_value=ROWS):
            return semantic_core.SemanticIndex(self.tmp.name, mode="tfidf")

    def test_rebuild_and_search(self):
        idx = self.make_index()
        hits = idx.search("battery dashboard", min_similarity=0)
        self.assertEqual(idx.count(), 2)
        self.assertEqual(hits[0]["appointment_id"], 2)
        self.assertEqual(idx.space, "cosine")

    def test_failed_rebuild_preserves_last_working_collection(self):
        idx = self.make_index()
        with patch.object(semantic_core, "fetch_notes", side_effect=RuntimeError("database down")):
            with self.assertRaisesRegex(RuntimeError, "database down"):
                idx.rebuild()
        self.assertEqual(idx.count(), 2)
        self.assertEqual(idx.search("brake pads", min_similarity=0)[0]["appointment_id"], 1)

    def test_empty_database_creates_an_empty_index(self):
        with patch.object(semantic_core, "fetch_notes", return_value=[]):
            idx = semantic_core.SemanticIndex(self.tmp.name, mode="tfidf")
        self.assertEqual(idx.count(), 0)
        self.assertEqual(idx.search("anything"), [])

    def test_mysql_connection_has_a_bounded_timeout(self):
        with patch.dict(os.environ, {"DB_CONNECT_TIMEOUT": "3"}, clear=False):
            with patch.object(semantic_core.mysql.connector, "connect") as connect:
                semantic_core.get_mysql_connection()
        self.assertEqual(connect.call_args.kwargs["connection_timeout"], 3)


if __name__ == "__main__":
    unittest.main()
