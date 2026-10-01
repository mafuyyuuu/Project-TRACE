const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const sessions = require('../models/session.model');
const { corsOrigin } = require('../config/cors');

/**
 * Real-time in-app notifications over Socket.IO.
 *
 * Notifications only ever travel server → client, so the socket carries no
 * client-sent events. What Socket.IO gives us here is a maintained transport
 * with automatic reconnection and fallback; what it does *not* give us is
 * authentication, so that is enforced explicitly below.
 *
 * Every connection is placed in a room named `user:<id>`, and emissions are
 * addressed to that room. A socket therefore only ever receives notifications
 * belonging to the account that authenticated it — the same rule the REST API
 * enforces.
 */

let io = null;

async function authenticateToken(token) {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (decoded.pending_2fa || !Number.isInteger(decoded.id) || !Number.isInteger(decoded.token_version)
    || !['student', 'admin', 'clerk'].includes(decoded.role) || !Number.isInteger(decoded.exp)) throw new Error('Invalid session');
  const [rows] = await pool.query('SELECT token_version, is_active FROM users WHERE id = ?', [decoded.id]);
  if (!rows[0]?.is_active || rows[0].token_version !== decoded.token_version) throw new Error('Revoked session');
  if (await sessions.revoked(sessions.hashToken(token))) throw new Error('Ended session');
  return { id: decoded.id, role: decoded.role, desk_assignment: decoded.desk_assignment, exp: decoded.exp };
}

function disconnectSession(sessionHash) {
  if (!io) return false;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.sessionToken && sessions.hashToken(socket.sessionToken) === sessionHash) socket.disconnect(true);
  }
  return true;
}

function disconnectUser(userId) {
  if (!io) return false;
  try { io.in(`user:${userId}`).disconnectSockets(true); return true; }
  catch { return false; }
}

/** Attach Socket.IO to the HTTP server. */
function init(httpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    // Same allowlist as the REST API — reflecting any origin *with*
    // credentials would let any site open an authenticated socket.
    cors: { origin: corsOrigin(), credentials: true },
    // Notifications are small and infrequent; keep buffers modest.
    maxHttpBufferSize: 1e6,
  });

  /**
   * Authenticate the handshake.
   *
   * The token is verified with the same secret as the REST API, so a socket can
   * never outlive or bypass normal auth. An unauthenticated connection is
   * refused rather than silently downgraded.
   */
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || (socket.handshake.headers.authorization || '').replace(/^Bearer /, '');
    try {
      socket.user = await authenticateToken(token);
      socket.sessionToken = token;
      return next();
    } catch { return next(new Error('Invalid or expired token. Complete login verification again.')); }
  });

  io.on('connection', (socket) => {
    const { id, role, desk_assignment: desk } = socket.user;

    // Private room per account — the only channel this socket receives on.
    socket.join(`user:${id}`);

    // Desk rooms let a whole queue be alerted without looking up its members
    // (e.g. every Secretary when a payment clears).
    if (role === 'clerk' && desk) socket.join(`desk:${desk}`);
    if (role === 'admin') socket.join('desk:Admin Office');

    socket.emit('connected', { userId: id });
    // Check external revocations as well as application-triggered disconnects.
    let checking = false;
    const check = setInterval(async () => {
      if (checking) return;
      checking = true;
      try { await authenticateToken(socket.sessionToken); }
      catch { socket.disconnect(true); }
      finally { checking = false; }
    }, 15000);
    check.unref?.();
    const expires = setTimeout(() => socket.disconnect(true), Math.max(0, socket.user.exp * 1000 - Date.now()));
    expires.unref?.();

    socket.on('disconnect', () => {
      clearInterval(check); clearTimeout(expires);
    });
  });

  console.log('🔌 [Realtime] Socket.IO listening on /socket.io');
  return io;
}

/**
 * Push a notification to one account.
 *
 * Safe to call before `init` (e.g. in tests) — it simply does nothing, so a
 * missing realtime layer can never break the document action that triggered it.
 */
function emitToUser(userId, event, payload) {
  if (!io) return false;
  io.to(`user:${userId}`).emit(event, payload);
  return true;
}

/** Push to every clerk currently sitting at a desk. */
function emitToDesk(desk, event, payload) {
  if (!io) return false;
  io.to(`desk:${desk}`).emit(event, payload);
  return true;
}

/** Connected socket count, for the admin diagnostics view. */
function connectionCount() {
  return io ? io.engine.clientsCount : 0;
}

module.exports = { authenticateToken, disconnectUser, disconnectSession, init, emitToUser, emitToDesk, connectionCount, get io() { return io; } };
