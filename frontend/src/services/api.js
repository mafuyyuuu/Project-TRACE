import { authStorage } from '@/utils/authStorage';
import axios from 'axios'
import { handleSessionFailure } from '@/utils/apiSession'
import { changedResources, publishDataChange } from '@/services/dataChanges'

/**
 * Shared axios instance. Domain-specific calls live in authService.js and
 * documentsService.js — components never import this directly.
 *
 * `VITE_API_URL` is the backend's origin when the frontend is served from a
 * different host (the built SPA on Vercel, the API on its own server). Left
 * unset it stays relative, which is what the Vite dev proxy expects — so
 * development is unaffected. Note Vite inlines this at *build* time, so
 * changing it needs a rebuild, not a restart.
 * Vercel builds enable VITE_AUTH_PROXY: only /auth requests use the site's
 * /api/auth reverse proxy so HttpOnly browser-trust cookies are first-party.
 */
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  withCredentials: true,
  // Let Axios encode objects as JSON and the browser add FormData boundaries.
})

const activityKey = Symbol('traceApiActivity')
const pendingRequests = new Set()
const activityListeners = new Set()

export const getPendingApiRequests = () => pendingRequests.size

export function subscribeApiActivity(listener) {
  activityListeners.add(listener)
  return () => activityListeners.delete(listener)
}

function notifyActivity() {
  activityListeners.forEach(listener => listener())
}

function trackActivity(config) {
  const finish = () => {
    if (!pendingRequests.delete(finish)) return
    config.signal?.removeEventListener('abort', finish)
    config.cancelToken?.unsubscribe(finish)
    delete config[activityKey]
    notifyActivity()
  }
  config[activityKey] = finish
  pendingRequests.add(finish)
  notifyActivity()
  config.signal?.addEventListener('abort', finish, { once: true })
  config.cancelToken?.subscribe(finish)
  if (config.signal?.aborted) finish()
}

// ── Request Interceptor: attach Bearer token ──────────────
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.VITE_AUTH_PROXY === 'true' && /^\/auth(?:\/|$|\?)/.test(config.url || '')) config.baseURL = '/api'
    const token = authStorage.getItem('trace_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    trackActivity(config)
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: handle 401 ──────────────────────
api.interceptors.response.use(
  (response) => {
    response.config?.[activityKey]?.()
    const sent = response.config?.headers?.get?.('Authorization') || response.config?.headers?.Authorization
    if (sent && sent !== `Bearer ${authStorage.getItem('trace_token')}`) throw new axios.CanceledError('Session changed before this response arrived.', response.config)
    const resources = changedResources(response.config?.url, response.config?.method)
    if (response.status >= 200 && response.status < 300 && resources.length) publishDataChange(resources)
    return response
  },
  (error) => {
    error.config?.[activityKey]?.()
    handleSessionFailure(error, { storage: authStorage, location: window.location })
    return Promise.reject(error)
  }
)

export default api
