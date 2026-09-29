const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const personalTabOld = `
              <div className="bg-white p-4 border border-gray-200 rounded-2xl">
                <h3 className="text-sm font-black text-gray-900 mb-4 border-b border-gray-100 pb-2">Change Password</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                    <input type="password" value={profileData.current_password} onChange={(e) => setField('current_password', e.target.value)} placeholder="Required to change email or password" className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                    <input type="password" value={profileData.password} onChange={(e) => setField('password', e.target.value)} placeholder="Leave blank to keep current password" className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    
                    {profileData.password && (
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-widest grid grid-cols-2 gap-1">
                        <span className={profileData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>{profileData.password.length >= 8 ? '✓' : '○'} 8+ Characters</span>
                        <span className={/[A-Z]/.test(profileData.password) ? 'text-green-600' : 'text-gray-400'}>{/[A-Z]/.test(profileData.password) ? '✓' : '○'} 1 Uppercase</span>
                        <span className={/\\d/.test(profileData.password) ? 'text-green-600' : 'text-gray-400'}>{/\\d/.test(profileData.password) ? '✓' : '○'} 1 Number</span>
                        <span className={/[@$!%*?&]/.test(profileData.password) ? 'text-green-600' : 'text-gray-400'}>{/[@$!%*?&]/.test(profileData.password) ? '✓' : '○'} 1 Special Char</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
`;

if (content.includes(personalTabOld)) {
  content = content.replace(personalTabOld, '');
} else {
  console.log("Could not find personal password tab to extract.");
}

const securityTabNew = `
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white p-4 border border-gray-200 rounded-2xl">
                <h3 className="text-sm font-black text-gray-900 mb-4 border-b border-gray-100 pb-2">Change Password</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                    <input type="password" value={profileData.current_password} onChange={(e) => setField('current_password', e.target.value)} placeholder="Required to change email or password" className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                    <input type="password" value={profileData.password} onChange={(e) => setField('password', e.target.value)} placeholder="Leave blank to keep current password" className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" />
                    
                    {profileData.password && (
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-widest grid grid-cols-2 gap-1">
                        <span className={profileData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>{profileData.password.length >= 8 ? '✓' : '○'} 8+ Characters</span>
                        <span className={/[A-Z]/.test(profileData.password) ? 'text-green-600' : 'text-gray-400'}>{/[A-Z]/.test(profileData.password) ? '✓' : '○'} 1 Uppercase</span>
                        <span className={/\\d/.test(profileData.password) ? 'text-green-600' : 'text-gray-400'}>{/\\d/.test(profileData.password) ? '✓' : '○'} 1 Number</span>
                        <span className={/[@$!%*?&]/.test(profileData.password) ? 'text-green-600' : 'text-gray-400'}>{/[@$!%*?&]/.test(profileData.password) ? '✓' : '○'} 1 Special Char</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 border border-gray-200 rounded-2xl">
                <h3 className="text-sm font-black text-gray-900 mb-4 border-b border-gray-100 pb-2">Session Management</h3>
                <p className="text-sm text-gray-600 mb-4">Log out of all other active sessions across all devices. You will remain logged in on this device.</p>
                <button type="button" onClick={async () => {
                   try {
                     await window.api.post('/auth/logout-all');
                     alert('Logged out of all other devices.');
                   } catch (e) {
                     alert('Error logging out of other devices.');
                   }
                }} className="bg-red-50 text-red-600 font-bold uppercase tracking-widest text-xs py-2 px-4 rounded-xl hover:bg-red-100 transition-colors border border-red-200">
                  Logout All Devices
                </button>
              </div>
              <div className="bg-white p-4 border border-gray-200 rounded-2xl">
                <h3 className="text-sm font-black text-gray-900 mb-4 border-b border-gray-100 pb-2">Recent Security Activity</h3>
                <div className="text-xs text-gray-500 mb-2">View your recent logins, password changes, and other security events.</div>
                <div className="flex justify-center my-4">
                  <a href="/security-logs" target="_blank" className="text-[#15803d] font-bold hover:underline">View Full Security Log</a>
                </div>
              </div>
            </div>
          )}
`;

content = content.replace(
  "{activeTab === 'educational' && isStudent && (",
  securityTabNew + "\n          {activeTab === 'educational' && isStudent && ("
);

// wait, window.api might not exist. I should import api.
if (!content.includes("import api from")) {
  content = content.replace("import useProfileSettings from", "import api from '@/services/api';\nimport useProfileSettings from");
}
content = content.replace("window.api.post", "api.post");

fs.writeFileSync(file, content);
