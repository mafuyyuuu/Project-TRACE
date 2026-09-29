const fs = require('fs');
const file = 'frontend/src/pages/SignupPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Title case function
const titleCaseCode = `
  const toTitleCase = (str) => {
    return str.replace(/\\w\\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };
`;
if (!content.includes('toTitleCase')) {
  content = content.replace('const [error, setError] = useState(\'\');', titleCaseCode + '\n  const [error, setError] = useState(\'\');');
}

// Auto capitalize fullName
content = content.replace(
  'onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}',
  'onChange={(e) => setFormData({ ...formData, fullName: toTitleCase(e.target.value) })}'
);

// Enforce pattern on ID
content = content.replace(
  'name="employeeId"\n              required\n              className',
  'name="employeeId"\n              required\n              pattern="^\\\\d{2}-\\\\d{5}$"\n              title="Format must be XX-XXXXX"\n              className'
);

// Enforce pattern on password
content = content.replace(
  'name="password"\n              required\n              className',
  'name="password"\n              required\n              pattern="^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).+$"\n              title="Password must contain at least one uppercase letter and one symbol"\n              className'
);

fs.writeFileSync(file, content);
