import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app


class DegradedModeTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_status_endpoint_reports_feature_availability(self):
        expected = {
            "extraction": {"available": False, "reason": "Extraction unavailable."},
            "sessions": {"available": True, "reason": ""},
        }
        with patch("app.main.get_app_status", return_value=expected):
            response = self.client.get("/api/status")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)

    def test_sessions_endpoint_returns_503_before_cosmos_call_when_unconfigured(self):
        reason = "Saved sessions unavailable."
        with patch(
            "app.routers.sessions.get_sessions_status",
            return_value={"available": False, "reason": reason},
        ), patch("app.routers.sessions.cosmos_db.list_sessions") as list_sessions:
            response = self.client.get("/api/sessions")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": reason})
        list_sessions.assert_not_called()

    def test_extract_endpoint_returns_503_before_service_calls_when_unconfigured(self):
        reason = "Extraction unavailable."
        with patch(
            "app.routers.extract.get_extraction_status",
            return_value={"available": False, "reason": reason},
        ), patch(
            "app.routers.extract.document_intelligence.extract_text_from_multiple_pdfs"
        ) as extract_text, patch("app.routers.extract.llm.extract_all_steps") as extract_steps:
            response = self.client.post(
                "/api/extract",
                files={"files": ("demo.pdf", b"%PDF-1.4\n%fake\n", "application/pdf")},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": reason})
        extract_text.assert_not_called()
        extract_steps.assert_not_called()


if __name__ == "__main__":
    unittest.main()
