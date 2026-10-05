import { useState, useEffect } from 'react';
import api from '@/services/api';

const cellClass = 'px-4 py-4 align-top whitespace-normal [overflow-wrap:anywhere]';

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
    <div className="trace-page">
      <div className="trace-page-header">
        <div>
          <h2 className="trace-page-title">Security Logs</h2>
        </div>
      </div>
      <div className="trace-section overflow-hidden">
        <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Global Security Audit Log</h3>
        </div>
        <div className="trace-section-body">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">Scroll horizontally to see all columns on smaller screens.</p>
              <div role="region" aria-label="Security log table" tabIndex={0} className="max-h-[60vh] overflow-auto">
                <table aria-label="Global security audit log" className="w-full min-w-[60rem] table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[26%]" />
                    <col className="w-[24%]" />
                    <col className="w-[12%]" />
                    <col className="w-[18%]" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                      <th scope="col" className="px-4 py-3 font-bold">Timestamp</th>
                      <th scope="col" className="px-4 py-3 font-bold">Event</th>
                      <th scope="col" className="px-4 py-3 font-bold">User</th>
                      <th scope="col" className="px-4 py-3 font-bold">Role</th>
                      <th scope="col" className="px-4 py-3 font-bold">IP Address</th>
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
                          <td className={`${cellClass} text-gray-500 dark:text-gray-400 font-medium`}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className={`${cellClass} font-bold text-indigo-600 dark:text-indigo-300`}>
                            {log.event_type}
                          </td>
                          <td className={cellClass}>
                            {log.full_name} <span className="text-xs text-gray-500 dark:text-gray-400 block select-text">{log.student_id}</span>
                          </td>
                          <td className={`${cellClass} uppercase text-xs font-bold text-gray-500 dark:text-gray-400`}>
                            {log.role}
                          </td>
                          <td className={`${cellClass} text-gray-500 dark:text-gray-400`}>
                            {log.ip_address || 'Unknown'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
