import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from app.models import Step
from app.services import llm


class LlmResponseTests(unittest.TestCase):
    def setUp(self):
        self.steps = [
            Step(id="a", text="Place the board", source="Base"),
            Step(id="b", text="Deal three cards", source="Expansion"),
        ]

    def test_extraction_accepts_plain_and_fenced_arrays(self):
        array = '[{"id":"a","text":"Place the board","source":"Base"}]'
        responses = [
            array,
            f"```json\n{array}\n```",
            f"```JSON {array}```",
            f"```\n{array}\n```",
        ]
        for raw in responses:
            with self.subTest(raw=raw), patch.object(
                llm, "_call_llm", return_value=raw
            ) as call:
                steps, returned_raw = llm.extract_all_steps("rules")
                self.assertEqual(steps, self.steps[:1])
                self.assertEqual(returned_raw, raw)
                self.assertEqual(call.call_count, 1)

    def test_extraction_retries_invalid_shapes_and_fields(self):
        invalid = [
            "{",
            "{}",
            "[null]",
            '[{"id":"a"}]',
            '[{"text":null}]',
            '[{"id":"a","text":"x"},{"id":"a","text":"y"}]',
        ]
        valid = '[{"id":"a","text":"Place the board","source":"Base"}]'
        for first in invalid:
            with self.subTest(first=first), patch.object(
                llm, "_call_llm", side_effect=[first, valid]
            ) as call:
                steps, raw = llm.extract_all_steps("rules")
                self.assertEqual(steps, self.steps[:1])
                self.assertEqual(raw, valid)
                self.assertEqual(call.call_count, 2)

    def test_extraction_generates_id_when_missing(self):
        with patch.object(
            llm, "_call_llm", return_value='[{"text":"Place the board"}]'
        ):
            steps, _ = llm.extract_all_steps("rules")
        self.assertTrue(steps[0].id)
        self.assertEqual(steps[0].text, "Place the board")

    def test_classification_uses_original_steps_and_missing_text_is_safe(self):
        raw = json.dumps(
            [
                {"id": "b", "isKey": True, "text": "invented", "source": "wrong"},
                {"id": "a", "isKey": False},
            ]
        )
        with patch.object(llm, "_call_llm", return_value=raw) as call:
            key_steps, returned_raw = llm.classify_key_steps(self.steps)
        self.assertEqual(key_steps, [self.steps[1]])
        self.assertEqual(returned_raw, raw)
        self.assertEqual(call.call_count, 1)

        raw = '[{"id":"a","isKey":true},{"id":"b","isKey":false}]'
        with patch.object(llm, "_call_llm", return_value=raw):
            key_steps, _ = llm.classify_key_steps(self.steps)
        self.assertEqual(key_steps, [self.steps[0]])

    def test_classification_retries_incomplete_or_invalid_decisions(self):
        invalid = [
            "{",
            "{}",
            "[null]",
            '[{"isKey":true},{"id":"b","isKey":false}]',
            '[{"id":"a","isKey":true}]',
            '[{"id":"a","isKey":true},{"id":"unknown","isKey":true}]',
            '[{"id":"a","isKey":true},{"id":"a","isKey":false}]',
            '[{"id":"a"},{"id":"b","isKey":false}]',
            '[{"id":"a","isKey":"false"},{"id":"b","isKey":false}]',
        ]
        valid = '[{"id":"a","isKey":false},{"id":"b","isKey":true}]'
        for first in invalid:
            with self.subTest(first=first), patch.object(
                llm, "_call_llm", side_effect=[first, valid]
            ) as call:
                key_steps, raw = llm.classify_key_steps(self.steps)
                self.assertEqual(key_steps, [self.steps[1]])
                self.assertEqual(raw, valid)
                self.assertEqual(call.call_count, 2)

    def test_exhausted_parse_or_schema_failure_keeps_last_raw_response(self):
        cases = [
            (lambda: llm.extract_all_steps("rules"), "{broken", "{still broken"),
            (
                lambda: llm.classify_key_steps(self.steps),
                "[]",
                '[{"id":"stranger","isKey":true}]',
            ),
        ]
        for operation, first, last in cases:
            with self.subTest(last=last), patch.object(
                llm, "_call_llm", side_effect=[first, last]
            ) as call:
                with self.assertRaises(llm.LLMResponseError) as raised:
                    operation()
                self.assertEqual(raised.exception.raw_response, last)
                self.assertIn(last, str(raised.exception))
                self.assertEqual(call.call_count, 2)

    def test_empty_classification_is_valid(self):
        with patch.object(llm, "_call_llm", return_value="[]"):
            self.assertEqual(llm.classify_key_steps([]), ([], "[]"))

    def test_duplicate_input_ids_are_rejected_before_call(self):
        with patch.object(llm, "_call_llm") as call, self.assertRaises(ValueError):
            llm.classify_key_steps([self.steps[0], self.steps[0]])
        call.assert_not_called()

    def test_provider_errors_are_not_retried_as_invalid_responses(self):
        with patch.object(
            llm, "_call_llm", side_effect=RuntimeError("unavailable")
        ) as call, self.assertRaisesRegex(RuntimeError, "unavailable"):
            llm.extract_all_steps("rules")
        self.assertEqual(call.call_count, 1)

    def test_route_surfaces_exhausted_raw_response(self):
        raw = "{invalid-again"
        with patch(
            "app.routers.extract.get_extraction_status",
            return_value={"available": True, "reason": ""},
        ), patch(
            "app.routers.extract.document_intelligence.extract_text_from_multiple_pdfs",
            return_value={"demo": "rules"},
        ), patch.object(
            llm, "_call_llm", side_effect=["{bad", raw]
        ):
            response = TestClient(app).post(
                "/api/extract",
                files={"files": ("demo.pdf", b"%PDF-1.4\n%fake\n", "application/pdf")},
            )
        self.assertEqual(response.status_code, 502)
        self.assertIn(raw, response.json()["detail"])

    def test_route_surfaces_exhausted_classification_response(self):
        raw = '[{"id":"unknown","isKey":true}]'
        with patch(
            "app.routers.extract.get_extraction_status",
            return_value={"available": True, "reason": ""},
        ), patch(
            "app.routers.extract.document_intelligence.extract_text_from_multiple_pdfs",
            return_value={"demo": "rules"},
        ), patch.object(
            llm,
            "_call_llm",
            side_effect=[
                '[{"id":"a","text":"Place the board","source":"Base"}]',
                "[]",
                raw,
            ],
        ):
            response = TestClient(app).post(
                "/api/extract",
                files={"files": ("demo.pdf", b"%PDF-1.4\n%fake\n", "application/pdf")},
            )
        self.assertEqual(response.status_code, 502)
        self.assertIn(raw, response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
