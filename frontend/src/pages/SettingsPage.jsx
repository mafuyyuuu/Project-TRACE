/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { useAuth } from '../utils/hooks'
import { useSettings } from '../utils/SettingsContext'
import { updateProfile, updateSystemSettings } from '../services/api'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const {
    systemName,
    setSystemName,
    systemLogo,
    setSystemLogo,
    organization,
    setOrganization,
    theme,
    setTheme,
    accent,
    setAccent,
    font,
    setFont,
    fontSize,
    setFontSize,
    reduceAnimations,
    setReduceAnimations,
    colorBlindMode,
    setColorBlindMode,
    profilePic,
    setProfilePic,
    systemLogoPic,
    setSystemLogoPic,
  } = useSettings()

  const [activeTab, setActiveTab] = useState('profile')

  // Modals visibility states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)

  // Profile Form States (for Modal)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Admin Branding Form States (for Modal)
  const [adminSystemName, setAdminSystemName] = useState('')
  const [adminSystemLogo, setAdminSystemLogo] = useState('')
  const [adminOrganization, setAdminOrganization] = useState('')

  // UI Feedback States
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Initialize profile states
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setEmail(user.email || '')
      setStudentId(user.student_id || '')
    }
  }, [user])

  // Initialize admin states
  useEffect(() => {
    setAdminSystemName(systemName)
    setAdminSystemLogo(systemLogo)
    setAdminOrganization(organization)
  }, [systemName, systemLogo, organization, isAdminModalOpen])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileSuccess('')
    setProfileError('')

    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('New passwords do not match.')
      return
    }

    setIsUpdating(true)
    try {
      const response = await updateProfile({
        full_name: fullName,
        email: email,
        student_id: studentId,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      })

      const updatedUser = response.user
      setUser(updatedUser)
      localStorage.setItem('trace_user', JSON.stringify(updatedUser))

      setProfileSuccess(response.message || 'Profile updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsProfileModalOpen(false) // Close Modal
    } catch (err) {
      console.error(err)
      setProfileError(err.response?.data?.error || err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateSystemSettings({
        system_name: adminSystemName,
        system_logo_initials: adminSystemLogo.toUpperCase(),
        organization_name: adminOrganization,
      })
      setSystemName(adminSystemName)
      setSystemLogo(adminSystemLogo.toUpperCase())
      setOrganization(adminOrganization)
      setIsAdminModalOpen(false) // Close Modal
    } catch (err) {
      console.error(err)
      alert('Failed to save branding settings to the database.')
    }
  }

  // Upload handlers
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePic(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSystemLogoPicChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          await updateSystemSettings({ system_logo_pic: reader.result })
          setSystemLogoPic(reader.result)
        } catch (err) {
          console.error(err)
          alert('Failed to upload logo image to the database.')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.full_name) return 'U'
    return user.full_name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[600px] w-full max-w-5xl mx-auto">
      {/* Settings Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-2 shrink-0 self-start">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-4">Settings</h2>
        
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-pine-50 text-pine-600 shadow-inner'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          User Profile
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
            activeTab === 'appearance'
              ? 'bg-pine-50 text-pine-600 shadow-inner'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Appearance
        </button>

        <button
          onClick={() => setActiveTab('accessibility')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
            activeTab === 'accessibility'
              ? 'bg-pine-50 text-pine-600 shadow-inner'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Accessibility
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'admin'
                ? 'bg-pine-50 text-pine-600 shadow-inner'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            Admin Settings
          </button>
        )}
      </aside>

      {/* Settings Content Area */}
      <main className="flex-1 bg-white rounded-3xl shadow-sm p-6 md:p-8 flex flex-col gap-6">
        
        {/* --- USER PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-2">User Profile</h3>
            <p className="text-sm text-gray-500 mb-6">View your registration profile and update details.</p>

            {profileSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-sm font-medium border border-emerald-100 flex items-center gap-2 mb-6 w-full shrink-0 animate-fade-in">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {profileSuccess}
              </div>
            )}

            {/* Profile Summary Header (iOS/macOS Style) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-gray-50 border border-gray-100 w-full mb-6 shrink-0">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div 
                  onClick={() => document.getElementById('profile-pic-upload').click()}
                  className="w-20 h-20 relative rounded-full overflow-hidden shadow-sm bg-white shrink-0 cursor-pointer group/avatar"
                  title="Hover to change profile photo"
                >
                  {profilePic ? (
                    <img src={profilePic} className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-300" alt="Profile" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pine-500 to-pine-700 text-white flex items-center justify-center font-display font-extrabold text-2xl group-hover/avatar:scale-105 transition-transform duration-300">
                      {getUserInitials()}
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-[9px] font-extrabold gap-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>CHANGE</span>
                  </div>
                </div>
                {/* Hidden input */}
                <input
                  type="file"
                  id="profile-pic-upload"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  className="hidden"
                />

                <div>
                  <h4 className="text-xl font-bold text-gray-800 leading-tight">{user?.full_name}</h4>
                  <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-pine-50 text-pine-600 border border-pine-100">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {profilePic && (
                  <button
                    onClick={() => setProfilePic(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-55 transition-colors"
                  >
                    Remove Photo
                  </button>
                )}
                <button
                  onClick={() => {
                    setProfileError('')
                    setIsProfileModalOpen(true)
                  }}
                  className="group/btn px-5 py-2.5 rounded-xl text-xs font-bold bg-pine-600 hover:bg-pine-700 text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Unified Property Rows */}
            <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col divide-y divide-gray-100">
              
              {/* Row 1: Email */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">Email Address</h5>
                  <p className="text-gray-500 text-xs mt-0.5">{user?.email || 'Not specified'}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-200/60 rounded-md px-2 py-0.5">Primary</span>
              </div>

              {/* Row 2: ID */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">
                    {user?.role === 'student' ? 'Student ID' : 'Employee ID'}
                  </h5>
                  <p className="text-gray-500 text-xs mt-0.5">{user?.student_id}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-200/60 rounded-md px-2 py-0.5">Unique</span>
              </div>

              {/* Row 3: Status */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">Account Status</h5>
                  <p className="text-gray-500 text-xs mt-0.5">Verified registration credentials</p>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                  Active
                </span>
              </div>

              {/* Row 4: Joined Date */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">Account Created</h5>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'July 5, 2026'}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-200/60 rounded-md px-2 py-0.5">Timeline</span>
              </div>

            </div>
          </div>
        )}

        {/* --- APPEARANCE TAB --- */}
        {activeTab === 'appearance' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Appearance</h3>
            <p className="text-sm text-gray-500 mb-6">Personalize the styling and feel of your TRACE workspace.</p>

            <div className="w-full divide-y divide-gray-100 border-t border-b border-gray-100">
              {/* Theme Mode */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Theme Mode</h4>
                  <p className="text-xs text-gray-400 mt-1">Select the visual theme for your TRACE workspace.</p>
                </div>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-pine-500 outline-none transition-all w-full sm:w-48"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                  <option value="forest">Forest</option>
                </select>
              </div>

              {/* Accent Color */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Accent Color</h4>
                  <p className="text-xs text-gray-400 mt-1">Updates brand highlights, primary buttons, and link themes.</p>
                </div>
                <select
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-pine-500 outline-none transition-all w-full sm:w-48"
                >
                  <option value="pine">Pine Green</option>
                  <option value="blue">Camp Blue</option>
                  <option value="campfire">Campfire Gold</option>
                  <option value="dusk">Dusk Purple</option>
                  <option value="berry">Berry Pink</option>
                </select>
              </div>

              {/* Typography Font */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Typography Font</h4>
                  <p className="text-xs text-gray-400 mt-1">Choose the primary font style for the text body.</p>
                </div>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-pine-500 outline-none transition-all w-full sm:w-48"
                >
                  <option value="inter">Inter (Sans)</option>
                  <option value="poppins">Poppins (Clean)</option>
                  <option value="jetbrains">JetBrains Mono (Console)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* --- ACCESSIBILITY TAB --- */}
        {activeTab === 'accessibility' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Accessibility</h3>
            <p className="text-sm text-gray-500 mb-6">Adjust preferences for readability, visuals, and assistive features.</p>

            <div className="w-full divide-y divide-gray-100 border-t border-b border-gray-100">
              {/* Application Font Size */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Application Font Size</h4>
                  <p className="text-xs text-gray-400 mt-1">Scale up the system sizing for enhanced readability.</p>
                </div>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-pine-500 outline-none transition-all w-full sm:w-48"
                >
                  <option value="sm">Small</option>
                  <option value="base">Default</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>

              {/* Reduce Animations */}
              <div className="py-5 flex items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Reduce Animations</h4>
                  <p className="text-xs text-gray-400 mt-1">Disables visual sliding and transitions for performance.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={reduceAnimations}
                    onChange={(e) => setReduceAnimations(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pine-600"></div>
                </label>
              </div>

              {/* Color-blind Friendly Mode */}
              <div className="py-5 flex items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Color-blind Friendly Mode</h4>
                  <p className="text-xs text-gray-400 mt-1">Optimizes contrast and filters color schemes to aid legibility.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={colorBlindMode}
                    onChange={(e) => setColorBlindMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pine-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* --- ADMIN SETTINGS TAB --- */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Admin Settings</h3>
            <p className="text-sm text-gray-500 mb-6">Manage global system parameters and identity branding.</p>

            {/* Admin Summary Header (iOS/macOS Style) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-gray-50 border border-gray-100 w-full mb-6 shrink-0">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div 
                  onClick={() => document.getElementById('logo-pic-upload').click()}
                  className="w-20 h-20 relative rounded-full overflow-hidden shadow-sm bg-pine-600 text-white flex items-center justify-center shrink-0 cursor-pointer group/avatar"
                  title="Hover to change brand logo picture"
                >
                  {systemLogoPic ? (
                    <img src={systemLogoPic} className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-300" alt="Logo" />
                  ) : (
                    <div className="w-full h-full bg-pine-600 text-white flex items-center justify-center group-hover/avatar:scale-105 transition-transform duration-300">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-[9px] font-extrabold gap-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>CHANGE</span>
                  </div>
                </div>
                {/* Hidden input */}
                <input
                  type="file"
                  id="logo-pic-upload"
                  accept="image/*"
                  onChange={handleSystemLogoPicChange}
                  className="hidden"
                />

                <div>
                  <h4 className="text-xl font-bold text-gray-800 leading-tight">{systemName}</h4>
                  <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-gray-100 text-gray-600 border border-gray-200">
                    Global Branding
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {systemLogoPic && (
                  <button
                    onClick={async () => {
                      try {
                        await updateSystemSettings({ system_logo_pic: '' })
                        setSystemLogoPic(null)
                      } catch (err) {
                        console.error(err)
                        alert('Failed to remove logo from the database.')
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-55 transition-colors"
                  >
                    Remove Logo
                  </button>
                )}
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="group/btn px-5 py-2.5 rounded-xl text-xs font-bold bg-pine-600 hover:bg-pine-700 text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Branding
                </button>
              </div>
            </div>

            {/* Unified Property Rows */}
            <div className="w-full bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col divide-y divide-gray-100">
              
              {/* Row 1: System Name */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">System Name</h5>
                  <p className="text-gray-500 text-xs mt-0.5">{systemName}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-200/60 rounded-md px-2 py-0.5">Brand</span>
              </div>

              {/* Row 2: Initials */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">Logo Initials</h5>
                  <p className="text-gray-500 text-xs mt-0.5">{systemLogo} (Abbreviated fallback)</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-200/60 rounded-md px-2 py-0.5">Initials</span>
              </div>

              {/* Row 3: Organization */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">Organization / Department</h5>
                  <p className="text-gray-500 text-xs mt-0.5">{organization}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-200/60 rounded-md px-2 py-0.5">Owner</span>
              </div>

              {/* Row 4: Environment */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-800 text-sm">System Deployment</h5>
                  <p className="text-gray-500 text-xs mt-0.5">Production environment node status</p>
                </div>
                <span className="text-[9px] font-extrabold text-pine-600 bg-pine-50 border border-pine-100 rounded-full px-2.5 py-0.5 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-1 h-1 bg-pine-500 rounded-full animate-ping" />
                  Live
                </span>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* ==========================================
         MODAL: EDIT PROFILE
         ========================================== */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-up">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-gray-800 mb-1">Edit User Profile</h3>
            <p className="text-xs text-gray-400 mb-6">Modify details and update credentials below.</p>

            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              {profileError && (
                <div className="bg-red-50 text-red-800 p-4 rounded-2xl text-xs font-medium border border-red-100 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {profileError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modalFullName" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  id="modalFullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modalStudentId" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {user?.role === 'student' ? 'Student ID' : 'Employee ID'}
                  </label>
                  <input
                    type="text"
                    id="modalStudentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modalEmail" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    id="modalEmail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 my-2 pt-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Update Password</h4>
                
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modalCurrentPassword" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                  <input
                    type="password"
                    id="modalCurrentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="modalNewPassword" className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      id="modalNewPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="modalConfirmPassword" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      id="modalConfirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-pine-600 hover:bg-pine-700 disabled:bg-pine-400 text-white font-bold rounded-2xl py-2.5 px-6 shadow-md transition-all flex items-center gap-2 text-xs"
                >
                  {isUpdating ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
         MODAL: EDIT ADMIN BRANDING
         ========================================== */}
      {isAdminModalOpen && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-gray-800 mb-1">Edit System Branding</h3>
            <p className="text-xs text-gray-400 mb-6">Update global workspace label identity.</p>

            <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modalSystemName" className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Name</label>
                <input
                  type="text"
                  id="modalSystemName"
                  value={adminSystemName}
                  onChange={(e) => setAdminSystemName(e.target.value)}
                  required
                  placeholder="Project TRACE"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modalSystemLogo" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Logo Initials (Max 3 letters)</label>
                <input
                  type="text"
                  id="modalSystemLogo"
                  value={adminSystemLogo}
                  onChange={(e) => setAdminSystemLogo(e.target.value.substring(0, 3))}
                  required
                  placeholder="MK"
                  maxLength="3"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all uppercase"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modalOrganization" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Organization / Department</label>
                <input
                  type="text"
                  id="modalOrganization"
                  value={adminOrganization}
                  onChange={(e) => setAdminOrganization(e.target.value)}
                  required
                  placeholder="PLP Registrar"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-pine-600 hover:bg-pine-700 text-white font-bold rounded-2xl py-2.5 px-6 shadow-md transition-all text-xs"
                >
                  Save Branding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
