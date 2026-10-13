"""
TRACE OCR Engine
Extracts student data from uploaded academic forms using EasyOCR.

This module provides functions to:
- Preprocess document images for optimal OCR accuracy
- Extract raw text from images using EasyOCR
- Parse structured student data (ID, name, form type) from raw text
- Orchestrate the full document processing pipeline
"""

import os

# Must run before easyocr/torch/cv2 load: torch, scikit-image and scikit-learn
# each bundle their own copy of libomp.dylib, and macOS loading more than one
# into the same process is a known segfault (usually right as a second
# thread pool spins up), not just a slowdown.
os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')
os.environ.setdefault('OMP_NUM_THREADS', '1')

import re
import logging
import time
import threading
from datetime import date
import easyocr
import cv2
import numpy as np
from identity_parser import parse_identity_data
from registration_verification import verify_registration_text

logger = logging.getLogger(__name__)

# Initialize the EasyOCR reader globally so the PyTorch model loads only once
# gpu=False ensures it works on all hardware, though it can be enabled if available
reader = easyocr.Reader(['en'], gpu=False)

# Bound CPU detector work for ID photos and avoid competing ID scans within a
# worker. Gunicorn workers each retain their own Reader and lock.
IDENTITY_READ_OPTIONS = dict(detail=0, canvas_size=1280, mag_ratio=1)
IDENTITY_FALLBACK_BUDGET_SECONDS = 20
_identity_lock = threading.Lock()


def preprocess_image(filepath):
    """
    Load and preprocess an image for optimal OCR extraction.

    Applies a pipeline of image transformations:
    1. Load the image from disk using OpenCV
    2. Convert to grayscale
    3. Apply Gaussian blur to reduce noise
    4. Apply adaptive thresholding for binarization

    Args:
        filepath (str): Absolute or relative path to the image file.

    Returns:
        numpy.ndarray: The preprocessed (binarized) image array.

    Raises:
        ValueError: If the image cannot be loaded from the given path.
    """
    # Load the image using OpenCV
    image = cv2.imread(filepath)

    if image is None:
        raise ValueError(f"Could not load image from path: {filepath}")

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply Gaussian blur to reduce noise (kernel size 5x5)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Apply adaptive thresholding for binarization
    # This handles varying lighting conditions across the document
    processed = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,  # Block size for local threshold calculation
        2    # Constant subtracted from the mean
    )

    logger.debug("Image preprocessed successfully: %s", filepath)
    return processed


def extract_text(filepath):
    """
    Extract text from a document image using EasyOCR.

    Runs OCR on both the preprocessed image and the original image,
    then returns whichever result contains more text (heuristic for
    better extraction quality).

    Args:
        filepath (str): Path to the document image file.

    Returns:
        str: The extracted text from the image. Returns an empty string
             if OCR fails entirely.
    """
    try:
        # --- Attempt 1: OCR on preprocessed image ---
        processed_image = preprocess_image(filepath)
        # detail=0 returns just the text strings as a list
        processed_results = reader.readtext(processed_image, detail=0)
        processed_text = " ".join(processed_results).strip()
        logger.info(
            "Preprocessed EasyOCR extracted %d characters", len(processed_text)
        )

        # --- Attempt 2: OCR on original image ---
        original_results = reader.readtext(filepath, detail=0)
        original_text = " ".join(original_results).strip()
        logger.info(
            "Original EasyOCR extracted %d characters", len(original_text)
        )

        # Return whichever result is longer (more text = likely better)
        if len(processed_text) >= len(original_text):
            result = processed_text
            logger.info("Using preprocessed OCR result (longer)")
        else:
            result = original_text
            logger.info("Using original OCR result (longer)")

        logger.debug("Extracted text:\n%s", result)
        return result

    except Exception as e:
        logger.error("EasyOCR extraction failed for %s: %s", filepath, str(e))
        return ""


def process_identity(filepath):
    if not _identity_lock.acquire(blocking=False):
        return {'success': False, 'extracted_data': {}, 'failure_reason': 'busy'}
    started = time.monotonic()
    logger.info('Identity OCR started')
    try:
        result = _process_identity(filepath, started)
        logger.info('Identity OCR finished elapsed_ms=%d success=%s reason=%s',
                    round((time.monotonic() - started) * 1000),
                    result['success'], result.get('failure_reason', 'none'))
        return result
    finally:
        _identity_lock.release()


