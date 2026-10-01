import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import StaffAuthenticatorSetupPage from '@/pages/StaffAuthenticatorSetupPage'
import DashboardPage from '@/pages/DashboardPage'
import Layout from '@/layouts/Layout'
import DashboardLoading from '@/components/DashboardLoading'
import useApiActivity from '@/hooks/useApiActivity'

function ApiLoadingIndicator() {
  const pendingRequests = useApiActivity()
  if (pendingRequests === 0) return null
  return (
    <div className="pointer-events-none fixed top-2 left-1/2 -translate-x-1/2 z-[120] max-w-[calc(100vw-2rem)] rounded-full border border-pine-200 dark:border-pine-700 bg-white/95 dark:bg-gray-900/95 px-3 py-2 text-pine-700 dark:text-pine-200 shadow-sm">
      <DashboardLoading compact label="Loading…" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('trace_token')
  if (!token) return <Navigate to="/" replace />
  return children
}

function NavigationNotifications() {
  const location = useLocation();
  useEffect(() => {
    window.dispatchEvent(new Event('trace:notification-navigation'));
  }, [location.key]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <NavigationNotifications />
      <ApiLoadingIndicator />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* Public by necessity: a user who needs these cannot log in. */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/staff-setup" element={<StaffAuthenticatorSetupPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
