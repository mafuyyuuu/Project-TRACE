const fs = require('fs');

const files = [
  'frontend/src/features/window1/Window1Dashboard.jsx',
  'frontend/src/features/secretary/SecretaryDashboard.jsx',
  'frontend/src/features/finance/FinanceDashboard.jsx',
  'frontend/src/features/admin/AdminDashboard.jsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('<StudentProfileModal')) {
    content = content.replace(
      /<\/>\s*\);\s*}\s*$/,
      `  <StudentProfileModal\n        open={!!viewProfileId}\n        onClose={() => setViewProfileId(null)}\n        studentId={viewProfileId}\n      />\n    </>\n  );\n}`
    );
    
    // Also, fix the button regex which was broken
    content = content.replace(
      /<div className="text-sm font-bold text-gray-900">\{([^}]+\.student_name[^}]+)\}<\/div>/g,
      '<button onClick={() => setViewProfileId(doc.student_id)} className="text-sm font-bold text-[#15803d] hover:underline hover:text-[#166534] text-left">{$1}</button>'
    );
    content = content.replace(
      /<div className="font-bold text-gray-900">\{([^}]+\.student_name[^}]+)\}<\/div>/g,
      '<button onClick={() => setViewProfileId(doc.student_id)} className="font-bold text-[#15803d] hover:underline hover:text-[#166534] text-left">{$1}</button>'
    );
    // For admin, it's `student.full_name` or `user.full_name`
    content = content.replace(
      /<div className="text-sm font-bold text-gray-900">\{([^}]+\.full_name[^}]+)\}<\/div>/g,
      '<button onClick={() => setViewProfileId(req.student_id || student.student_id)} className="text-sm font-bold text-[#15803d] hover:underline hover:text-[#166534] text-left">{$1}</button>'
    );
    
    fs.writeFileSync(file, content);
  }
}
