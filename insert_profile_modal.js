const fs = require('fs');

const files = [
  'frontend/src/features/window1/Window1Dashboard.jsx',
  'frontend/src/features/secretary/SecretaryDashboard.jsx',
  'frontend/src/features/finance/FinanceDashboard.jsx',
  'frontend/src/features/admin/AdminDashboard.jsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import StudentProfileModal')) {
    content = content.replace(
      "import ModalShell",
      "import ModalShell from '@/components/ModalShell';\nimport StudentProfileModal from '@/components/StudentProfileModal';"
    );
    if (!content.includes('import StudentProfileModal')) {
       content = content.replace(
         "import DashboardLoading",
         "import DashboardLoading from '@/components/DashboardLoading';\nimport StudentProfileModal from '@/components/StudentProfileModal';"
       );
    }

    // Add state variable right after component declaration
    const componentName = file.split('/').pop().replace('.jsx', '');
    const regex = new RegExp(`export default function ${componentName}\\([^)]*\\) {`);
    content = content.replace(regex, (match) => `${match}\n  const [viewProfileId, setViewProfileId] = useState(null);\n`);
    
    // Check if useState needs importing
    if (!content.includes('useState')) {
        content = `import { useState } from 'react';\n` + content;
    }

    // Wrap the name in a button
    content = content.replace(
      /<div className="text-sm font-bold text-gray-900">\{([^}]+\.student_name[^}]+)\}<\/div>/g,
      '<button onClick={() => setViewProfileId($1.student_id)} className="text-sm font-bold text-[#15803d] hover:underline hover:text-[#166534] text-left">{$1}</button>'
    );
    
    content = content.replace(
      /<div className="font-bold text-gray-900">\{([^}]+\.student_name[^}]+)\}<\/div>/g,
      '<button onClick={() => setViewProfileId($1.student_id)} className="font-bold text-[#15803d] hover:underline hover:text-[#166534] text-left">{$1}</button>'
    );
    
    // Add the modal at the end of the return
    content = content.replace(
      /(\s*)<\/div>\s*<\/div>\s*<\/body>\s*$/g,
      `$1  <StudentProfileModal\n        open={!!viewProfileId}\n        onClose={() => setViewProfileId(null)}\n        studentId={viewProfileId}\n      />\n    </div>\n  </div>\n</body>`
    );
    
    fs.writeFileSync(file, content);
  }
}
