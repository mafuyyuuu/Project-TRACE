const fs = require('fs');
let file = 'frontend/src/features/admin/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add Type to headers
content = content.replace(
  '<th className="pb-4 font-bold pl-4 font-mono">Student ID</th>\n                              <th className="pb-4 font-bold">Full Name</th>',
  '<th className="pb-4 font-bold pl-4 font-mono">Student ID</th>\n                              <th className="pb-4 font-bold">Type</th>\n                              <th className="pb-4 font-bold">Full Name</th>'
);

// Add Type to rows
content = content.replace(
  '<td className="py-4 pl-4 font-mono text-sm font-semibold text-gray-800">{student.student_id}</td>\n                                <td className="py-4 text-sm font-bold text-gray-900">{student.full_name}</td>',
  '<td className="py-4 pl-4 font-mono text-sm font-semibold text-gray-800">{student.student_id}</td>\n                                <td className="py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{student.user_type}</td>\n                                <td className="py-4 text-sm font-bold text-gray-900">{student.full_name}</td>'
);

fs.writeFileSync(file, content);
