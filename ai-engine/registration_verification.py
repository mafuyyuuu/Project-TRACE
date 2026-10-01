"""Conservative text matching for registration, not ID authenticity detection."""
import re
import unicodedata


def normalize_text(value):
    text = unicodedata.normalize('NFKC', value or '').casefold()
    text = re.sub(r'[\u2010-\u2015\u2212]', '-', text)
    text = re.sub(r'\s*-\s*', '-', text)
    return re.sub(r'\s+', ' ', text).strip()


def verify_registration_text(raw_text, expected_student_id, expected_course=None):
    text = normalize_text(raw_text)
    if not text:
        return {'verified': False, 'reason': 'No text could be extracted from the image.'}
    school = 'pamantasan ng lungsod ng pasig' in text or bool(re.search(r'\bplp\b', text))
    expected_id = normalize_text(expected_student_id)
    student_id = bool(expected_id and re.search(r'(?<![\w-])' + re.escape(expected_id) + r'(?![\w-])', text))
    college = not expected_course or normalize_text(expected_course) in text
    if school and student_id and college:
        return {'verified': True, 'reason': 'School name, Student ID, and College matched.'}
    if school and student_id and not college:
        reason = 'School name and Student ID found, but College did not match.'
    elif school and college and not student_id:
        reason = 'School name and College found, but Student ID did not match.'
    elif student_id and college and not school:
        reason = 'Student ID and College matched, but School name not found.'
    else:
        reason = 'Could not verify all required fields (School name, Student ID, College).'
    return {'verified': False, 'reason': reason}
