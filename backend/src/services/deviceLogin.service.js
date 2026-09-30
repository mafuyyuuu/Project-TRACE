const crypto = require('crypto');
const devices = require('../models/userDevice.model');
const notifications = require('./notification.service');
const env = require('../config/env');
const COOKIE_NAME = 'trace_device';
function cookieOptionsFor(frontendUrl) {
  const secure = frontendUrl.split(',').some(url => url.trim().startsWith('https://'));
  return { httpOnly: true, sameSite: secure ? 'none' : 'lax', path: '/api/auth',
    maxAge: 365 * 24 * 60 * 60 * 1000, secure };
}
const COOKIE_OPTIONS = cookieOptionsFor(env.FRONTEND_URL);

async function recordLogin(user, cookieHeader = '', ip = null, userAgent = null) {
  if (!user?.id) return null;
  const value = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  const token = /^[a-f0-9]{64}$/.test(value || '') ? value : crypto.randomBytes(32).toString('hex');
  try {
    const isNew = await devices.record({ userId: user.id,
      deviceHash: crypto.createHash('sha256').update(token).digest('hex'),
      ip: ip?.slice(0, 45) || null, userAgent: userAgent?.slice(0, 500) || null });
    if (isNew) {
      const message = `A browser signed in to your TRACE account at ${new Date().toISOString()}. Browser: ${userAgent || 'Unknown'}. If this was not you, open Account Settings → Security and contact the Registrar.`;
      await Promise.allSettled([
        notifications.notifyInApp({ userId: user.id, title: 'New browser sign-in', message,
          type: 'info', actionUrl: '/dashboard?settings=security' }),
        notifications.sendEmail(user.email, 'New browser sign-in', message),
      ]);
    }
    return token;
  } catch (err) {
    console.warn('Device recognition unavailable:', err.message);
    return null;
  }
}
module.exports = { recordLogin, COOKIE_NAME, COOKIE_OPTIONS, cookieOptionsFor };
