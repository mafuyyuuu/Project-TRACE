"""
TRACE OCR Engine
Extracts student data from uploaded academic forms using EasyOCR.

This module provides functions to:
- Preprocess document images for optimal OCR accuracy
- Extract raw text from images using EasyOCR
- Parse structured student data (ID, name, form type) from raw text
- Orchestrate the full document processing pipeline
"""

import re
import logging
import easyocr
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Initialize the EasyOCR reader globally so the PyTorch model loads only once
# gpu=False ensures it works on all hardware, though it can be enabled if available
reader = easyocr.Reader(['en'], gpu=False)


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

def verify_id_document(filepath, expected_student_id):
    """
    Verify if an uploaded image is a valid PLP Student ID or Diploma.
    Looks for the institution name and the student's ID number.
    """
    try:
        raw_text = extract_text(filepath)
        if not raw_text:
            return {'verified': False, 'reason': 'No text could be extracted from the image.'}
        
        raw_text_lower = raw_text.lower()
        
        # Check for school name
        has_school_name = 'pamantasan ng lungsod ng pasig' in raw_text_lower or 'plp' in raw_text_lower
        
        # Check for student ID
        has_student_id = False
        if expected_student_id and expected_student_id.lower() in raw_text_lower:
            has_student_id = True
            
        if has_school_name and has_student_id:
            return {'verified': True, 'reason': 'School name and Student ID matched.'}
        elif has_school_name:
            return {'verified': False, 'reason': 'School name found, but Student ID did not match.'}
        elif has_student_id:
            return {'verified': False, 'reason': 'Student ID matched, but School name not found.'}
        else:
            return {'verified': False, 'reason': 'Neither School name nor Student ID could be verified.'}

    except Exception as e:
        logger.error("Verification failed for %s: %s", filepath, str(e))
        return {'verified': False, 'reason': f'Error during verification: {str(e)}'}
