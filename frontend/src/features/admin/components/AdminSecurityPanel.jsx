import { useState, useEffect } from 'react';
import api from '@/services/api';

export default function AdminSecurityPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/auth/global-security-logs');
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="trace-page animate-fade-in">
      <div className="trace-page-header">
        <div>
          <h2 className="trace-page-title">Security Logs</h2>
        </div>
      </div>
      <div className="trace-section overflow-hidden">
        <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Global Security Audit Log</h3>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed whitespace-nowrap min-w-[680px]">
                <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <tr className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-4 font-bold pl-4 w-48">Timestamp</th>
                    <th className="pb-4 font-bold w-48">Event</th>
                    <th className="pb-4 font-bold w-64">User</th>
                    <th className="pb-4 font-bold w-32">Role</th>
                    <th className="pb-4 font-bold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold text-gray-800 dark:text-gray-100 divide-y divide-gray-100 dark:divide-gray-700">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500 dark:text-gray-400">No security logs found</td>
                    </tr>
                  ) : (
                    logs.map((log, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-4 pl-4 text-gray-500 dark:text-gray-400 font-medium">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 font-bold text-indigo-600 dark:text-indigo-300">
                          {log.event_type}
                        </td>
                        <td className="py-4">
                          {log.full_name} <span className="text-xs text-gray-400 dark:text-gray-400 block select-text break-words">{log.student_id}</span>
                        </td>
                        <td className="py-4 uppercase text-xs font-bold text-gray-500 dark:text-gray-400">
                          {log.role}
                        </td>
                        <td className="py-4 text-gray-500 dark:text-gray-400">
                          {log.ip_address || 'Unknown'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
