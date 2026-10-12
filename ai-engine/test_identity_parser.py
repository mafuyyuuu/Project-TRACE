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



    def test_separate_label_and_value_lines(self):
        data = parse_identity_data('Student ID\n23-00939\nFull Name\nAna Maria Dela Cruz\nCollege\nCollege A')
        self.assertEqual(data['student_id'], '23-00939')
        self.assertEqual(data['full_name'], 'Ana Maria Dela Cruz')
        self.assertEqual(data['college_name'], 'College A')

    def test_same_line_fields_and_unicode_dash(self):
        data = parse_identity_data('Student ID: 23 – 00939 Full Name: Ana Reyes College: College A')
        self.assertEqual(data['student_id'], '23-00939')
        self.assertEqual(data['full_name'], 'Ana Reyes')
        self.assertEqual(data['college_name'], 'College A')

    def test_labeled_name_parts_only(self):
        data = parse_identity_data('Student No: 23-00939\nFirst Name: Ana Maria\nMiddle Name: Santos\nLast Name: Dela Cruz')
        self.assertEqual(data['first_name'], 'Ana Maria')
        self.assertEqual(data['middle_name'], 'Santos')
        self.assertEqual(data['last_name'], 'Dela Cruz')
        self.assertIsNone(data['full_name'])
        unknown = parse_identity_data('Ana Maria Santos Dela Cruz\n23-00939')
        self.assertIsNone(unknown['first_name'])
        self.assertIsNone(unknown['last_name'])

    def test_conflicting_identifiers_are_not_selected(self):
        data = parse_identity_data('Student No: 23-00939\nStudent No: 23-00123')
        self.assertIsNone(data['student_id'])

    def test_fragmented_unlabeled_number(self):
        self.assertEqual(parse_identity_data('23\n–\n00939')['student_id'], '23-00939')


if __name__ == '__main__':
    unittest.main()
