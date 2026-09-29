const fs = require('fs');
let file = 'frontend/src/features/admin/components/ReportsPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add "Date" to headers
content = content.replace(
  '<th className="py-3 px-5">Tracking</th>',
  '<th className="py-3 px-5">Date</th>\n                  <th className="py-3 px-5">Tracking</th>'
);

// Add "Date" to row
content = content.replace(
  '<td className="py-3 px-5 text-[11px] font-mono text-gray-700">{d.tracking_number}</td>',
  '<td className="py-3 px-5 text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString(\'en-US\', { year: \'numeric\', month: \'short\', day: \'numeric\' })}</td>\n                    <td className="py-3 px-5 text-[11px] font-mono text-gray-700">{d.tracking_number}</td>'
);

// Increase colspan for empty row
content = content.replace(
  '<td colSpan={6}',
  '<td colSpan={7}'
);

fs.writeFileSync(file, content);
