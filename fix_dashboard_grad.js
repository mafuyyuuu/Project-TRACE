const fs = require('fs');
let file = 'frontend/src/pages/DashboardPage.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "  if (user?.must_change_password) {",
  "  if (user?.user_type === 'alumni' && !user?.has_grad_application) {\n    return <GraduateApplication user={user} />;\n  }\n\n  if (user?.must_change_password) {"
);

fs.writeFileSync(file, content);
