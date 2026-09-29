const fs = require('fs');

const files = [
  'frontend/src/pages/SignupPage.jsx',
  'frontend/src/features/admin/components/UserEditModal.jsx',
  'frontend/src/features/student/components/NewRequestModal.jsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add maxLength to names, IDs, phones
    content = content.replace(/name="fullName"(\s+)(?!maxLength)/g, 'name="fullName" maxLength={100}$1');
    content = content.replace(/name="employeeId"(\s+)(?!maxLength)/g, 'name="employeeId" maxLength={20}$1');
    content = content.replace(/name="studentId"(\s+)(?!maxLength)/g, 'name="studentId" maxLength={20}$1');
    content = content.replace(/name="phone_number"(\s+)(?!maxLength)/g, 'name="phone_number" maxLength={20}$1');
    content = content.replace(/type="email"(\s+)(?!maxLength)/g, 'type="email" maxLength={100}$1');
    content = content.replace(/type="tel"(\s+)(?!maxLength)/g, 'type="tel" maxLength={20}$1');
    content = content.replace(/name="purpose"(\s+)(?!maxLength)/g, 'name="purpose" maxLength={255}$1');
    content = content.replace(/name="notes"(\s+)(?!maxLength)/g, 'name="notes" maxLength={500}$1');
    
    fs.writeFileSync(file, content);
  }
}
