import unittest
from registration_verification import verify_registration_text


class RegistrationVerificationTests(unittest.TestCase):
    def test_typography_does_not_fail_an_exact_match(self):
        result = verify_registration_text('PAMANTASAN NG\nLUNGSOD NG PASIG 23 \u2013 00261 College\n of Computer Studies', '23-00261', 'College of Computer Studies')
        self.assertTrue(result['verified'])

    def test_longer_or_wrong_ids_do_not_match(self):
        for number in ['23-002610', '123-00261', '23-00261-9', '23-00262', '23-O0261']:
            with self.subTest(number=number):
                self.assertFalse(verify_registration_text('PLP ' + number + ' College A', '23-00261', 'College A')['verified'])

    def test_missing_and_abbreviated_college_stay_pending(self):
        for text in ['PLP 23-00261', 'PLP 23-00261 CCS']:
            result = verify_registration_text(text, '23-00261', 'College of Computer Studies')
            self.assertFalse(result['verified'])
            self.assertIn('College did not match', result['reason'])

    def test_no_school_or_empty_id_is_not_auto_approved(self):
        self.assertFalse(verify_registration_text('helpLP 23-00261 College A', '23-00261', 'College A')['verified'])
        self.assertFalse(verify_registration_text('PLP College A', '', 'College A')['verified'])

    def test_unreadable_text_is_inconclusive(self):
        result = verify_registration_text('', '23-00261', 'College A')
        self.assertEqual(result, {'verified': False, 'reason': 'No text could be extracted from the image.'})


if __name__ == '__main__':
    unittest.main()