def _process_identity(filepath, started):
    """Try the original once; only preprocess when no identifier is found.

    Preserve OCR fragments as lines for label/value parsing. Select fields,
    not text length, and discard conflicting fallback values.
    """
    original = {}
    ambiguous = set()
    text_found = False
    scan_failed = False
    try:
        original_text = "\n".join(reader.readtext(filepath, **IDENTITY_READ_OPTIONS)).strip()
        logger.info('Identity original pass finished elapsed_ms=%d',
                    round((time.monotonic() - started) * 1000))
        text_found = bool(original_text)
        parsed = parse_identity_data(original_text, include_ambiguity=True)
        original = parsed['fields']
        ambiguous.update(parsed['ambiguous_fields'])
        if original.get('student_id') or original.get('alumni_id'):
            return {'success': True, 'extracted_data': original}
    except Exception as error:
        scan_failed = True
        logger.warning('Original identity scan failed: %s', type(error).__name__)

    # A native OCR call cannot be interrupted safely. Avoid starting another
    # expensive pass when the first already consumed the fallback budget.
    if time.monotonic() - started >= IDENTITY_FALLBACK_BUDGET_SECONDS:
        if any(original.values()):
            return {'success': True, 'extracted_data': original}
        return {'success': False, 'extracted_data': {},
                'failure_reason': 'ambiguous' if ambiguous else 'timeout'}

    try:
        logger.info('Identity fallback pass started')
        processed = preprocess_image(filepath)
        processed_text = "\n".join(reader.readtext(processed, **IDENTITY_READ_OPTIONS)).strip()
        text_found = text_found or bool(processed_text)
        parsed = parse_identity_data(processed_text, include_ambiguity=True)
        fallback = parsed['fields']
        ambiguous.update(parsed['ambiguous_fields'])
        merged = {}
        for field in ('student_id', 'alumni_id', 'full_name', 'first_name', 'middle_name', 'last_name', 'college_name'):
            first, second = original.get(field), fallback.get(field)
            if field in ambiguous or first and second and first.casefold() != second.casefold():
                merged[field] = None
            else:
                merged[field] = first or second
        if any(merged.values()):
            return {'success': True, 'extracted_data': merged}
        return {'success': False, 'extracted_data': merged,
                'failure_reason': 'ambiguous' if ambiguous else 'no_fields' if text_found else 'no_text'}
    except Exception as error:
        logger.warning('Fallback identity scan failed: %s', type(error).__name__)
        if any(original.values()):
            return {'success': True, 'extracted_data': original}
        return {'success': False, 'extracted_data': {},
                'failure_reason': 'engine_failure' if scan_failed else 'invalid_image'}


