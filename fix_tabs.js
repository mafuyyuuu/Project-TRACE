const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const badBlock = `
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

              {missingEdu && <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-0.5 -right-2"></span>}
            </button>
          </div>
`;

const goodBlock = `
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
          </div>
`;

content = content.replace(badBlock, goodBlock);
fs.writeFileSync(file, content);
