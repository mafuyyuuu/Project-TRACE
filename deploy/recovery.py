"""Opt-in encrypted coherent backup and isolated restore drill for bundled MySQL."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import tarfile
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
WRITERS = ['backend', 'ai-engine', 'n8n']

def run(args, **kwargs):
    return subprocess.run(args, cwd=ROOT, check=True, stderr=subprocess.PIPE, **kwargs)

def output(args): return run(args, stdout=subprocess.PIPE).stdout.decode().strip()
def compose(*args, **kwargs): return run(['docker', 'compose', *args], **kwargs)
def digest(path):
    value = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''): value.update(block)
    return value.hexdigest()

def inspect(service):
    ids = output(['docker', 'compose', 'ps', '-q', service]).split()
    if len(ids) != 1: raise ValueError('Exactly one running source container is required.')
    return json.loads(output(['docker', 'inspect', ids[0]]))[0]

def archive_volume(volume, destination):
    with destination.open('wb') as stream:
        run(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', f'type=volume,src={volume},dst=/source,readonly', 'alpine:3.22', 'tar', '-C', '/source', '-cf', '-', '.'], stdout=stream)

def volume_of(container, target):
    matches = [row for row in container['Mounts'] if row.get('Type') == 'volume' and row['Destination'] == target]
    if len(matches) != 1: raise ValueError('A named persistent volume is required.')
    return matches[0]['Name']

def validate_data_archive(path):
    with tarfile.open(path) as archive:
        for member in archive.getmembers():
            name = Path(member.name)
            if name.is_absolute() or '..' in name.parts or not (member.isfile() or member.isdir()):
                raise ValueError('Backup volume contains an unsupported link or unsafe archive path.')

def volume_size(volume):
    result = output(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', f'type=volume,src={volume},dst=/source,readonly', 'alpine:3.22', 'du', '-sk', '/source'])
    return int(result.split()[0]) * 1024

def backup(args):
    recipients = Path(args.recipients).resolve()
    lines = [line.strip() for line in recipients.read_text().splitlines() if line.strip() and not line.startswith('#')]
    if not lines or not all(line.startswith('age1') for line in lines): raise ValueError('Use age public recipients only, never a private identity on this VM.')
    run(['docker', 'pull', 'alpine:3.22'], stdout=subprocess.DEVNULL)
    source = inspect('backend'); database = dict(value.split('=', 1) for value in source['Config']['Env'])
    if database.get('DB_HOST') != 'mysql': raise ValueError('Bundled MySQL only; use a provider-specific consistent backup for managed MySQL.')
    db = database['DB_NAME']
    if not db.replace('_', '').isalnum(): raise ValueError('Unsupported database name.')
    uploads = volume_of(source, '/app/uploads'); n8n = volume_of(inspect('n8n'), '/home/node/.n8n')
    destination = Path(args.output).resolve(); destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    encrypted = destination / ('trace-' + time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + secrets.token_hex(4) + '.tar.age')
    running = [service for service in WRITERS if output(['docker', 'compose', 'ps', '-q', service])]
    mysql_volume = volume_of(inspect('mysql'), '/var/lib/mysql')
    estimate = sum(volume_size(name) for name in [mysql_volume, uploads, n8n]) * 4 + 512 * 1024**2
    if shutil.disk_usage(destination).free < estimate: raise ValueError('Insufficient free space for backup staging.')
    with tempfile.TemporaryDirectory(prefix='.trace-backup-', dir=destination) as folder:
        work = Path(folder); os.chmod(work, 0o700)
        stopped = False
        try:
            stopped = True; compose('stop', '-t', '45', *running)
            with (work / 'database.sql').open('wb') as stream:
                compose('exec', '-T', 'mysql', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --quick --routines --triggers --events --hex-blob --no-tablespaces --set-gtid-purged=OFF "$1"', '_', db, stdout=stream)
            archive_volume(uploads, work / 'uploads.tar'); archive_volume(n8n, work / 'n8n.tar')
            validate_data_archive(work / 'uploads.tar'); validate_data_archive(work / 'n8n.tar')
            # Capture actual running backend configuration for recovery of encryption/signing keys.
            (work / 'backend-environment.json').write_text(json.dumps(database))
            shutil.copyfile(ROOT / '.env', work / 'root.env')
            manifest = {'database': db, 'commit': output(['git', 'rev-parse', 'HEAD']), 'created_at': time.time(), 'images': {name: inspect(name)['Image'] for name in ['mysql']}, 'hashes': {path.name: digest(path) for path in work.iterdir()}}
            (work / 'manifest.json').write_text(json.dumps(manifest))
            package = work / 'payload.tar'
            with tarfile.open(package, 'w') as archive:
                for path in work.iterdir():
                    if path != package: archive.add(path, arcname=path.name, recursive=False)
            run(['age', '-R', str(recipients), '-o', str(encrypted), str(package)])
            os.chmod(encrypted, 0o600)
            encrypted.with_suffix(encrypted.suffix + '.sha256').write_text(digest(encrypted) + '  ' + encrypted.name + '\n')
        finally:
            if stopped: compose('start', *running)
    print('Encrypted backup:', encrypted)
    print('Copy the encrypted archive and checksum to a private off-host destination and run a drill there. A local file is not disaster recovery.')

def drill(args):
    encrypted = Path(args.archive).resolve(); identity = Path(args.identity).resolve()
    if identity.stat().st_mode & 0o077: raise ValueError('Private age identity must have mode 0600 or stricter.')
    checksum = encrypted.with_suffix(encrypted.suffix + '.sha256').read_text().split()[0]
    if digest(encrypted) != checksum: raise ValueError('Encrypted archive checksum mismatch.')
    resource = 'trace-drill-' + secrets.token_hex(8); volumes = []
    with tempfile.TemporaryDirectory(prefix='trace-drill-') as folder:
        work = Path(folder); os.chmod(work, 0o700)
        run(['age', '-d', '-i', str(identity), '-o', str(work / 'payload.tar'), str(encrypted)])
        allowed = {'database.sql', 'uploads.tar', 'n8n.tar', 'backend-environment.json', 'root.env', 'manifest.json'}
        if shutil.disk_usage(work).free < (work / 'payload.tar').stat().st_size * 4 + 512 * 1024**2: raise ValueError('Insufficient restore staging space.')
        with tarfile.open(work / 'payload.tar') as archive:
            members = archive.getmembers()
            if {member.name for member in members} != allowed or not all(member.isfile() for member in members): raise ValueError('Unexpected backup members.')
            archive.extractall(work, filter='data')
        manifest = json.loads((work / 'manifest.json').read_text())
        if any(digest(work / name) != value for name, value in manifest['hashes'].items()): raise ValueError('Payload checksum mismatch.')
        validate_data_archive(work / 'uploads.tar'); validate_data_archive(work / 'n8n.tar')
        database = manifest['database']
        if not database.replace('_', '').isalnum(): raise ValueError('Invalid backup database.')
        try:
            output(['docker', 'volume', 'create', resource]); volumes.append(resource)
            run(['docker', 'run', '-d', '--name', resource, '--network', 'none', '-e', 'MYSQL_ALLOW_EMPTY_PASSWORD=yes', '-e', f'MYSQL_DATABASE={database}', '-v', resource + ':/var/lib/mysql', 'mysql:8.4', '--event-scheduler=OFF'], stdout=subprocess.DEVNULL)
            for _ in range(60):
                probe = subprocess.run(['docker', 'exec', resource, 'mysqladmin', 'ping', '-h', '127.0.0.1', '--silent'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if probe.returncode == 0: break
                time.sleep(1)
            else: raise ValueError('Isolated MySQL did not become ready.')
            with (work / 'database.sql').open('rb') as stream: run(['docker', 'exec', '-i', resource, 'mysql', '-uroot', database], stdin=stream)
            run(['docker', 'exec', resource, 'mysqlcheck', '-uroot', '--check', database], stdout=subprocess.DEVNULL)
            for name in ['uploads', 'n8n']:
                target = resource + '-' + name; output(['docker', 'volume', 'create', target]); volumes.append(target)
                # Restores into fresh volumes only; never mounts production volumes or starts n8n.
                with (work / (name + '.tar')).open('rb') as stream:
                    run(['docker', 'run', '--rm', '-i', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--cap-add', 'FOWNER', '--cap-add', 'DAC_OVERRIDE', '--security-opt', 'no-new-privileges', '-v', target + ':/restore', 'alpine:3.22', 'tar', '-C', '/restore', '-xf', '-'], stdin=stream)
                # Compare deterministic names/content metadata against a second isolated archive.
                restored = work / ('restored-' + name + '.tar'); archive_volume(target, restored)
                def contents(path):
                    with tarfile.open(path) as archive:
                        return {member.name: hashlib.sha256(archive.extractfile(member).read()).hexdigest() for member in archive.getmembers() if member.isfile()}
                if contents(work / (name + '.tar')) != contents(restored): raise ValueError('Restored file content mismatch.')
            print('Isolated database integrity and upload/n8n file-content restore passed. No production data was overwritten. Test application behavior separately on an isolated staging restore.')
        finally:
            subprocess.run(['docker', 'rm', '-f', resource], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for volume in volumes: subprocess.run(['docker', 'volume', 'rm', volume], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('operation', choices=['backup', 'drill'])
    parser.add_argument('--run', action='store_true'); parser.add_argument('--recipients'); parser.add_argument('--output'); parser.add_argument('--archive'); parser.add_argument('--identity'); args = parser.parse_args()
    if not args.run: print('Plan only. Backup briefly stops writers, encrypts state and resumes writers. Drill restores into disposable network-isolated resources. Add --run with the required paths.'); return
    if args.operation == 'backup':
        if not args.recipients or not args.output: raise ValueError('Backup requires public recipients and output directory.')
        backup(args)
    else:
        if not args.archive or not args.identity: raise ValueError('Drill requires archive and private identity.')
        drill(args)

if __name__ == '__main__':
    try: main()
    except Exception:
        print('Recovery operation failed. Inspect Docker/configuration/storage privately. Never delete original volumes; no secrets were printed.'); raise SystemExit(1)