def parse_student_data(raw_text):
    """
    Parse structured student data from raw OCR text using regex patterns.

    Extracts three fields:
    - Student Number (e.g., 2024-00123)
    - Last Name (first capitalized word after 'Name:')
    - Form Type (matched against known document type keywords)

    Args:
        raw_text (str): Raw text output from OCR extraction.

    Returns:
        dict: A dictionary containing:
            - student_id (str|None): The matched student number.
            - last_name (str|None): The matched last name.
            - form_type (str|None): The identified form/document type.
            - confidence (float): Ratio of found fields to total fields (0.0–1.0).
    """
    student_id = None
    last_name = None
    form_type = None

    # --- Extract Student Number ---
    # Matches patterns like: "Student No: 23-00939", "23-00939", etc.
    student_id_pattern = (
        r'(?:student\s*(?:no|number|id)[.:\s]*)?\b(\d{2}[-\u2010]\d{4,6})\b'
    )
    student_id_match = re.search(student_id_pattern, raw_text, re.IGNORECASE)
    if student_id_match:
        student_id = student_id_match.group(1)
        logger.info("Found student ID: %s", student_id)

    # --- Extract Last Name ---
    # Looks for 'Name:' followed by a capitalized word (the last name)
    name_pattern = r'(?:student\s*)?name[:\s]+([A-Z][A-Za-z]+)'
    name_match = re.search(name_pattern, raw_text, re.IGNORECASE)
    if name_match:
        last_name = name_match.group(1).upper()
        logger.info("Found last name: %s", last_name)

    # --- Identify Form Type ---
    # Map keywords to standardized form type names
    form_type_keywords = {
        'transcript': 'Transcript of Records',
        'tor': 'Transcript of Records',
        'clearance': 'Clearance',
        'certification': 'Certification',
        'diploma': 'Diploma',
        'good moral': 'Good Moral Certificate',
        'honorable dismissal': 'Honorable Dismissal',
    }

    raw_text_lower = raw_text.lower()
    for keyword, mapped_type in form_type_keywords.items():
        if keyword in raw_text_lower:
            form_type = mapped_type
            logger.info("Identified form type: %s (keyword: '%s')", form_type, keyword)
            break

    # --- Calculate Confidence ---
    fields_found = sum(1 for field in [student_id, last_name, form_type] if field is not None)
    confidence = (fields_found / 3.0) * 100.0

    logger.info(
        "Parse results — ID: %s, Name: %s, Type: %s, Confidence: %.2f",
        student_id, last_name, form_type, confidence,
    )

    return {
        'student_id': student_id,
        'last_name': last_name,
        'form_type': form_type,
        'confidence': confidence,
    }


