const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for security logs
if (!content.includes('const [securityLogs, setSecurityLogs] = useState([])')) {
  content = content.replace(
    "const [isSaving, setIsSaving] = useState(false);",
    "const [isSaving, setIsSaving] = useState(false);\n  const [securityLogs, setSecurityLogs] = useState([]);"
  );
}

// 2. Fetch logs on mount
const fetchLogs = `
  useEffect(() => {
    if (isOpen) {
      api.get('/auth/security-logs').then(res => setSecurityLogs(res.data)).catch(console.error);
    }
  }, [isOpen]);
`;
if (!content.includes("api.get('/auth/security-logs')")) {
  content = content.replace(
    "useEffect(() => {\n    if (isOpen) {",
    fetchLogs + "\n  useEffect(() => {\n    if (isOpen) {"
  );
}

// 3. Render logs in the Security tab
const renderLogs = `
                <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Event</th>
                        <th className="px-4 py-2">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {securityLogs.length === 0 ? (
                        <tr><td colSpan="3" className="px-4 py-4 text-center text-gray-500">No recent activity</td></tr>
                      ) : (
                        securityLogs.slice(0, 5).map((log, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2 font-bold text-gray-700">{log.event_type}</td>
                            <td className="px-4 py-2 text-gray-500">{log.ip_address || 'Unknown'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
`;

content = content.replace(
  '<a href="/security-logs" target="_blank" className="text-[#15803d] font-bold hover:underline">View Full Security Log</a>',
  renderLogs
);

fs.writeFileSync(file, content);
