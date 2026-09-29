const fs = require('fs');
let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "onClick={() => setActiveModal('new-request')}",
  "onClick={() => {\n                    const missing = [];\n                    if (!user.email) missing.push('Email Address');\n                    if (!user.phone_number) missing.push('Phone Number');\n                    if (missing.length > 0) {\n                      window.alert(`Incomplete Profile: You cannot request documents until you add your ${missing.join(' and ')} in Profile Settings.`);\n                      return;\n                    }\n                    setActiveModal('new-request');\n                  }}"
);

fs.writeFileSync(file, content);
