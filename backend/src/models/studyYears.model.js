const { pool } = require('../config/db');

function save(userId, years, executor = pool) {
  return executor.query(`INSERT INTO student_profiles (user_id, year_started, graduation_year, study_years_confirmed_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE year_started = VALUES(year_started), graduation_year = VALUES(graduation_year),
      study_years_confirmed_at = COALESCE(study_years_confirmed_at, CURRENT_TIMESTAMP)`,
  [userId, years.year_started, years.graduation_year]);
}

function record({ userId, actorId, kind, before, after, reason }, executor = pool) {
  return executor.query(`INSERT INTO study_year_events (user_id, actor_id, event_type, previous_values, saved_values, reason)
    VALUES (?, ?, ?, ?, ?, ?)`, [userId, actorId, kind, JSON.stringify(before), JSON.stringify(after), reason]);
}

function review({ userId, actorId, decision, basis }, executor = pool) {
  return executor.query(`INSERT INTO account_review_events (user_id, reviewer_id, decision, evidence_basis)
    VALUES (?, ?, ?, ?)`, [userId, actorId, decision, basis || null]);
}

module.exports = { save, record, review };
