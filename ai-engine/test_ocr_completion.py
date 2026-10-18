"""Exercise processing outcomes without loading OCR weights or reading records."""
import ast
import logging
from pathlib import Path
import unittest


def load_process(extract):
    tree = ast.parse(Path(__file__).with_name('ocr_engine.py').read_text())
    function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'process_document')
    namespace = {'extract_text': extract, 'parse_student_data': lambda text: {
        'student_id': None, 'last_name': None, 'form_type': None, 'confidence': 0},
        'logger': logging.getLogger('test_ocr_completion')}
    exec(compile(ast.Module(body=[function], type_ignores=[]), 'ocr_engine.py', 'exec'), namespace)
    return namespace['process_document']


class CompletionTest(unittest.TestCase):
    def test_empty_text_is_a_completed_zero_field_scan(self):
        result = load_process(lambda path, **options: '')('synthetic')
        self.assertEqual(result['processing_status'], 'completed')
        self.assertEqual(result['extracted_data']['confidence'], 0)
        self.assertFalse(result['success'])

    def test_text_without_expected_fields_is_completed(self):
        result = load_process(lambda path, **options: 'unrelated text')('synthetic')
        self.assertEqual(result['processing_status'], 'completed')
        self.assertFalse(result['success'])

    def test_processing_exception_is_not_a_measured_zero(self):
        def fail(path, **options):
            raise RuntimeError('synthetic failure')
        result = load_process(fail)('synthetic')
        self.assertEqual(result['processing_status'], 'failed')

    def test_intake_requests_strict_error_propagation(self):
        options_seen = []
        def extract(path, **options):
            options_seen.append(options)
            return ''
        load_process(extract)('synthetic')
        self.assertEqual(options_seen, [{'raise_on_error': True}])

    def test_extract_keeps_legacy_fallback_but_raises_in_strict_mode(self):
        tree = ast.parse(Path(__file__).with_name('ocr_engine.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'extract_text')
        def fail(path):
            raise RuntimeError('synthetic decode failure')
        namespace = {'preprocess_image': fail, 'logger': logging.getLogger('test_ocr_completion')}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'ocr_engine.py', 'exec'), namespace)
        self.assertEqual(namespace['extract_text']('synthetic'), '')
        with self.assertRaises(RuntimeError):
            namespace['extract_text']('synthetic', raise_on_error=True)


if __name__ == '__main__':
    unittest.main()
