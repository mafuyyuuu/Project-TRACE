import copy
from datetime import datetime, timezone
import unittest

from stage_risk import (features, observations, simulated_episodes, split_recorded,
                        evaluate_and_predict, fitted, STAGE_KEYS)

NOW = '2026-10-18T06:00:00Z'


class StageRiskTest(unittest.TestCase):
    def recorded(self, size=30):
        rows = simulated_episodes(91, size)
        for i, row in enumerate(rows):
            row.update(group=i, entered=1700000000 + i * 4 * 86400,
                       exited=1700000000 + i * 4 * 86400 + (12 if i % 2 else 48) * 3600,
                       origin='marked_synthetic' if i % 2 else 'unmarked_unverified')
        return rows

    def test_target_uses_only_future_residual_wait_not_in_features(self):
        row = dict(stage=STAGE_KEYS[0], entered=1700000000, exited=1700000000+30*3600)
        x, y = observations([row])
        self.assertEqual([r[-1] for r in x], [0, 6, 12, 24])
        self.assertEqual(y, [1, 0, 0, 0])
        later = observations([{**row, 'exited': row['exited']+24*3600}])[0]
        self.assertEqual(x, later[:len(x)])

    def test_whole_groups_and_embargo_prevent_cross_split_leakage(self):
        rows = self.recorded()
        rows.append({**rows[0], 'stage': STAGE_KEYS[-1], 'exited': rows[-1]['exited']})
        train, test, omitted = split_recorded(rows)
        self.assertFalse({r['group'] for r in train} & {r['group'] for r in test})
        self.assertLess(max(r['exited'] for r in train), min(r['entered'] for r in test))
        self.assertGreaterEqual(omitted, 2)

    def test_combines_current_and_simulated_data_and_reports_sources_separately(self):
        report = evaluate_and_predict(self.recorded(), [], NOW)
        self.assertGreater(report['training']['recorded_documents'], 0)
        self.assertEqual(report['training']['simulated_documents'], 2000)
        self.assertGreater(report['evaluation']['recorded']['documents'], 0)
        self.assertIsNotNone(report['evaluation']['marked_synthetic'])
        self.assertIsNotNone(report['evaluation']['unmarked_unverified'])
        self.assertFalse(report['real_world_validated'])
        for score in report['evaluation'].values():
            self.assertEqual(sum(map(sum, score['confusion_matrix'])), score['samples'])
            self.assertAlmostEqual((score['confusion_matrix'][0][0]+score['confusion_matrix'][1][1])/score['samples'],score['accuracy'])

    def test_small_current_dataset_is_not_given_a_fake_test_score(self):
        report = evaluate_and_predict(self.recorded(3), [], NOW)
        self.assertEqual(report['training']['recorded_documents'], 3)
        self.assertIsNone(report['evaluation']['recorded'])

    def test_predictions_are_cached_and_out_of_range_cases_are_not_extrapolated(self):
        now = datetime.fromisoformat(NOW.replace('Z','+00:00')).timestamp()
        cases = [dict(stage=STAGE_KEYS[0], entered=now-3600), dict(stage=STAGE_KEYS[1], entered=now-200*3600)]
        before = fitted.cache_info().hits
        a = evaluate_and_predict([], cases, NOW)
        b = evaluate_and_predict([], cases, NOW)
        self.assertEqual(a, b)
        self.assertGreater(fitted.cache_info().hits, before)
        self.assertEqual(len(a['predictions']), 1)
        self.assertEqual(a['out_of_range_cases'], 1)
        self.assertTrue(0 <= a['predictions'][0]['probability'] <= 1)

    def test_rejects_identity_future_and_duplicate_training_records(self):
        row = self.recorded(1)[0]
        for bad in [[{**row, 'name':'private'}], [{**row, 'exited':9999999999}], [row, copy.copy(row)], [{**row, 'origin':'real'}]]:
            with self.assertRaises(ValueError): evaluate_and_predict(bad, [], NOW)
        with self.assertRaises(ValueError): evaluate_and_predict([], [dict(stage=STAGE_KEYS[0],entered=True)], NOW)


if __name__ == '__main__':
    unittest.main()
