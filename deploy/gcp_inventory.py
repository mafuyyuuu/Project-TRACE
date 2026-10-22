"""Read-only host/GCP inventory. Does not retrieve access tokens or .env contents."""
import json
import shutil
import subprocess
from urllib.request import Request, urlopen

def metadata(path):
    req = Request('http://metadata.google.internal/computeMetadata/v1/' + path, headers={'Metadata-Flavor': 'Google'})
    with urlopen(req, timeout=3) as response: return response.read().decode().strip()

def run(args):
    print('\n' + ' '.join(args))
    try:
        result = subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        print(result.stdout if result.returncode == 0 else 'Unavailable or permission denied; check in Google Cloud Console.')
    except Exception: print('Unavailable.')

def main():
    for args in [['df', '-h', '.'], ['free', '-h'], ['docker', 'compose', 'ps'], ['docker', 'stats', '--no-stream', '--format', 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'], ['sudo', '-n', 'ufw', 'status', 'verbose']]: run(args)
    try:
        project = metadata('project/project-id'); name = metadata('instance/name'); zone = metadata('instance/zone').rsplit('/', 1)[-1]
        print(json.dumps({'project': project, 'instance': name, 'zone': zone}))
    except Exception:
        print('GCP metadata unavailable; provide project, instance and zone from the Console.'); return
    if not shutil.which('gcloud'): print('gcloud unavailable; inspect effective firewall rules, VM service account roles and snapshot policies in the Console.'); return
    run(['gcloud', 'compute', 'instances', 'network-interfaces', 'get-effective-firewalls', name, '--project', project, '--zone', zone, '--format=json'])
    run(['gcloud', 'compute', 'instances', 'describe', name, '--project', project, '--zone', zone, '--format=json(name,machineType,serviceAccounts,tags,disks,networkInterfaces)'])
    run(['gcloud', 'compute', 'resource-policies', 'list', '--project', project, '--format=json(name,region,snapshotSchedulePolicy)'])

if __name__ == '__main__': main()
