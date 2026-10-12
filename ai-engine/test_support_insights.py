import unittest
from support_insights import build_support_insights


class SupportInsightsTests(unittest.TestCase):
    def test_insufficient_data_is_not_a_forecast(self):
        result = build_support_insights({"created": 2, "period": {"timezone": "Asia/Manila"}})
        self.assertEqual(result[0]["sample_size"], 2)
        self.assertIn("insufficient", result[0]["title"])

    def test_grounded_queue_comparison_and_denominator(self):
        data = {"created": 30, "period": {"timezone": "Asia/Manila"},
                "queue": {"samples": 20, "median_minutes": 12},
                "previous": {"queue_samples": 20, "queue_median_minutes": 5},
                "escalation": {"numerator": 10, "denominator": 20}}
        result = build_support_insights(data)
        self.assertEqual(result[0]["evidence"]["previous_samples"], 20)
        self.assertEqual(result[1]["evidence"], {"escalated": 10, "eligible": 20})

    def test_private_content_and_invalid_aggregates_are_rejected(self):
        for data in ({"transcripts": ["private"]}, {"created": -1}, {"created": float("nan")},
                     {"created": 20, "faq": {"views": 20, "topics": {"invented": 10}}}):
            with self.assertRaises(ValueError):
                build_support_insights(data)

    def test_nested_private_fields_are_rejected_even_with_insufficient_data(self):
        for field in ({"queue": {"transcript": "private"}},
                      {"previous": {"escalation": {"student_id": "private"}}},
                      {"faq": {"topics": {"private": 1}}}):
            with self.assertRaises(ValueError):
                build_support_insights({"created": 1, **field})

    def test_escalation_change_is_grounded_and_not_a_significance_claim(self):
        result = build_support_insights({"created": 30, "period": {"timezone": "Asia/Manila"},
            "escalation": {"numerator": 15, "denominator": 20},
            "previous": {"escalation": {"numerator": 5, "denominator": 20}}})
        change = next(row for row in result if row["title"] == "Support: escalation rate changed")
        self.assertEqual(change["evidence"]["percentage_point_change"], 50)
        self.assertEqual(change["sample_size"], 20)
        self.assertIn("not a significance test", change["message"])


if __name__ == "__main__":
    unittest.main()
