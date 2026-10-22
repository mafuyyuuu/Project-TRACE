"""Prepare secrets without printing them; preserve deployed JWT/MFA/root credentials."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

def command(args):
    return subprocess.check_output(args, cwd=ROOT, text=True, stderr=subprocess.PIPE)

def container(service):
    ids = command(['docker', 'ps', '-q', '--filter', f'label=com.docker.compose.service={service}', '--filter', f'label=com.docker.compose.project.working_dir={ROOT}']).split()
    if len(ids) != 1:
        raise ValueError('Exactly one running container for this project/service is required.')
    return json.loads(command(['docker', 'inspect', ids[0]]))[0]

def set_values(text, values):
    for key, value in values.items():
        if not re.fullmatch(r'[A-Za-z0-9_]+', key) or '\n' in value or '\r' in value or "'" in value:
            raise ValueError('Unsupported environment value; configure it privately by hand.')
        line = f"{key}='{value}'"
        pattern = rf'^{key}=.*$'
        text = re.sub(pattern, lambda _: line, text, flags=re.M) if re.search(pattern, text, flags=re.M) else text.rstrip() + '\n' + line + '\n'
    return text

def save(text):
    path = ROOT / '.env'
    fd, temp = tempfile.mkstemp(prefix='.trace-env-', dir=ROOT)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as stream: stream.write(text)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp): os.unlink(temp)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--activate-runtime', action='store_true')
    args = parser.parse_args()
    if args.prepare and args.activate_runtime: raise ValueError('Choose one operation.')
    if not (args.prepare or args.activate_runtime):
        print('Plan: --prepare preserves deployed keys and adds new AI/runtime credentials; --activate-runtime verifies new accounts before switching API credentials. No changes made.'); return
    path = ROOT / '.env'
    text = path.read_text()
    if args.prepare:
        backend = dict(value.split('=', 1) for value in container('backend')['Config']['Env'])
        mysql = dict(value.split('=', 1) for value in container('mysql')['Config']['Env'])
        if backend.get('DB_HOST') != 'mysql': raise ValueError('This helper supports the bundled database only.')
        values = {}
        # Never rotate keys that encrypt MFA state or sign active sessions here.
        for key in ['JWT_SECRET', 'MFA_ENCRYPTION_KEY', 'WEBHOOK_SECRET']:
            if not backend.get(key): raise ValueError('Missing deployed signing/MFA key. Reconcile privately before proceeding.')
            values[key] = backend[key]
        if not mysql.get('MYSQL_ROOT_PASSWORD'): raise ValueError('Cannot preserve existing root password.')
        values['MYSQL_ROOT_PASSWORD'] = mysql['MYSQL_ROOT_PASSWORD']
        defaults = {'AI_ENGINE_SECRET': secrets.token_hex(48), 'TRACE_API_DB_USER': 'trace_api_v2', 'TRACE_API_DB_PASSWORD': secrets.token_hex(48), 'AI_DB_USER': 'trace_ai_v2', 'AI_DB_PASSWORD': secrets.token_hex(48)}
        for key, value in defaults.items():
            if not re.search(rf'^{key}=.+$', text, flags=re.M): values[key] = value
        values['RATE_LIMIT_STORE'] = 'mysql'
        save(set_values(text, values))
        print('Prepared private environment. Existing JWT/MFA/webhook keys were preserved. Provision and verify accounts before activation.'); return
    compose = ['docker', 'compose', '-f', 'docker-compose.yml', '-f', 'deploy/compose.migrations.yml']
    # The container receives candidate credentials through environment, never CLI arguments.
    subprocess.run(compose + ['run', '--rm', '--no-deps', 'backend', 'node', 'database/provision_runtime_users.js', '--verify'], cwd=ROOT, check=True)
    config = json.loads(command(compose + ['config', '--format', 'json']))
    candidate = config['services']['backend']['environment']
    save(set_values(text, {'DB_USER': candidate['TRACE_API_DB_USER'], 'DB_PASSWORD': candidate['TRACE_API_DB_PASSWORD']}))
    print('API credentials switched after successful connection checks. Recreate backend and AI next.')

if __name__ == '__main__':
    try: main()
    except Exception:
        print('Security configuration stopped. Inspect configuration privately; no credentials were printed.')
        raise SystemExit(1)
