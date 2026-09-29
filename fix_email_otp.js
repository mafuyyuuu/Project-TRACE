const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add emailOTP state
if (!content.includes('const [emailOTP, setEmailOTP] = useState')) {
  content = content.replace(
    "const [isSaving, setIsSaving] = useState(false);",
    "const [isSaving, setIsSaving] = useState(false);\n  const [showEmailOTP, setShowEmailOTP] = useState(false);\n  const [emailOTP, setEmailOTP] = useState('');"
  );
}

// Modify onSave to handle email change response
const handleSave = `
  const onSave = async (e) => {
    e.preventDefault();
    if (showEmailOTP) {
      setIsSaving(true);
      setError('');
      try {
        await api.post('/auth/verify-email-change', { otp: emailOTP });
        setSuccess('Email successfully updated!');
        setShowEmailOTP(false);
        setTimeout(() => onClose(), 2000);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid OTP');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const { current_password, password, ...rest } = profileData;
    if ((rest.email !== user?.email || password) && !current_password) {
      setError('Current password is required to change email or password.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const res = await saveProfileSettings(profileData);
      
      // If email was changed, it requires OTP
      if (rest.email !== user?.email) {
        setShowEmailOTP(true);
        setSuccess('Please check your new email for the verification code.');
        return;
      }
      
      setSuccess('Profile updated successfully.');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsSaving(false);
    }
  };
`;

content = content.replace(
  /const onSave = async \(e\) => \{[\s\S]*?finally \{\n      setIsSaving\(false\);\n    \}\n  \};/,
  handleSave.trim()
);

// Add Email OTP field below the buttons
const otpField = `
          {showEmailOTP && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Email Verification Code</label>
              <input type="text" value={emailOTP} onChange={(e) => setEmailOTP(e.target.value)} placeholder="6-digit code" className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 text-center text-lg tracking-[0.25em] font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" required />
            </div>
          )}
          
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
`;

if (!content.includes('showEmailOTP &&')) {
  content = content.replace(
    '<div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">',
    otpField
  );
}

fs.writeFileSync(file, content);
