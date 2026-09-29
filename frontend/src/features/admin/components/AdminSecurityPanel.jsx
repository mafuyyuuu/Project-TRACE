import React, { useState, useEffect } from 'react';
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">Security Logs</h2>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-lg">Global Security Audit Log</h3>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed whitespace-nowrap">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-xs uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="pb-4 font-bold pl-4 w-48">Timestamp</th>
                    <th className="pb-4 font-bold w-48">Event</th>
                    <th className="pb-4 font-bold w-64">User</th>
                    <th className="pb-4 font-bold w-32">Role</th>
                    <th className="pb-4 font-bold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold text-gray-800 divide-y divide-gray-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">No security logs found</td>
                    </tr>
                  ) : (
                    logs.map((log, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 pl-4 text-gray-500 font-medium">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 font-bold text-indigo-600">
                          {log.event_type}
                        </td>
                        <td className="py-4">
                          {log.full_name} <span className="text-xs text-gray-400 block">{log.student_id}</span>
                        </td>
                        <td className="py-4 uppercase text-xs font-bold text-gray-500">
                          {log.role}
                        </td>
                        <td className="py-4 text-gray-500">
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
