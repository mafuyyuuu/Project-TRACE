"""Registration proof checks with a fake reader; no ID images/model downloads."""
import importlib.util
import pathlib
import sys
import unittest
from unittest.mock import MagicMock, patch


class ProofOcrTests(unittest.TestCase):
    def setUp(self):
        self.reader = MagicMock()
        easyocr = MagicMock()
        easyocr.Reader.return_value = self.reader
        with patch.dict(sys.modules, {'easyocr': easyocr, 'cv2': MagicMock(), 'numpy': MagicMock()}):
            spec = importlib.util.spec_from_file_location('proof_ocr_test_engine', pathlib.Path(__file__).with_name('ocr_engine.py'))
            self.engine = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.engine)
        self.match = ['PAMANTASAN NG', 'LUNGSOD NG PASIG', 'COLLEGE OF', 'COMPUTER STUDIES', '23-00123']

    def verify(self):
        return self.engine.verify_id_document('synthetic.png', '23-00123', 'College of Computer Studies')

    def test_successful_original_skips_preprocessing_and_cannot_be_overridden_by_a_longer_wrong_scan(self):
        self.reader.readtext.side_effect = [self.match, ['irrelevant text ' * 100]]
        with patch.object(self.engine, 'preprocess_image') as preprocess:
            self.assertTrue(self.verify()['verified'])
        preprocess.assert_not_called()
        self.reader.readtext.assert_called_once_with('synthetic.png', detail=0, canvas_size=1280, mag_ratio=1)

    def test_fallback_can_verify_all_fields_when_the_original_is_incomplete(self):
        self.reader.readtext.side_effect = [['PLP 23-00123'], self.match]
        with patch.object(self.engine, 'preprocess_image', return_value='processed'):
            self.assertTrue(self.verify()['verified'])
        self.assertEqual(self.reader.readtext.call_count, 2)

    def test_two_incomplete_passes_are_not_combined_to_auto_approve(self):
        self.reader.readtext.side_effect = [['PLP 23-00123'], ['23-00123 College of Computer Studies']]
        with patch.object(self.engine, 'preprocess_image', return_value='processed'):
            self.assertFalse(self.verify()['verified'])

    def test_wrong_identifier_remains_pending_on_both_passes(self):
        self.reader.readtext.return_value = ['PLP 23-00999 College of Computer Studies']
        with patch.object(self.engine, 'preprocess_image', return_value='processed'):
            self.assertFalse(self.verify()['verified'])

    def test_slow_incomplete_original_does_not_start_another_pass(self):
        self.reader.readtext.return_value = ['PLP 23-00123']
        with patch.object(self.engine.time, 'monotonic', side_effect=[0, 16, 16, 16]), patch.object(self.engine, 'preprocess_image') as preprocess:
            self.assertFalse(self.verify()['verified'])
        preprocess.assert_not_called()

    def test_scan_failures_remain_inconclusive_and_never_return_private_engine_errors(self):
        self.reader.readtext.side_effect = RuntimeError('private engine context')
        with patch.object(self.engine, 'preprocess_image', side_effect=ValueError('private engine context')):
            result = self.verify()
        self.assertFalse(result['verified'])
        self.assertNotIn('private', str(result))

    def test_timing_logs_do_not_record_the_identifier_or_proof_text(self):
        self.reader.readtext.return_value = self.match
        with self.assertLogs(self.engine.logger, level='INFO') as logs:
            self.assertTrue(self.verify()['verified'])
        output = '\n'.join(logs.output)
        self.assertIn('elapsed_ms=', output)
        self.assertNotIn('23-00123', output)
        self.assertNotIn('PAMANTASAN', output)


if __name__ == '__main__':
    unittest.main()
