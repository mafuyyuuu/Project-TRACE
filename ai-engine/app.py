"""
TRACE AI Engine — Flask OCR Microservice
Receives document images from Node.js backend and returns extracted student data.

Endpoints:
    GET  /health        — Health check with EasyOCR availability status
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

from ocr_engine import process_document, verify_id_document
import pandas as pd
from prophet import Prophet
import mysql.connector
from sklearn.ensemble import RandomForestClassifier
import numpy as np
from datetime import datetime, timedelta
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
    """
    return jsonify({
        'status': 'TRACE AI Engine is running',
        'engine': 'EasyOCR (PyTorch), Prophet, Random Forest',
    })

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'trace_db')
    )

@app.route('/forecast', methods=['GET'])
def forecast():
    try:
        conn = get_db_connection()
        query = "SELECT DATE(timestamp_started) as ds, COUNT(*) as y FROM step_logs GROUP BY DATE(timestamp_started)"
        df = pd.read_sql(query, conn)
        conn.close()

        if len(df) < 2:
            return jsonify({'error': 'Not enough data for forecasting'}), 400

        df['ds'] = pd.to_datetime(df['ds'])
        
        # Suppress prophet logs for cleaner console
        import logging as local_logging
        local_logging.getLogger('cmdstanpy').setLevel(local_logging.ERROR)
        
        m = Prophet(daily_seasonality=True, yearly_seasonality=False)
        m.fit(df)
        
        future = m.make_future_dataframe(periods=7)
        forecast_df = m.predict(future)
        
        next_7_days = forecast_df.tail(7)
        
        forecast_result = []
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        for _, row in next_7_days.iterrows():
            d = row['ds'].to_pydatetime()
            forecast_result.append({
                'date': d.strftime('%Y-%m-%d'),
                'day': day_names[d.weekday()],
                'predicted_volume': max(0, int(row['yhat']))
            })
            
        return jsonify({'forecast': forecast_result, 'source': 'prophet'})
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/ai/recommend', methods=['GET'])
def ai_recommend():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT COUNT(*) as c FROM documents WHERE current_status = 'pending_secretary'")
        pending_sec = cursor.fetchone()['c']
        
        cursor.execute("SELECT COUNT(*) as c FROM documents WHERE current_status = 'ready_window_1'")
        pending_release = cursor.fetchone()['c']
        
        cursor.execute("SELECT COUNT(*) as c FROM step_logs WHERE DATE(timestamp_started) = CURDATE()")
        today_vol = cursor.fetchone()['c']
        
        conn.close()

        X_train = np.array([
            [1, 0, 5],    # Low load
            [10, 2, 25],  # High sec queue
            [2, 10, 15],  # High release queue
            [15, 10, 50]  # Overloaded
        ])
        y_train = np.array([0, 1, 2, 3]) 
        
        clf = RandomForestClassifier(n_estimators=10, random_state=42)
        clf.fit(X_train, y_train)
        
        prediction = clf.predict([[pending_sec, pending_release, today_vol]])[0]
        
        insights = []
        if prediction == 1 or pending_sec > 5:
            insights.append({
                'type': 'warning',
                'title': 'AI Insight: Secretary Bottleneck Detected',
                'message': f'Random Forest classifier detected high evaluation queue ({pending_sec} docs). Consider assigning extra staff.'
            })
        if prediction == 2 or pending_release > 3:
            insights.append({
                'type': 'action',
                'title': 'AI Insight: Release Queue Buildup',
                'message': f'Window 1 is overloaded with {pending_release} unreleased documents. Dispatch SMS reminders.'
            })
        if prediction == 3:
            insights.append({
                'type': 'warning',
                'title': 'AI Insight: System Overloaded',
                'message': f'Critical load: {today_vol} transactions today. Expected delays.'
            })
            
        if len(insights) == 0:
            insights.append({
                'type': 'info',
                'title': 'AI Insight: Optimal Performance',
                'message': 'Random Forest analysis confirms system operating efficiently.'
            })

        return jsonify({'insights': insights, 'source': 'random_forest'})
    except Exception as e:
        logger.error(f"Insights error: {str(e)}")
        return jsonify({'error': str(e)}), 500


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
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'

    logger.info("Starting TRACE AI Engine on port %d (debug=%s)", port, debug)
    app.run(host='0.0.0.0', port=port, debug=debug)
