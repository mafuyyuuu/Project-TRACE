import unittest
from document_insights import STAGES, validate_snapshot, snapshot_from_rows, build_document_insights


class DocumentInsightsTest(unittest.TestCase):
    def data(self, counts=None):
        return dict(counts={**dict.fromkeys(STAGES, 0), **(counts or {})}, unclassified=0,
                    today_actions=50, as_of='2026-10-12T00:00:00.000Z')

    def test_processing_work_cannot_be_called_optimal(self):
        result = build_document_insights(self.data({'SEC_PROCESSING': 60}), 0)
        self.assertEqual(result[0]['title'], 'Document workload: 60 outstanding')
        self.assertIn('Secretary Processing: 60', result[0]['message'])
        self.assertNotIn('Optimal Performance', str(result))

    def test_every_active_stage_is_counted_and_terminal_history_is_excluded(self):
        rows = [dict(current_status=stage, count=2) for stage in STAGES]
        rows += [dict(current_status='COMPLETED', count=50), dict(current_status='REJECTED', count=20), dict(current_status=None, count=7)]
        data = snapshot_from_rows(rows, 3, self.data()['as_of'])
        self.assertEqual(sum(data['counts'].values()), 16)
        self.assertEqual(data['unclassified'], 7)

    def test_empty_work_is_not_measured_efficiency_or_overload(self):
        result = build_document_insights(self.data(), 3)
        self.assertEqual(len(result), 1)
        self.assertIn('Queue size alone does not establish efficiency', result[0]['message'])

    def test_thresholds_and_model_are_explicitly_advisory(self):
        result = build_document_insights(self.data({'PENDING_SEC_EVALUATION': 6, 'READY_FOR_RELEASE': 4}), 3)
        self.assertEqual(len(result), 4)
        self.assertIn('does not prove a bottleneck', result[1]['message'])
        self.assertIn('four coded examples', result[-1]['message'])

    def test_rejects_extra_identity_and_missing_stages(self):
        for data in [{**self.data(), 'student_id': 'PRIVATE'}, {**self.data(), 'counts': {}}]:
            with self.assertRaises(ValueError):
                validate_snapshot(data)

    def test_rejects_invalid_counts_and_missing_timezone(self):
        for value in [-1, True, 2.5, '4']:
            with self.assertRaises(ValueError):
                validate_snapshot(self.data({'SEC_PROCESSING': value}))
        with self.assertRaises(ValueError):
            validate_snapshot({**self.data(), 'as_of': '2026-10-12'})


if __name__ == '__main__':
    unittest.main()
