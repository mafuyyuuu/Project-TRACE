import unittest
from flask import Flask
from security import install_security

class GatewayTests(unittest.TestCase):
    def app(self, **environment):
        app = Flask(__name__)
        install_security(app, environment)
        app.add_url_rule('/health', endpoint='health', view_func=lambda: 'ok')
        app.add_url_rule('/job', endpoint='job', view_func=lambda: 'ok', methods=['POST'])
        return app

    def test_production_requires_dedicated_key(self):
        with self.assertRaises(RuntimeError): self.app(APP_ENV='production')

    def test_all_business_paths_require_authentication(self):
        with self.app(APP_ENV='production', AI_ENGINE_SECRET='s' * 48).test_client() as client:
            self.assertEqual(client.get('/health').status_code, 200)
            self.assertEqual(client.post('/job').status_code, 401)
            self.assertEqual(client.post('/job', headers={'X-Trace-AI-Secret': 'wrong'}).status_code, 401)
            response = client.post('/job', headers={'X-Trace-AI-Secret': 's' * 48})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers['Cache-Control'], 'private, no-store')
            self.assertEqual(client.post('/missing').status_code, 401)

    def test_unconfigured_development_fails_closed(self):
        with self.app().test_client() as client: self.assertEqual(client.post('/job').status_code, 503)

if __name__ == '__main__': unittest.main()
