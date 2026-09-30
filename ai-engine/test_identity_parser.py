import unittest
from identity_parser import parse_identity_data


class IdentityParserTests(unittest.TestCase):
    def test_labeled_fields_and_alumni_id(self):
        data = parse_identity_data('Alumni ID Number: ALUM-123\nFull Name: DELA CRUZ, Juan\nCollege: College A')
        self.assertEqual(data['alumni_id'], 'ALUM-123')
        self.assertEqual(data['full_name'], 'DELA CRUZ, Juan')
        self.assertEqual(data['college_name'], 'College A')
        self.assertIsNone(data['student_id'])

    def test_student_id_and_missing_fields(self):
        data = parse_identity_data('Student No.: 23-00939\nName: Ana Reyes')
        self.assertEqual(data['student_id'], '23-00939')
        self.assertIsNone(data['alumni_id'])

    def test_ambiguous_text_is_not_invented(self):
        data = parse_identity_data('2026\nOffice of the Registrar\nName: Reference 123')
        self.assertIsNone(data['student_id'])
        self.assertIsNone(data['full_name'])

    def test_specific_unlabeled_identifiers(self):
        data = parse_identity_data('ALU1234567\n23-00939')
        self.assertEqual(data['alumni_id'], 'ALU1234567')
        self.assertEqual(data['student_id'], '23-00939')


if __name__ == '__main__':
    unittest.main()
