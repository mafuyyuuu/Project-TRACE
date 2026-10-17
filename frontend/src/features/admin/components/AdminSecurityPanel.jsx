import useGlobalSecurityLogs from '@/hooks/useGlobalSecurityLogs';
import Button from '@/components/Button';

import AdminAuditLog from './AdminAuditLog';

export default function AdminSecurityPanel() {
  const {logs,loading,error,retry} = useGlobalSecurityLogs();

  return <section className="trace-page">
    <header className="trace-standard-heading"><h2 className="trace-page-title">Security Logs</h2><p className="trace-page-description">Review sign-ins and other security events across all accounts.</p></header>
    {error && <Button type="button" className="trace-button trace-button-secondary" onClick={retry}>Retry security activity</Button>}
    <AdminAuditLog security logs={logs} loading={loading} error={error} />
  </section>;
}
