const fs = require('fs');
let file = 'frontend/src/layouts/Layout.jsx';
let content = fs.readFileSync(file, 'utf8');

const eventListener = `
  useEffect(() => {
    const handleOpenSettings = () => setShowSettings(true);
    window.addEventListener('open-profile-settings', handleOpenSettings);
    return () => window.removeEventListener('open-profile-settings', handleOpenSettings);
  }, []);
`;

content = content.replace(
  "  const closeSettings = () => {",
  eventListener + "\n  const closeSettings = () => {"
);

fs.writeFileSync(file, content);
