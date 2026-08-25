import axios from 'axios'

/**
 * Shared axios instance. Domain-specific calls live in authService.js and
 * documentsService.js — components never import this directly.
 *
 * `VITE_API_URL` is the backend's origin when the frontend is served from a
 * different host (the built SPA on Vercel, the API on its own server). Left
 * unset it stays relative, which is what the Vite dev proxy expects — so
 * development is unaffected. Note Vite inlines this at *build* time, so
 * changing it needs a rebuild, not a restart.
 */
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor: attach Bearer token ──────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trace_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: handle 401 ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('trace_token')
      localStorage.removeItem('trace_user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api
