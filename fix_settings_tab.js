const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "Personal & Security",
  "Personal Info"
);
content = content.replace(
  "Personal & Security",
  "Personal Info"
);
content = content.replace(
  "Personal & Security",
  "Personal Info"
);

const newTab = `
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'security' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}
            >
              Security
            </button>
`;
content = content.replace(
  "Educational Background",
  "Educational Background\n              {missingEdu && <span className=\"w-2 h-2 rounded-full bg-red-500 absolute -top-0.5 -right-2\"></span>}\n            </button>" + newTab
);
// wait, that might duplicate because I replaced "Educational Background" blindly.
fs.writeFileSync(file, content);
