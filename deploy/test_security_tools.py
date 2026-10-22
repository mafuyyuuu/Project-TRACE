import argparse
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch
import configure_security
import recovery

class EnvironmentTests(unittest.TestCase):
    def test_preserves_unrelated_environment_values(self):
        result = configure_security.set_values('JWT_SECRET=existing\nMFA_ENCRYPTION_KEY=preserve\nDB_USER=root\n', {'DB_USER':'trace_api_v2'})
        self.assertIn('JWT_SECRET=existing', result)
        self.assertIn('MFA_ENCRYPTION_KEY=preserve', result)
        self.assertIn("DB_USER='trace_api_v2'", result)

    def test_rejects_unsafe_environment_values(self):
        for secret in ["line\nbreak", "can't", 'carriage\rreturn']:
            with self.assertRaises(ValueError): configure_security.set_values('', {'PASSWORD':secret})

    def test_writes_private_environment_file(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(configure_security, 'ROOT', Path(folder)):
            configure_security.save('DB_USER=fixture\n')
            self.assertEqual((Path(folder)/'.env').stat().st_mode & 0o777, 0o600)

@unittest.skipUnless(os.environ.get('TRACE_RUN_DOCKER_TESTS') == '1', 'Requires disposable Docker fixtures')
class RecoveryAcceptance(unittest.TestCase):
    def test_encrypt_restore_and_resume_writers(self):
        import json
        with tempfile.TemporaryDirectory(prefix='trace-recovery-fixture-') as folder:
            root = Path(folder)
            sleeper = ['node','-e','setInterval(()=>{},1000)']
            config = {'services':{
                'mysql':{'image':'mysql:8.4','environment':{'MYSQL_ROOT_PASSWORD':'disposable-fixture-root-password','MYSQL_DATABASE':'bootstrap_only'},'volumes':['database:/var/lib/mysql']},
                'backend':{'image':'trace-backend-check','environment':{'DB_HOST':'mysql','DB_NAME':'trace_security_test'},'command':['node','-e',"require('fs').writeFileSync('/app/uploads/proof.txt','synthetic-proof'); setInterval(()=>{},1000)"],'volumes':['uploads:/app/uploads']},
                'ai-engine':{'image':'trace-backend-check','command':sleeper},
                'n8n':{'image':'trace-backend-check','user':'0:0','command':['node','-e',"require('fs').writeFileSync('/home/node/.n8n/config','synthetic-key'); setInterval(()=>{},1000)"],'volumes':['n8n:/home/node/.n8n']}},
                'volumes':{'database':{},'uploads':{},'n8n':{}}}
            (root/'docker-compose.yml').write_text(json.dumps(config)); (root/'.env').write_text('JWT_SECRET=synthetic-fixture-only\n')
            subprocess.run(['age-keygen','-o',str(root/'private-key')], check=True, capture_output=True)
            os.chmod(root/'private-key',0o600)
            (root/'recipients').write_text(subprocess.check_output(['age-keygen','-y',str(root/'private-key')],text=True))
            for args in [['git','init'],['git','-c','user.name=CI','-c','user.email=ci@example.test','commit','--allow-empty','-m','Disposable fixture']]:
                subprocess.run(args,cwd=root,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
            with patch.object(recovery,'ROOT',root):
                try:
                    recovery.compose('up','-d',stdout=subprocess.DEVNULL)
                    for _ in range(60):
                        probe=subprocess.run(['docker','compose','exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin ping -h 127.0.0.1 --silent'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                        if probe.returncode == 0: break
                        time.sleep(1)
                    else: self.fail('Fixture MySQL readiness failed')
                    recovery.compose('exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "CREATE DATABASE trace_security_test; CREATE TABLE trace_security_test.restore_probe (id INT PRIMARY KEY); INSERT INTO trace_security_test.restore_probe VALUES (1);"',stdout=subprocess.DEVNULL)
                    recovery.backup(argparse.Namespace(recipients=str(root/'recipients'),output=str(root/'backups')))
                    archives=list((root/'backups').glob('*.age')); self.assertEqual(len(archives),1)
                    for service in recovery.WRITERS: self.assertTrue(recovery.output(['docker','compose','ps','-q',service]))
                    recovery.drill(argparse.Namespace(archive=str(archives[0]),identity=str(root/'private-key')))
                    count=recovery.output(['docker','compose','exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -N -e "SELECT COUNT(*) FROM trace_security_test.restore_probe"'])
                    self.assertEqual(count,'1')
                finally: recovery.compose('down','--volumes','--remove-orphans',stdout=subprocess.DEVNULL)

if __name__ == '__main__': unittest.main()
