const fs = require('fs');
let file = 'frontend/src/layouts/Layout.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="relative shrink-0"',
  'id="tutorial-notifications" className="relative shrink-0"'
);

content = content.replace(
  'onClick={openSettings}\n            aria-label="Account settings"\n            className="w-10 h-10',
  'id="tutorial-profile"\n            onClick={openSettings}\n            aria-label="Account settings"\n            className="w-10 h-10'
);

// We need to render OnboardingTutorial inside StudentDashboard probably. Or Layout?
// Layout would be easiest because Layout is a parent of Outlet and contains the fixed headers.
if (!content.includes('import OnboardingTutorial')) {
  content = content.replace(
    "import plpLogo from '@/assets/plp_logo.png'",
    "import plpLogo from '@/assets/plp_logo.png'\nimport OnboardingTutorial from '@/features/student/components/OnboardingTutorial'"
  );
  
  // Conditionally render tutorial only for students who haven't completed it.
  content = content.replace(
    "const [showMobileNav, setShowMobileNav] = useState(false)",
    "const [showMobileNav, setShowMobileNav] = useState(false)\n  const [showTutorial, setShowTutorial] = useState(user?.role === 'student' && !localStorage.getItem('trace_tutorial_seen'))"
  );
  
  content = content.replace(
    "        <main className=\"flex-1 h-full overflow-hidden bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm relative\">",
    "        <main className=\"flex-1 h-full overflow-hidden bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm relative\">\n          {showTutorial && <OnboardingTutorial onComplete={() => { localStorage.setItem('trace_tutorial_seen', 'true'); setShowTutorial(false); }} />}"
  );
  
  fs.writeFileSync(file, content);
}
