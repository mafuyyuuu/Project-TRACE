"""Identity pipeline regressions using a fake reader; no model download."""
import importlib.util
import pathlib
import sys
import unittest
from unittest.mock import MagicMock, patch

ROOT = pathlib.Path(__file__).resolve().parent


class IdentityOcrTests(unittest.TestCase):
    def setUp(self):
        self.reader = MagicMock()
        easyocr = MagicMock()
        easyocr.Reader.return_value = self.reader
        with patch.dict(sys.modules, {'easyocr': easyocr, 'cv2': MagicMock(), 'numpy': MagicMock()}):
            spec = importlib.util.spec_from_file_location('identity_ocr_test_engine', ROOT / 'ocr_engine.py')
            self.engine = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.engine)

    def test_clear_original_uses_one_pass_and_preserves_lines(self):
        self.reader.readtext.return_value = ['Student ID: 23-00939', 'Full Name: Ana Reyes', 'College: College A']
        with patch.object(self.engine, 'preprocess_image') as preprocess:
            result = self.engine.process_identity('synthetic.png')
        self.assertTrue(result['success'])
        self.assertEqual(result['extracted_data']['full_name'], 'Ana Reyes')
        self.reader.readtext.assert_called_once_with('synthetic.png', detail=0, canvas_size=1280, mag_ratio=1)
        preprocess.assert_not_called()

    def test_fallback_keeps_original_fields_and_fills_missing_id(self):
        self.reader.readtext.side_effect = [['Full Name: Ana Reyes'], ['Student ID: 23-00939']]
        with patch.object(self.engine, 'preprocess_image', return_value='processed'):
            result = self.engine.process_identity('synthetic.png')
        self.assertEqual(result['extracted_data']['student_id'], '23-00939')
        self.assertEqual(result['extracted_data']['full_name'], 'Ana Reyes')
        self.assertEqual(self.reader.readtext.call_count, 2)

    def test_fallback_conflicting_name_is_left_for_manual_entry(self):
        self.reader.readtext.side_effect = [['Full Name: Ana Reyes'], ['Student ID: 23-00939', 'Full Name: Different Name']]
        with patch.object(self.engine, 'preprocess_image', return_value='processed'):
            result = self.engine.process_identity('synthetic.png')
        self.assertIsNone(result['extracted_data']['full_name'])

    def test_fallback_cannot_choose_from_an_ambiguous_original(self):
        self.reader.readtext.side_effect = [['Student ID: 23-00939', 'Student ID: 23-00123'], ['Student ID: 23-00939']]
        with patch.object(self.engine, 'preprocess_image', return_value='processed'):
            result = self.engine.process_identity('synthetic.png')
        self.assertFalse(result['success'])
        self.assertIsNone(result['extracted_data']['student_id'])
        self.assertEqual(result['failure_reason'], 'ambiguous')

    def test_detected_text_without_fields_is_distinct_from_no_text(self):
        with patch.object(self.engine, 'preprocess_image', return_value='processed'):
            self.reader.readtext.return_value = ['Registrar Office']
            self.assertEqual(self.engine.process_identity('synthetic.png')['failure_reason'], 'no_fields')
            self.reader.readtext.return_value = []
            self.assertEqual(self.engine.process_identity('synthetic.png')['failure_reason'], 'no_text')

    def test_printed_layout_stays_on_original_fast_path(self):
        self.reader.readtext.return_value = [
            'PAMANTASAN NG', 'LUNGSOD NG PASIG',
            'COLLEGE OF', 'COMPUTER STUDIES',
            'DELA CRUZ, ANA M.,', '24-54321',
        ]
        with patch.object(self.engine, 'preprocess_image') as preprocess:
            result = self.engine.process_identity('synthetic.png')
        self.assertTrue(result['success'])
        self.assertEqual(result['extracted_data']['full_name'], 'DELA CRUZ, ANA M.')
        self.assertEqual(result['extracted_data']['college_name'], 'COLLEGE OF COMPUTER STUDIES')
        self.assertIsNone(result['extracted_data']['middle_name'])
        self.reader.readtext.assert_called_once_with('synthetic.png', detail=0, canvas_size=1280, mag_ratio=1)
        preprocess.assert_not_called()

    def test_slow_original_does_not_start_another_scan(self):
        self.reader.readtext.return_value = ['Registrar Office']
        with patch.object(self.engine.time, 'monotonic', side_effect=[0, 21, 21, 21]), \
                patch.object(self.engine, 'preprocess_image') as preprocess:
            result = self.engine.process_identity('synthetic.png')
        self.assertEqual(result['failure_reason'], 'timeout')
        self.reader.readtext.assert_called_once()
        preprocess.assert_not_called()

    def test_slow_original_preserves_readable_fields(self):
        self.reader.readtext.return_value = ['Full Name: Ana Reyes']
        with patch.object(self.engine.time, 'monotonic', side_effect=[0, 21, 21, 21]), \
                patch.object(self.engine, 'preprocess_image') as preprocess:
            result = self.engine.process_identity('synthetic.png')
        self.assertTrue(result['success'])
        self.assertEqual(result['extracted_data']['full_name'], 'Ana Reyes')
        preprocess.assert_not_called()

    def test_concurrent_identity_scan_returns_busy_without_loading_image(self):
        self.engine._identity_lock.acquire()
        try:
            result = self.engine.process_identity('synthetic.png')
        finally:
            self.engine._identity_lock.release()
        self.assertEqual(result['failure_reason'], 'busy')
        self.reader.readtext.assert_not_called()

    def test_failed_scan_releases_worker_for_the_next_id(self):
        self.reader.readtext.side_effect = RuntimeError('reader failed')
        with patch.object(self.engine, 'preprocess_image', side_effect=ValueError('invalid')):
            self.assertFalse(self.engine.process_identity('synthetic.png')['success'])
        self.reader.readtext.side_effect = None
        self.reader.readtext.return_value = ['Student ID: 23-00939']
        self.assertTrue(self.engine.process_identity('synthetic.png')['success'])

    def test_timing_logs_do_not_contain_read_id_text(self):
        self.reader.readtext.return_value = ['Student ID: 23-00939', 'Full Name: Ana Reyes']
        with self.assertLogs(self.engine.logger, level='INFO') as logs:
            self.engine.process_identity('synthetic.png')
        output = '\n'.join(logs.output)
        self.assertIn('elapsed_ms=', output)
        self.assertNotIn('23-00939', output)
        self.assertNotIn('Ana Reyes', output)


if __name__ == '__main__':
    unittest.main()
