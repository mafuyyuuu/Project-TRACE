const fs = require('fs');
let file = 'frontend/src/components/QueueTabs.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "{tab.count !== undefined && (",
  "{tab.count > 0 && ("
);

fs.writeFileSync(file, content);
