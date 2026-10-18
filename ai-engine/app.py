"""
TRACE AI Engine — Flask OCR Microservice
Receives document images from Node.js backend and returns extracted student data.

Endpoints:
    GET  /health        — Health check with EasyOCR availability status
    POST /ocr/extract   — Upload a document image and receive extracted data

Port: 5005 (5000 is reserved by macOS Control Center / AirPlay)
"""

import os
import sys
import logging
import tempfile
from contextlib import contextmanager

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from ocr_engine import process_document, verify_id_document, process_receipt
import pandas as pd
from prophet import Prophet
import mysql.connector
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from document_insights import validate_snapshot, snapshot_from_rows, build_document_insights
# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

app = Flask(__name__)

# Maximum upload size: 16 MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# The Node backend calls this service server-to-server, where CORS does not
# apply. These origins only matter if a browser ever calls Flask directly.
CORS(app, origins=[
    'http://localhost:3300',   # Node API gateway
    'http://127.0.0.1:3300',
    'http://localhost:5273',   # Vite dev server
    'http://127.0.0.1:5273',
])

# Allowed file extensions for document uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'pdf'}

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
    """
    return jsonify({
        'status': 'TRACE AI Engine is running',
        'engine': 'EasyOCR (PyTorch), Prophet, aggregate analysis',
    })

def get_db_connection():
    """
    Open a MySQL connection.

    DB_SSL mirrors the Node backend's setting: managed providers generally
    require TLS and refuse a plaintext connection outright.
    """
    params = dict(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'trace_db'),
        connection_timeout=10,
    )
    if os.getenv('DB_SSL', '').lower() == 'true':
        params['ssl_disabled'] = False
        ca = os.getenv('DB_SSL_CA')
        if ca:
            params['ssl_ca'] = ca
    return mysql.connector.connect(**params)


@contextmanager
def db_connection():
    """
    Always close the connection, including on the error path.

    Each request opens its own connection (there is no pool here), so a bare
    conn.close() after the query leaked one connection per failed request and
    would eventually exhaust a managed database's connection cap.
    """
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

@app.route('/forecast', methods=['POST'])
def forecast():
    from analytics import forecast_history
    try:
        if request.content_length and request.content_length > 16384:
            return jsonify({'error': 'Aggregate payload too large.'}), 413
        history, today = forecast_history(request.get_json(silent=True))
        from forecaster import predict_counts
        dates = [today + timedelta(days=offset) for offset in range(1, 8)]
        values = predict_counts(history, dates, Prophet)
        return jsonify({'forecast': [dict(date=day.isoformat(), day=day.strftime('%a'), predicted_volume=value)
                                     for day, value in zip(dates, values)], 'source': 'prophet'})
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify({'error': 'Invalid or insufficient calendar aggregates.'}), 400
    except Exception as error:
        logger.error('Forecast unavailable: %s', type(error).__name__)
        return jsonify({'error': 'Forecast unavailable.'}), 503


@app.route('/forecast/evaluate', methods=['POST'])
def forecast_evaluation():
    try:
        if request.content_length and request.content_length > 16384:
            return jsonify({'error': 'Aggregate payload too large.'}), 413
        from forecast_evaluation import evaluate_forecast
        return jsonify(evaluate_forecast(request.get_json(silent=True), Prophet))
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify({'error': 'Invalid held-out evaluation aggregates.'}), 400
    except Exception as error:
        logger.error('Forecast evaluation unavailable: %s', type(error).__name__)
        return jsonify({'error': 'Forecast evaluation unavailable.'}), 503


@app.route('/ai/document-analytics', methods=['POST'])
def document_analytics():
    from analytics import document_advice
    if request.content_length and request.content_length > 16384:
        return jsonify({'error': 'Aggregate payload too large.'}), 413
    try:
        return jsonify({'insights': document_advice(request.get_json(silent=True)), 'source': 'aggregate_rules'})
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify({'error': 'Invalid document measurements.'}), 400


@app.route('/ai/recommend', methods=['GET', 'POST'])
def ai_recommend():
    try:
        if request.method == 'POST':
            if request.content_length and request.content_length > 16384:
                return jsonify({'error': 'Aggregate payload too large.'}), 413
            data = validate_snapshot(request.get_json(silent=True))
        else:
            # Compatibility for an older gateway: still report every queue and
            # never label a low classifier result as confirmed efficiency.
            now = datetime.now(timezone.utc)
            midnight = now.astimezone(ZoneInfo('Asia/Manila')).replace(hour=0, minute=0, second=0, microsecond=0)
            with db_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                try:
                    cursor.execute('SELECT current_status, COUNT(*) AS count FROM documents GROUP BY current_status')
                    rows = cursor.fetchall()
                    cursor.execute('SELECT COUNT(*) AS count FROM step_logs WHERE UNIX_TIMESTAMP(timestamp_started) >= %s AND UNIX_TIMESTAMP(timestamp_started) < %s',
                                   (int(midnight.timestamp()), int((midnight + timedelta(days=1)).timestamp())))
                    data = snapshot_from_rows(rows, cursor.fetchone()['count'], now.isoformat())
                finally:
                    cursor.close()

        return jsonify({'insights': build_document_insights(data), 'source': 'aggregate_rules'})
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify({'error': 'Invalid document aggregates.'}), 400
    except Exception as e:
        logger.error('Document insights unavailable: %s', type(e).__name__)
        return jsonify({'error': 'Document insights unavailable.'}), 500


@app.route('/ai/support-insights', methods=['POST'])
def support_insights():
    from support_insights import build_support_insights
    if request.content_length and request.content_length > 65536:
        return jsonify({'error': 'Aggregate payload too large.'}), 413
    try:
        return jsonify({'insights': build_support_insights(request.get_json(silent=True)), 'source': 'aggregate_rules'})
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify({'error': 'Invalid support aggregates.'}), 400


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


@app.route('/ocr/receipt', methods=['POST'])
def ocr_receipt():
    """
    Official Receipt extraction, for Finance logging a walk-in payment.

    The third OCR use in the system, alongside document intake (/ocr/extract)
    and registration ID checks (/ocr/verify). A student who paid at the cashier
    brings back a printed OR; this reads it so the clerk verifies figures
    instead of transcribing them.

    Accepts a multipart file upload (field name: 'receipt').

    Returns:
        JSON with keys: raw_text, extracted_data, success, error
    """
    empty = {'or_number': None, 'amount': None, 'or_date': None, 'confidence': 0.0}

    if 'receipt' not in request.files:
        logger.warning("No 'receipt' field in upload request")
        return jsonify({
            'success': False,
            'error': "No 'receipt' file provided in the request.",
            'raw_text': '',
            'extracted_data': empty,
        }), 400

    file = request.files['receipt']

    if file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected.',
            'raw_text': '',
            'extracted_data': empty,
        }), 400

    if not allowed_file(file.filename):
        logger.warning("Rejected receipt with disallowed extension: %s", file.filename)
        return jsonify({
            'success': False,
            'error': (
                f"File type not allowed. "
                f"Accepted types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
            'raw_text': '',
            'extracted_data': empty,
        }), 400

    temp_path = None
    try:
        _, ext = os.path.splitext(file.filename)
        temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
        os.close(temp_fd)

        file.save(temp_path)
        result = process_receipt(temp_path)

        logger.info(
            "Receipt OCR for '%s' - success: %s, confidence: %.2f",
            file.filename, result['success'], result['extracted_data']['confidence'],
        )

        return jsonify(result)

    except Exception as e:
        logger.error("Unexpected error processing receipt: %s", str(e))
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}',
            'raw_text': '',
            'extracted_data': empty,
        }), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.route('/ocr/verify', methods=['POST'])
def ocr_verify():
    """
    ID/Diploma Verification endpoint.
    Accepts a multipart file upload ('document') and 'student_id'.
    Returns boolean 'verified' and a 'reason'.
    """
    if 'document' not in request.files:
        return jsonify({'verified': False, 'reason': 'No document provided.'}), 400

    file = request.files['document']
    student_id = request.form.get('student_id', '')
    expected_course = request.form.get('course', '')

    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'verified': False, 'reason': 'Invalid or no file selected.'}), 400

    temp_path = None
    try:
        _, ext = os.path.splitext(file.filename)
        temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
        os.close(temp_fd)

        file.save(temp_path)
        result = verify_id_document(temp_path, student_id, expected_course)
        return jsonify(result)
    except Exception as e:
        logger.error("Error in /ocr/verify: %s", str(e))
        return jsonify({'verified': False, 'reason': str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


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
    port = int(os.environ.get('PORT', 5005))
    # Opt-in, not opt-out. This previously defaulted to development when
    # FLASK_ENV was unset, so an unconfigured deployment served the Werkzeug
    # interactive debugger — remote code execution behind any traceback.
    debug = os.environ.get('FLASK_DEBUG', '').lower() in ('1', 'true')

    logger.info("Starting TRACE AI Engine on port %d (debug=%s)", port, debug)
    # Development entry point only. Production runs under gunicorn (see the
    # Dockerfile) — app.run() is the single-threaded Werkzeug dev server.
    app.run(host='0.0.0.0', port=port, debug=debug)
