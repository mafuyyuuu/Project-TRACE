"""
TRACE AI Engine — Flask OCR Microservice
Receives document images from Node.js backend and returns extracted student data.

Endpoints:
    GET  /health        — Health check with Tesseract availability status
    POST /ocr/extract   — Upload a document image and receive extracted data

Port: 5000
"""

import os
import sys
import logging
import tempfile

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import pytesseract

from ocr_engine import process_document

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

app = Flask(__name__)

# Maximum upload size: 16 MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Enable CORS for the React frontend (default: localhost:3000)
CORS(app, origins=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])

# Allowed file extensions for document uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'pdf'}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return (
        '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health-check endpoint.

    Returns the service status and whether Tesseract OCR is available
    on the system.
    """
    tesseract_available = False
    tesseract_version = None

    try:
        version = pytesseract.get_tesseract_version()
        tesseract_available = True
        tesseract_version = str(version)
        logger.info("Tesseract version: %s", tesseract_version)
    except Exception as e:
        logger.warning("Tesseract not available: %s", str(e))

    return jsonify({
        'status': 'TRACE AI Engine is running',
        'tesseract_available': tesseract_available,
        'tesseract_version': tesseract_version,
    })


@app.route('/ocr/extract', methods=['POST'])
def ocr_extract():
    """
    OCR extraction endpoint.

    Accepts a multipart file upload (field name: 'document'),
    processes the image through the OCR pipeline, and returns
    the extracted student data as JSON.

    Returns:
        JSON with keys: raw_text, extracted_data, success, error
    """
    # --- Validate that a file was included ---
    if 'document' not in request.files:
        logger.warning("No 'document' field in upload request")
        return jsonify({
            'success': False,
            'error': "No 'document' file provided in the request.",
            'raw_text': '',
            'extracted_data': None,
        }), 400

    file = request.files['document']

    if file.filename == '':
        logger.warning("Empty filename in upload request")
        return jsonify({
            'success': False,
            'error': 'No file selected.',
            'raw_text': '',
            'extracted_data': None,
        }), 400

    # --- Validate file extension ---
    if not allowed_file(file.filename):
        logger.warning("Rejected file with disallowed extension: %s", file.filename)
        return jsonify({
            'success': False,
            'error': (
                f"File type not allowed. "
                f"Accepted types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
            'raw_text': '',
            'extracted_data': None,
        }), 400

    # --- Save to a temporary file, process, then clean up ---
    temp_path = None
    try:
        # Preserve the original file extension for OpenCV/Pillow compatibility
        _, ext = os.path.splitext(file.filename)
        temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
        os.close(temp_fd)

        file.save(temp_path)
        logger.info("Saved upload to temp file: %s", temp_path)

        # Run the OCR pipeline
        result = process_document(temp_path)

        logger.info(
            "OCR result for '%s' — success: %s, confidence: %.2f",
            file.filename,
            result['success'],
            result['extracted_data']['confidence'],
        )

        return jsonify(result)

    except Exception as e:
        logger.error("Unexpected error processing upload: %s", str(e))
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}',
            'raw_text': '',
            'extracted_data': None,
        }), 500

    finally:
        # Always clean up the temporary file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
            logger.debug("Cleaned up temp file: %s", temp_path)


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle uploads that exceed the 16 MB size limit."""
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum upload size is 16 MB.',
        'raw_text': '',
        'extracted_data': None,
    }), 413


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'

    logger.info("Starting TRACE AI Engine on port %d (debug=%s)", port, debug)
    app.run(host='0.0.0.0', port=port, debug=debug)