def parse_receipt_data(raw_text):
    """
    Parse an Official Receipt so a Finance clerk logging a counter payment can
    check figures rather than type them.

    A walk-in student pays at the cashier and brings back a printed OR. Nothing
    about that transaction reaches the system on its own, so this is a
    transcription aid — and transcription of money is exactly where a typo is
    expensive. The clerk always re-verifies before submitting; nothing here is
    trusted on its own.

    Extracts three fields:
    - OR number (e.g. "OR No. 12345", "O.R. 2026-0042")
    - Amount (the largest peso figure on the receipt, which is the total)
    - Date (several common Philippine formats)

    Args:
        raw_text (str): Raw text output from OCR extraction.

    Returns:
        dict: A dictionary containing:
            - or_number (str|None): The matched receipt number.
            - amount (float|None): The matched total.
            - or_date (str|None): The matched date, ISO-formatted where parseable.
            - confidence (float): Ratio of found fields to total fields (0–100).
    """
    or_number = None
    amount = None
    or_date = None

    # --- Extract OR number ---
    # Tolerates "OR", "O.R.", "Official Receipt", and the "No."/"#" that may or
    # may not follow. EasyOCR frequently reads "O.R." as "OR" or "0R", so the
    # leading character class allows a zero.
    or_pattern = (
        r'(?:official\s*receipt|[O0]\.?\s*R\.?)\s*'
        r'(?:no|num(?:ber)?|#)?[.:\s#]*([A-Z0-9][A-Z0-9\-]{2,20})'
    )
    or_match = re.search(or_pattern, raw_text, re.IGNORECASE)
    if or_match:
        or_number = or_match.group(1).upper().strip('-')
        logger.info("Found OR number: %s", or_number)

    # --- Extract amount ---
    # Take the LARGEST figure rather than the first. A receipt lists line items
    # before its total, and reading a line item as the amount paid would
    # under-record the payment — the failure that actually costs money.
    amount_pattern = r'(?:₱|P|PHP)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})'
    candidates = []
    for match in re.finditer(amount_pattern, raw_text):
        try:
            value = float(match.group(1).replace(',', ''))
        except ValueError:
            continue
        # Ignore bare integers with no decimal part unless they are prefixed by
        # a currency marker: a year or a receipt number would otherwise win.
        if value > 0 and ('.' in match.group(1) or match.group(0).strip()[0] in '₱Pp'):
            candidates.append(value)
    if candidates:
        amount = max(candidates)
        logger.info("Found amount: %.2f (from %d candidate(s))", amount, len(candidates))

    # --- Extract date ---
    date_patterns = [
        (r'\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b', 'ymd'),   # 2026-09-06
        (r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b', 'mdy'),   # 09/06/2026
    ]
    for pattern, order in date_patterns:
        match = re.search(pattern, raw_text)
        if not match:
            continue
        try:
            if order == 'ymd':
                year, month, day = (int(g) for g in match.groups())
            else:
                month, day, year = (int(g) for g in match.groups())
            or_date = date(year, month, day).isoformat()
            logger.info("Found OR date: %s", or_date)
            break
        except ValueError:
            # A plausible-looking but impossible date (13/45/2026) is no date.
            continue

    fields_found = sum(1 for field in [or_number, amount, or_date] if field is not None)
    confidence = (fields_found / 3.0) * 100.0

    logger.info(
        "Receipt parse — OR: %s, Amount: %s, Date: %s, Confidence: %.2f",
        or_number, amount, or_date, confidence,
    )

    return {
        'or_number': or_number,
        'amount': amount,
        'or_date': or_date,
        'confidence': confidence,
    }


def process_receipt(filepath):
    """
    Run the OCR pipeline over an Official Receipt.

    Mirrors process_document: same two-pass text extraction, same result shape,
    so the caller handles both the same way.

    Args:
        filepath (str): Path to the receipt image.

    Returns:
        dict: raw_text, extracted_data, success and error.
    """
    empty = {'or_number': None, 'amount': None, 'or_date': None, 'confidence': 0.0}
    try:
        raw_text = extract_text(filepath)

        if not raw_text:
            logger.warning("No text extracted from receipt: %s", filepath)
            return {
                'raw_text': '',
                'extracted_data': empty,
                'success': False,
                'error': 'No text could be extracted from the receipt.',
            }

        extracted_data = parse_receipt_data(raw_text)

        return {
            'raw_text': raw_text,
            'extracted_data': extracted_data,
            'success': extracted_data['confidence'] > 0,
            'error': None,
        }

    except Exception as e:
        logger.error("Receipt processing failed for %s: %s", filepath, str(e))
        return {
            'raw_text': '',
            'extracted_data': empty,
            'success': False,
            'error': str(e),
        }


def process_document(filepath):
    """
    Orchestrate the full document processing pipeline.

    Steps:
    1. Extract raw text from the document image via OCR.
    2. Parse structured student data from the raw text.
    3. Return a unified result dictionary.

    Args:
        filepath (str): Path to the document image file.

    Returns:
        dict: A result dictionary containing:
            - raw_text (str): The raw OCR output.
            - extracted_data (dict): Parsed student data fields.
            - success (bool): True if at least one field was extracted.
            - error (str|None): Error message if processing failed.
    """
    try:
        # Step 1: Extract raw text from the image
        raw_text = extract_text(filepath)

        if not raw_text:
            logger.warning("No text extracted from document: %s", filepath)
            return {
                'raw_text': '',
                'extracted_data': {
                    'student_id': None,
                    'last_name': None,
                    'form_type': None,
                    'confidence': 0.0,
                },
                'success': False,
                'error': 'No text could be extracted from the document.',
            }

        # Step 2: Parse structured data from the raw text
        extracted_data = parse_student_data(raw_text)

        # Consider the extraction successful if at least one field was found
        success = extracted_data['confidence'] > 0

        logger.info(
            "Document processed — success: %s, confidence: %.2f",
            success, extracted_data['confidence'],
        )

        return {
            'raw_text': raw_text,
            'extracted_data': extracted_data,
            'success': success,
            'error': None,
        }

    except Exception as e:
        logger.error("Document processing failed for %s: %s", filepath, str(e))
        return {
            'raw_text': '',
            'extracted_data': {
                'student_id': None,
                'last_name': None,
                'form_type': None,
                'confidence': 0.0,
            },
            'success': False,
            'error': str(e),
        }

def verify_id_document(filepath, expected_student_id, expected_course=""):
    """
    Match readable school/ID/college text for automatic registration checks.
    An inconclusive result needs manual review; it does not establish authenticity.
    """
    try:
        return verify_registration_text(extract_text(filepath), expected_student_id, expected_course)

    except Exception as e:
        logger.error("Verification failed for %s: %s", filepath, str(e))
        return {'verified': False, 'reason': f'Error during verification: {str(e)}'}
