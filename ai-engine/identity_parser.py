"""Conservative ID parsing: absent or ambiguous fields require manual entry."""
import re


def parse_identity_data(raw_text):
    def labeled(labels):
        match = re.search(r'^(?:' + labels + r')\s*[:#]\s*([^\n]+)$', raw_text, re.I | re.M)
        return match.group(1).strip() if match else None

    def identifier(labels, fallback):
        value = labeled(labels)
        if value and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9 -]{0,49}', value):
            return value
        match = re.search(fallback, raw_text, re.I)
        return match.group(0) if match else None

    name = labeled(r'(?:student\s+|alumni\s+|full\s+)?name')
    if name and (len(name) > 255 or not re.fullmatch(r"[\w ,.'\-]+", name, re.UNICODE) or re.search(r'\d', name)):
        name = None
    return {
        'student_id': identifier(r'student\s*(?:id(?:\s*(?:no\.?|number))?|no\.?|number)', r'\b(?:STU\d{7}|\d{2}-\d{4,6}|\d{4}-\d{5})\b'),
        'alumni_id': identifier(r'alumni\s*(?:id(?:\s*(?:no\.?|number))?|no\.?|number)', r'\bALU\d{7}\b'),
        'full_name': name,
        'college_name': labeled(r'college(?:\s*/\s*department)?'),
    }
