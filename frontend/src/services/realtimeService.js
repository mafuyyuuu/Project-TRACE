import { io } from 'socket.io-client'

/**
 * Socket.IO client for real-time in-app notifications.
 *
 * One shared connection per browser tab: every hook that needs notifications
 * subscribes to the same socket rather than opening its own. The JWT is sent in
 * the handshake, matching the REST API's auth, so a socket can never see
 * anything the user couldn't fetch normally.
 */

let socket = null

/** Connect (or reuse the existing connection). Returns null without a token. */
export function connectRealtime() {
  const token = localStorage.getItem('trace_token')
  if (!token) return null

  if (socket?.connected || socket?.connecting) return socket

  socket = io({
    path: '/socket.io',
    auth: { token },
    // Socket.IO reconnects on its own; cap the backoff so a dashboard left open
    // through a server restart recovers promptly.
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  })

  socket.on('connect_error', (err) => {
    // An auth failure is terminal — retrying with the same bad token is futile.
    if (/Authentication|token/i.test(err.message)) {
      console.warn('[Realtime] Authentication rejected; not retrying.')
      socket.disconnect()
    }
  })

  return socket
}

/**
 * Subscribe to pushed notifications.
 * @returns {() => void} unsubscribe, safe to call from a cleanup function
 */
export function onNotification(handler) {
  const s = connectRealtime()
  if (!s) return () => {}

  s.on('notification', handler)
  return () => s.off('notification', handler)
}

/** Drop the connection, e.g. on logout so the next user starts clean. */
export function disconnectRealtime() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function isRealtimeConnected() {
  return Boolean(socket?.connected)
}
