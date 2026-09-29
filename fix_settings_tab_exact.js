const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Reverse the previous messy replacement if it happened
content = fs.readFileSync(file, 'utf8');

// The active tab buttons
const activeTabButtonsOld = `
            <button
              type="button"
              onClick={() => setActiveTab('educational')}
              className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'educational' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}
            >
              Educational Background
              {missingEdu && <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-0.5 -right-2"></span>}
            </button>
`;

const activeTabButtonsNew = `
            <button
              type="button"
              onClick={() => setActiveTab('educational')}
              className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'educational' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}
            >
              Educational Background
              {missingEdu && <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-0.5 -right-2"></span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'security' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}
            >
              Security
            </button>
`;

if (content.includes(activeTabButtonsOld) && !content.includes("setActiveTab('security')")) {
  content = content.replace(activeTabButtonsOld, activeTabButtonsNew);
} else if (!content.includes("setActiveTab('security')")) {
    console.log("Could not find exact block to insert Security tab button for students.");
}

const staffTabsOld = `
           <div className="flex gap-6 border-b border-gray-100 px-2 mt-2">
             <button type="button" className="pb-3 text-xs font-bold uppercase tracking-widest text-[#15803d] border-b-2 border-[#15803d]">Personal Info</button>
           </div>
`;
const staffTabsNew = `
           <div className="flex gap-6 border-b border-gray-100 px-2 mt-2">
             <button type="button" onClick={() => setActiveTab('personal')} className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'personal' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}>Personal Info</button>
             <button type="button" onClick={() => setActiveTab('security')} className={\`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-1.5 \${activeTab === 'security' ? 'text-[#15803d] border-b-2 border-[#15803d]' : 'text-gray-400 hover:text-gray-600'}\`}>Security</button>
           </div>
`;
if (content.includes(staffTabsOld)) {
  content = content.replace(staffTabsOld, staffTabsNew);
}

fs.writeFileSync(file, content);
