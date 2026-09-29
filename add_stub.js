const fs = require('fs');

function addStubToStudent() {
  let content = fs.readFileSync('frontend/src/features/student/StudentDashboard.jsx', 'utf8');
  if (!content.includes('PaymentStubModal')) {
    content = content.replace(
      "import StudentProfileModal from '@/components/StudentProfileModal';",
      "import StudentProfileModal from '@/components/StudentProfileModal';\nimport PaymentStubModal from '@/features/secretary/components/PaymentStubModal';"
    );
    
    // Add button in the UI
    const printBtn = `
                <button
                  type="button"
                  onClick={() => setActiveModal('payment-stub')}
                  className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs flex justify-center items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  Print Payment Slip (Walk-in)
                </button>
    `;
    
    content = content.replace(
      "{actionLoading ? 'Submitting...' : 'Submit Payment'}\n                </button>",
      "{actionLoading ? 'Submitting...' : 'Submit Payment'}\n                </button>" + printBtn
    );
    
    // Add modal component
    content = content.replace(
      "{/* Profile Modal */}",
      "{activeModal === 'payment-stub' && <PaymentStubModal selectedDoc={selectedDoc} groupDocs={documents.filter(d => d.request_group_id === selectedDoc.request_group_id)} setActiveModal={setActiveModal} />}\n      {/* Profile Modal */}"
    );
    fs.writeFileSync('frontend/src/features/student/StudentDashboard.jsx', content);
  }
}

function addStubToFinance() {
  let content = fs.readFileSync('frontend/src/features/finance/FinanceDashboard.jsx', 'utf8');
  if (!content.includes('PaymentStubModal')) {
    content = content.replace(
      "import StudentProfileModal from '@/components/StudentProfileModal';",
      "import StudentProfileModal from '@/components/StudentProfileModal';\nimport PaymentStubModal from '@/features/secretary/components/PaymentStubModal';"
    );
    
    // Add modal component
    content = content.replace(
      "<StudentProfileModal",
      "{activeModal === 'payment-stub' && <PaymentStubModal selectedDoc={selectedDoc} groupDocs={documents.filter(d => d.request_group_id === selectedDoc.request_group_id)} setActiveModal={setActiveModal} />}\n      <StudentProfileModal"
    );
    
    fs.writeFileSync('frontend/src/features/finance/FinanceDashboard.jsx', content);
  }
}

addStubToStudent();
addStubToFinance();
