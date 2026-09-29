const fs = require('fs');

// 1. Update CODING_PREFERENCES.md
let prefs = fs.readFileSync('docs/CODING_PREFERENCES.md', 'utf8');
const documentationRule = `
### 6. Continuous Documentation
* Every significant feature, architectural shift, database migration, or bugfix must be immediately recorded in the relevant documentation files.
* Update \`docs/PROGRESS.md\` with new phase summaries for each completed batch of work.
* Update \`.agents/AGENTS.md\` with any structural memory or schema changes so future AI assistants have context.
* If a change alters the core workflows, reflect it in \`docs/SYSTEM_WORKFLOWS.md\`. If it alters env config, update \`docs/ENV_SETUP_GUIDE.md\`.
`;

prefs = prefs.replace("## General Guidance", "## General Guidance" + documentationRule);
fs.writeFileSync('docs/CODING_PREFERENCES.md', prefs);

// 2. Update .agents/AGENTS.md
let agents = fs.readFileSync('.agents/AGENTS.md', 'utf8');
const agentRule = `
---
## 📝 Continuous Documentation Rule
**MANDATORY INSTRUCTION FOR ALL AGENTS:** 
Every significant change, feature, architectural shift, or bugfix you make MUST be documented in the necessary files so that the project stays on track.
1. Update \`docs/PROGRESS.md\` to log the completion of your batch/phase.
2. Update this file (\`.agents/AGENTS.md\`) if there are schema changes, credentials, or deep architectural contexts future agents need to know.
3. Update \`docs/SYSTEM_WORKFLOWS.md\` or \`docs/ENV_SETUP_GUIDE.md\` if applicable.
---
`;

agents = agents.replace("## 📍 Integration Next Steps", agentRule + "\n## 📍 Integration Next Steps");
fs.writeFileSync('.agents/AGENTS.md', agents);

