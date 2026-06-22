import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import UploadPage from './pages/UploadPage'
import QueuePage from './pages/QueuePage'
import Layout from './components/Layout'
import './App.css'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('trace_token')
  if (!token) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="queue" element={<QueuePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
