const fs = require('fs');
const file = 'frontend/src/components/QueueTabs.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<button\s+key=\{tab\.id\}/,
  `<button
          key={tab.id}
          aria-label={\`\${tab.label} \${tab.count || 0}\`}`
);

fs.writeFileSync(file, content);
