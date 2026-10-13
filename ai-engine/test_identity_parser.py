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


    def test_printed_plp_layout_keeps_review_name_without_guessing_parts(self):
        text = ('PAMANTASAN NG\nLUNGSOD NG PASIG\n'
                'COLLEGE OF\nCOMPUTER STUDIES\nBSIT 1B\n'
                'DELA CRUZ, ANA M.,\n24-54321')
        data = parse_identity_data(text)
        self.assertEqual(data['student_id'], '24-54321')
        self.assertEqual(data['full_name'], 'DELA CRUZ, ANA M.')
        self.assertEqual(data['college_name'], 'COLLEGE OF COMPUTER STUDIES')
        for field in ('first_name', 'middle_name', 'last_name'):
            self.assertIsNone(data[field])

    def test_natural_college_heading_on_one_line(self):
        data = parse_identity_data('COLLEGE OF COMPUTER STUDIES\n24-54321')
        self.assertEqual(data['college_name'], 'COLLEGE OF COMPUTER STUDIES')

    def test_college_heading_in_three_fragments(self):
        data = parse_identity_data('COLLEGE\nOF\nCOMPUTER STUDIES\n24-54321')
        self.assertEqual(data['college_name'], 'COLLEGE OF COMPUTER STUDIES')

    def test_incomplete_college_heading_is_not_the_value_of(self):
        data = parse_identity_data('COLLEGE OF\n24-54321')
        self.assertIsNone(data['college_name'])
        self.assertEqual(data['student_id'], '24-54321')
        labeled = parse_identity_data('COLLEGE OF\nNAME\nExample Student\n24-54321')
        self.assertIsNone(labeled['college_name'])

    def test_multiple_college_headings_remain_ambiguous(self):
        parsed = parse_identity_data('COLLEGE OF ARTS\nCOLLEGE OF SCIENCE', include_ambiguity=True)
        self.assertIsNone(parsed['fields']['college_name'])
        self.assertIn('college_name', parsed['ambiguous_fields'])

    def test_unlabeled_name_requires_school_header_and_adjacent_id(self):
        self.assertIsNone(parse_identity_data('DELA CRUZ, ANA M.\n24-54321')['full_name'])
        data = parse_identity_data('PAMANTASAN NG LUNGSOD NG PASIG\n'
                                   'DELA CRUZ, ANA M.\nOTHER TEXT\n24-54321')
        self.assertIsNone(data['full_name'])

    def test_ambiguous_student_ids_do_not_select_a_printed_name(self):
        data = parse_identity_data('PAMANTASAN NG LUNGSOD NG PASIG\n'
                                   'DELA CRUZ, ANA M.\n24-54321\n24-12345')
        self.assertIsNone(data['student_id'])
        self.assertIsNone(data['full_name'])

    def test_competing_adjacent_names_stay_blank(self):
        parsed = parse_identity_data('PAMANTASAN NG LUNGSOD NG PASIG\n'
                                     'DELA CRUZ, ANA M.\n24-54321\nREYES, MARIA S.',
                                     include_ambiguity=True)
        self.assertIsNone(parsed['fields']['full_name'])
        self.assertIn('full_name', parsed['ambiguous_fields'])

    def test_explicit_name_takes_precedence_over_printed_hint(self):
        data = parse_identity_data('PAMANTASAN NG LUNGSOD NG PASIG\n'
                                   'Name: Confirmed Example\nDELA CRUZ, ANA M.\n24-54321')
        self.assertEqual(data['full_name'], 'Confirmed Example')
    def test_value_starting_with_label_is_not_reinterpreted(self):
        data = parse_identity_data('College\nCollege A\nName\nName Example')
        self.assertEqual(data['college_name'], 'College A')
        self.assertEqual(data['full_name'], 'Name Example')
        conflict = parse_identity_data('College\nCollege A\nCollege: College B', include_ambiguity=True)
        self.assertIsNone(conflict['fields']['college_name'])
        self.assertIn('college_name', conflict['ambiguous_fields'])


if __name__ == '__main__':
    unittest.main()
