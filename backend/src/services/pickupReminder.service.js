const { pool } = require('../config/db');
const model = require('../models/pickupReminder.model');
const notifications = require('./notification.service');
const { reminderPeriod } = require('../utils/pickupReminderSchedule');
const { normalizePhoneNumber } = require('../utils/phoneNumber');

async function processReminders() {
  if (!notifications.isSmsConfigured()) return { skipped: 'SMS_NOT_CONFIGURED' };
  const connection = await pool.getConnection();
  let acquired = false;
  let submitted = 0;
  try {
    acquired = await model.acquire(connection);
    if (!acquired) return { skipped: 'WORKER_BUSY' };
    await model.markAbandoned(connection);
    const groups = new Map();
    for (const row of await model.candidates(connection)) {
      const schedule = reminderPeriod(Number(row.ready_at_ms), Math.trunc(Number(row.now_ms)));
      if (!schedule) continue;
      const fresh = await model.stillEligible(row, connection);
      const phone = fresh && normalizePhoneNumber(fresh.phone_number);
      if (!phone) continue;
      const id = await model.reserve(row, schedule, connection);
      if (!id) continue;
      const key = `${row.user_id}:${phone}`;
      if (!groups.has(key)) groups.set(key, { phone, rows: [] });
      groups.get(key).rows.push({ ...row, reminder_id: id });
    }
    for (const group of groups.values()) {
      const current = [];
      for (const row of group.rows) {
        const fresh = await model.stillEligible(row, connection);
        if (fresh && normalizePhoneNumber(fresh.phone_number) === group.phone) current.push(row);
        else await model.finish(row.reminder_id, 'cancelled', 'NO_LONGER_ELIGIBLE', connection);
      }
      if (!current.length) continue;
      const reference = current[0].tracking_number;
      const message = `TRACE reminder: ${current.length} ${current.length === 1 ? 'document' : 'documents'} ready at Window 1. Please collect and bring your Official Receipt. Ref: ${reference}.`;
      let result;
      try {
        result = await notifications.sendSms(group.phone, message);
      } catch {
        result = { ok: false, outcome: 'unknown', code: 'UNCONFIRMED' };
      }
      const state = result.ok ? 'accepted' : result.outcome === 'provider_rejected' ? 'failed' : 'unknown';
      for (const row of current) await model.finish(row.reminder_id, state, result.code || null, connection);
      if (result.ok) submitted += current.length;
      console.info(`[PICKUP_SMS] outcome=${state} documents=${current.length}`);
    }
    return { submitted };
  } finally {
    try { if (acquired) await model.release(connection); }
    finally { connection.release(); }
  }
}

function startTimers() {
  let pending = false, stopped = false, reported = false;
  async function tick() {
    if (pending || stopped) return;
    pending = true;
    try { await processReminders(); reported = false; }
    catch (error) {
      if (!reported) console.warn('Pickup SMS reminders unavailable:', error.code || 'INTERNAL_ERROR');
      reported = true;
    } finally { pending = false; }
  }
  const interval = setInterval(tick, 15 * 60 * 1000);
  interval.unref();
  void tick();
  return () => { stopped = true; clearInterval(interval); };
}

module.exports = { processReminders, startTimers };
