import { useState, useEffect } from 'react';
import api from '@/services/api';

import AdminAuditLog from './AdminAuditLog';

export default function AdminSecurityPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/auth/global-security-logs');
        if (!Array.isArray(res.data)) throw new Error('Invalid security activity');
        setLogs(res.data);
      } catch (err) {
        console.error(err);
        setError('Could not load security activity. Please reopen this page to try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return <section className="trace-page">
    <header><h2 className="trace-page-title">Security Logs</h2><p className="trace-page-description">Review sign-ins and other security events across all accounts.</p></header>
    <AdminAuditLog security logs={logs} loading={loading} error={error} />
  </section>;
}
