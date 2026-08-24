const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

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

/** Attach Socket.IO to the HTTP server. */
function init(httpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: true, credentials: true },
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
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || '').replace(/^Bearer /, '');

    if (!token) {
      return next(new Error('Authentication required.'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = {
        id: decoded.id,
        role: decoded.role,
        desk_assignment: decoded.desk_assignment,
      };
      return next();
    } catch {
      return next(new Error('Invalid or expired token.'));
    }
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

    socket.on('disconnect', () => {
      // Rooms are cleaned up by Socket.IO; nothing to undo.
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

module.exports = { init, emitToUser, emitToDesk, connectionCount, get io() { return io; } };
