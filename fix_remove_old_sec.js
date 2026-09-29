const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldSecBlock = `
              <div className="pt-4 border-t border-gray-200 border-dashed">
                <h4 className="text-sm font-bold text-gray-800 mb-4">Security Settings</h4>
                <div className="space-y-4">
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

content = content.replace(oldSecBlock, "");
fs.writeFileSync(file, content);
