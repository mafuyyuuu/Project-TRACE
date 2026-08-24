const { UniSmsClient } = require('@taliffsss/unisms');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const notificationModel = require('../models/notification.model');
const realtime = require('../realtime');

/**
 * Multi-channel notification dispatch: in-app (bell icon), SMS (UniSMS), and
 * email (Nodemailer).
 *
 * Two rules govern this module:
 *
 *  1. **Every channel fails soft.** A notification problem must never roll back
 *     or fail the document action that triggered it.
 *  2. **An unconfigured channel is reported, not attempted.** Previously the
 *     SMTP settings fell back to placeholder credentials, so every email died
 *     at send time with an opaque "535 Authentication failed" that looked like
 *     a code bug. Missing configuration is now detected up front and logged
 *     once, clearly, at startup.
 */

// ---------------------------------------------------------------------------
// Channel configuration
// ---------------------------------------------------------------------------

/**
 * Email needs a real host, user and password. The old placeholder values are
 * treated as "not configured" so they can't masquerade as working settings.
 */
const PLACEHOLDER_SMTP = new Set(['mock_user', 'mock_pass', '']);

function isEmailConfigured() {
  return Boolean(
    env.SMTP_HOST &&
    env.SMTP_USER &&
    env.SMTP_PASS &&
    !PLACEHOLDER_SMTP.has(env.SMTP_USER) &&
    !PLACEHOLDER_SMTP.has(env.SMTP_PASS)
  );
}

function isSmsConfigured() {
  return Boolean(env.UNISMS_SECRET_KEY && env.UNISMS_SECRET_KEY.trim());
}

const unismsClient = isSmsConfigured() ? new UniSmsClient(env.UNISMS_SECRET_KEY) : null;

const transporter = isEmailConfigured()
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: Number(env.SMTP_PORT) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

/**
 * Report what is and isn't wired up. Called once at startup so a missing
 * credential is obvious immediately rather than after a student fails to get a
 * notification.
 */
async function verifyChannels() {
  const status = {
    in_app: { configured: true, ok: true, detail: 'Always available (stored in the database).' },
    sms: { configured: isSmsConfigured(), ok: false, detail: '' },
    email: { configured: isEmailConfigured(), ok: false, detail: '' },
  };

  if (!status.sms.configured) {
    status.sms.detail = 'UNISMS_SECRET_KEY is not set — SMS alerts are disabled.';
  } else {
    // UniSMS has no cheap connectivity probe, so configuration is as far as we
    // can check without actually sending a message.
    status.sms.ok = true;
    status.sms.detail = 'API key present.';
  }

  if (!status.email.configured) {
    status.email.detail =
      'SMTP_HOST / SMTP_USER / SMTP_PASS are not set in backend/.env — email alerts are disabled.';
  } else {
    try {
      await transporter.verify();
      status.email.ok = true;
      status.email.detail = `Connected to ${env.SMTP_HOST}.`;
    } catch (err) {
      status.email.detail = `SMTP connection failed: ${err.message}`;
    }
  }

  return status;
}

/** One-line startup summary of channel health. */
async function logChannelStatus() {
  const status = await verifyChannels();
  for (const [channel, s] of Object.entries(status)) {
    if (channel === 'in_app') continue;
    const icon = s.ok ? '✅' : s.configured ? '❌' : '⚠️ ';
    console.log(`${icon} [${channel.toUpperCase()}] ${s.detail}`);
  }
  return status;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function notifyInApp({ userId, title, message, type }, executor) {
  try {
    await notificationModel.create({ user_id: userId, title, message, type }, executor);

    // Push it immediately so an open dashboard updates without polling. This is
    // best-effort: a disconnected client simply sees it on next fetch, and a
    // realtime failure must never affect the stored notification.
    try {
      realtime.emitToUser(userId, 'notification', {
        title, message, type, created_at: new Date().toISOString(), is_read: false,
      });
    } catch (err) {
      console.warn('Realtime push failed (notification still saved):', err.message);
    }

    return { ok: true };
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
    return { ok: false, reason: err.message };
  }
}

/** Fan out one in-app notification to a list of users (e.g. all Finance clerks). */
async function notifyInAppBulk(users, { title, message, type }, executor) {
  for (const user of users) {
    await notifyInApp({ userId: user.id, title, message, type }, executor);
  }
}

/**
 * @returns {{ok: boolean, skipped?: boolean, reason?: string}} so callers and
 * tests can tell "delivered" from "not configured" from "failed".
 */
async function sendSms(phoneNumber, content) {
  if (!isSmsConfigured()) {
    return { ok: false, skipped: true, reason: 'SMS is not configured (UNISMS_SECRET_KEY missing).' };
  }

  const targetPhone = phoneNumber || env.TEST_PHONE_NUMBER;
  if (!targetPhone) {
    return { ok: false, skipped: true, reason: 'No phone number on file for this recipient.' };
  }

  try {
    await unismsClient.send({
      recipient: targetPhone,
      content,
      senderId: env.UNISMS_SENDER_ID,
    });
    console.log(`✅ [UniSMS] SMS dispatched to ${targetPhone}`);
    return { ok: true };
  } catch (err) {
    console.error(`❌ [UniSMS] Failed to send to ${targetPhone}: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

async function sendEmail(to, subject, text) {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: 'Email is not configured (set SMTP_HOST, SMTP_USER and SMTP_PASS in backend/.env).',
    };
  }
  if (!to) {
    return { ok: false, skipped: true, reason: 'No email address on file for this recipient.' };
  }

  try {
    await transporter.sendMail({
      from: `"TRACE Registrar" <${env.SMTP_FROM || env.SMTP_USER}>`,
      to,
      subject: 'TRACE: ' + subject,
      text,
    });
    console.log(`✅ [Email] Email dispatched to ${to}`);
    return { ok: true };
  } catch (err) {
    console.error(`❌ [Email] Failed to send to ${to}: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

/**
 * The standard student-facing alert: always an in-app notification, plus
 * concurrent SMS + email when `alsoSmsAndEmail` is set.
 *
 * @returns {{in_app, sms?, email?}} per-channel outcomes, so a caller can see
 * that (say) email was skipped for lack of configuration.
 */
async function dispatchStudentAlert(
  { user, title, message, type, alsoSmsAndEmail = false, greetingName },
  executor
) {
  const results = { in_app: await notifyInApp({ userId: user.id, title, message, type }, executor) };

  if (!alsoSmsAndEmail) return results;

  const name = greetingName || user.full_name;
  const msgContent = `Hi ${name ? name.split(',')[0] : 'Student'}, ${message.toLowerCase()}`;

  const [sms, email] = await Promise.all([
    sendSms(user.phone_number, msgContent),
    sendEmail(user.email, title, msgContent),
  ]);

  return { ...results, sms, email };
}

module.exports = {
  isSmsConfigured,
  isEmailConfigured,
  verifyChannels,
  logChannelStatus,
  notifyInApp,
  notifyInAppBulk,
  sendSms,
  sendEmail,
  dispatchStudentAlert,
};
