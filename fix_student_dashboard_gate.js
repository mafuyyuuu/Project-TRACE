const fs = require('fs');
let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const profileCheck = `
  // PROF-04: Hard Gate Logic
  const isProfileComplete = (() => {
    if (!user) return false;
    const required = ['phone_number', 'email', 'birth_date', 'place_of_birth', 'sex', 'civil_status', 'home_address', 'last_attendance_year', 'elem_school', 'elem_grad_year', 'jhs_school', 'jhs_grad_year', 'shs_school', 'shs_grad_year'];
    if (user.sex === 'Female' && user.civil_status === 'Married') required.push('maiden_name');
    if (user.is_transfer_student) required.push('previous_school');
    return required.every(f => user[f] && String(user[f]).trim() !== '');
  })();

  const handleNewRequestClick = () => {
    if (!isProfileComplete) {
      setActiveModal('profile-incomplete');
    } else {
      setActiveModal('new');
    }
  };
`;

content = content.replace(
  "  const { documents, runAction, selectedDoc, setActiveModal, triggerNotification } = core;",
  "  const { documents, runAction, selectedDoc, setActiveModal, triggerNotification } = core;\n" + profileCheck
);

content = content.replace(
  "onClick={() => setActiveModal('new')}",
  "onClick={handleNewRequestClick}"
);

// Add the modal component
const incompleteModal = `
        {/* Profile Incomplete Gate Modal (PROF-04) */}
        {activeModal === 'profile-incomplete' && (
          <ModalShell
            open
            onClose={() => setActiveModal(null)}
            title="Profile Incomplete"
            maxWidth="max-w-md"
          >
            <div className="p-6 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Complete Your Profile</h3>
              <p className="text-sm text-gray-600 mb-6">
                You must complete your profile (Personal and Educational Background) to 100% before you can request any documents.
              </p>
              <button
                onClick={() => { setActiveModal(null); window.dispatchEvent(new CustomEvent('open-profile-settings')); }}
                className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors"
              >
                Go to Account Settings
              </button>
            </div>
          </ModalShell>
        )}
`;

content = content.replace(
  "{/* Create Request Modal */}",
  incompleteModal + "\n        {/* Create Request Modal */}"
);

fs.writeFileSync(file, content);
