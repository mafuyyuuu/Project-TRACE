const { UniSmsClient } = require('@taliffsss/unisms');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const notificationModel = require('../models/notification.model');

/**
 * Multi-channel notification dispatch: in-app (bell icon), SMS (UniSMS),
 * and email (Nodemailer).
 *
 * Every channel here fails soft — a notification problem must never roll back
 * or fail the document action that triggered it, which is how the original
 * route handlers behaved.
 */

const unismsClient = new UniSmsClient(env.UNISMS_SECRET_KEY);

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

async function notifyInApp({ userId, title, message, type }, executor) {
  try {
    await notificationModel.create({ user_id: userId, title, message, type }, executor);
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }
}

/** Fan out one in-app notification to a list of users (e.g. all Finance clerks). */
async function notifyInAppBulk(users, { title, message, type }, executor) {
  for (const user of users) {
    await notifyInApp({ userId: user.id, title, message, type }, executor);
  }
}

async function sendSms(phoneNumber, content) {
  try {
    const targetPhone = phoneNumber || env.TEST_PHONE_NUMBER;
    if (!targetPhone) return;
    await unismsClient.send({
      recipient: targetPhone,
      content,
      senderId: env.UNISMS_SENDER_ID,
    });
    console.log(`✅ [UniSMS] SMS notification dispatched to ${targetPhone}`);
  } catch (err) {
    console.error('❌ [UniSMS] Failed to send SMS:', err.message);
  }
}

async function sendEmail(to, subject, text) {
  try {
    if (!to) return;
    await transporter.sendMail({
      from: `"TRACE Registrar" <${env.SMTP_USER || 'noreply@trace.plp.edu'}>`,
      to,
      subject: 'TRACE: ' + subject,
      text,
    });
    console.log(`✅ [Email] Email notification dispatched to ${to}`);
  } catch (err) {
    console.error('❌ [Email] Failed to send email:', err.message);
  }
}

/**
 * The standard student-facing alert: always an in-app notification, plus
 * concurrent SMS + email when `alsoSmsAndEmail` is set (used on the
 * approve/release paths).
 */
async function dispatchStudentAlert({ user, title, message, type, alsoSmsAndEmail = false, greetingName }, executor) {
  await notifyInApp({ userId: user.id, title, message, type }, executor);

  if (!alsoSmsAndEmail) return;

  const name = greetingName || user.full_name;
  const msgContent = `Hi ${name ? name.split(',')[0] : 'Student'}, ${message.toLowerCase()}`;

  await sendSms(user.phone_number, msgContent);
  await sendEmail(user.email, title, msgContent);
}

module.exports = {
  notifyInApp,
  notifyInAppBulk,
  sendSms,
  sendEmail,
  dispatchStudentAlert,
};
