"""Conservative, line-aware ID parsing; never guess unlabeled names."""
import re

STUDENT_LABEL = r'student\s*(?:i\.?d\.?(?:\s*(?:no\.?|number))?|no\.?|number)'
ALUMNI_LABEL = r'alumni\s*(?:i\.?d\.?(?:\s*(?:no\.?|number))?|no\.?|number)'
NAME_LABEL = r'(?:(?:student|alumni)\s+)?(?:full\s+)?name'
COLLEGE_LABEL = r'college(?:\s*/\s*department)?'
FIRST_LABEL = r'(?:first|given)\s+names?'
MIDDLE_LABEL = r'middle\s+name'
LAST_LABEL = r'(?:last\s+name|surname|family\s+name)'
ALL_LABELS = '(?:' + '|'.join([STUDENT_LABEL, ALUMNI_LABEL, FIRST_LABEL, MIDDLE_LABEL, LAST_LABEL, NAME_LABEL, COLLEGE_LABEL]) + ')'
DASHES = str.maketrans({character: '-' for character in '\u2010\u2011\u2012\u2013\u2014\u2212'})


def parse_identity_data(raw_text, include_ambiguity=False):
    ambiguous = set()
    text = (raw_text or '').translate(DASHES)
    text = re.sub(r'(?<=\d)\s*-\s*(?=\d)', '-', text)
    # Also tolerate multiple explicitly labelled fields in one OCR fragment.
    text = re.sub(r'(?<!\w)(' + ALL_LABELS + r'\s*[:#])', r'\n\1', text, flags=re.I)
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    def labeled_values(labels):
        values = []
        for index, line in enumerate(lines):
            match = re.fullmatch(r'(?:' + labels + r')\s*[:#]\s*(.+)', line, re.I)
            if not match:
                match = re.fullmatch(r'(?:' + labels + r')\s+(.+)', line, re.I)
            if match:
                values.append(match.group(1).strip())
            elif re.fullmatch(r'(?:' + labels + r')\s*[:#]?', line, re.I) and index + 1 < len(lines):
                following = lines[index + 1]
                if not re.match(r'^' + ALL_LABELS + r'(?:\s*[:#]|$)', following, re.I):
                    values.append(following)
        return values

    def unique(values, field):
        distinct = {}
        for value in values:
            distinct.setdefault(value.casefold(), value)
        if len(distinct) > 1:
            ambiguous.add(field)
        return next(iter(distinct.values())) if len(distinct) == 1 else None

    def identifier(labels, fallback, field):
        values = [re.sub(r'\s*-\s*', '-', value) for value in labeled_values(labels)]
        usable = [value for value in values if re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9 _/-]{0,49}', value)]
        if usable:
            return unique(usable, field)
        return unique(re.findall(fallback, text, re.I), field)

    def name_value(label, field):
        values = [value for value in labeled_values(label)
                  if len(value) <= 255 and re.fullmatch(r"[\w ,.'\-]+", value, re.UNICODE) and not re.search(r'\d', value)]
        return unique(values, field)
    name = name_value(NAME_LABEL, 'full_name')
    first, middle, last = name_value(FIRST_LABEL, 'first_name'), name_value(MIDDLE_LABEL, 'middle_name'), name_value(LAST_LABEL, 'last_name')
    colleges = [value for value in labeled_values(COLLEGE_LABEL) if len(value) <= 150]
    data = {
        'student_id': identifier(STUDENT_LABEL, r'\b(?:STU\d{7}|\d{2}-\d{4,6}|(?:19|20)\d{2}-\d{5})\b', 'student_id'),
        'alumni_id': identifier(ALUMNI_LABEL, r'\bALU\d{7}\b', 'alumni_id'),
        'full_name': name,
        'first_name': first,
        'middle_name': middle,
        'last_name': last,
        'college_name': unique(colleges, 'college_name'),
    }

    if include_ambiguity:
        return {'fields': data, 'ambiguous_fields': sorted(ambiguous)}
    return data
