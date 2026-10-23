"""Server-to-server authentication; CORS is not an access control."""
import hmac
import os
from threading import BoundedSemaphore
from flask import request, jsonify, g

def install_security(app, environ=None):
    environ = os.environ if environ is None else environ
    secret = environ.get('AI_ENGINE_SECRET', '')
    if environ.get('APP_ENV') == 'production' and len(secret) < 32:
        raise RuntimeError('A dedicated AI_ENGINE_SECRET of at least 32 characters is required.')
    gate = BoundedSemaphore(1)

    @app.before_request
    def protect():
        if request.path == '/health' and request.method in ('GET', 'HEAD'):
            return None
        if not secret:
            return jsonify(error='AI gateway is not configured.'), 503
        supplied = request.headers.get('X-Trace-AI-Secret', '')
        if not hmac.compare_digest(supplied.encode(), secret.encode()):
            return jsonify(error='Unauthorized AI gateway.'), 401
        if not gate.acquire(blocking=False):
            return jsonify(error='AI worker is busy.'), 503, {'Retry-After': '5'}
        g.trace_job = True

    @app.teardown_request
    def release(_error):
        if g.pop('trace_job', False):
            gate.release()

    @app.after_request
    def headers(response):
        response.headers['Cache-Control'] = 'private, no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response
