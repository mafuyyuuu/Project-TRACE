const { pool } = require('../src/config/db');

// Read-only deployment preflight. This checks presence, not data or SQL compatibility.
const requirements = [
  ['users', ['id', 'student_id', 'password_hash', 'is_active', 'must_change_password'], 'base schema: see docs/ENV_SETUP_GUIDE.md'],
  ['users', ['token_version', 'login_otp', 'login_otp_expires', 'pending_email'], 'migrate_batch8.js'],
  ['users', ['email_verified_at'], 'migrate_email_verification.js'],
  ['users', ['program'], 'migrate_program.js'],
  ['programs', ['id', 'college_id', 'name', 'is_active'], 'migrate_program_catalog.js'],
  ['users', ['verification_reason'], 'migrate_verification_reason.js'],
  ['onboarding_guides', ['user_id', 'shown_at'], 'migrate_onboarding_guides.js'],
  ['security_logs', ['user_id', 'event_type', 'created_at'], 'migrate_batch8.js'],
  ['student_profiles', ['user_id', 'birth_date', 'home_address', 'shs_grad_year'], 'migrate_student_profiles.js'],
  ['student_profiles', ['graduation_year'], 'migrate_graduation_year.js'],
  ['student_profiles', ['year_started', 'study_years_confirmed_at'], 'migrate_alumni_study_years.js'],
  ['users', ['registration_proof_unavailable', 'registration_proof_reason'], 'migrate_alumni_study_years.js'],
  ['study_year_events', ['user_id', 'actor_id', 'previous_values', 'saved_values', 'reason'], 'migrate_alumni_study_years.js'],
  ['account_review_events', ['user_id', 'reviewer_id', 'decision', 'evidence_basis'], 'migrate_alumni_study_years.js'],
  ['trusted_browsers', ['user_id', 'token_hash', 'token_version'], 'migrate_trusted_browsers.js'],
  ['authenticator_credentials', ['user_id', 'active_secret', 'pending_secret', 'last_counter'], 'migrate_authenticator.js'],
  ['authenticator_recovery_codes', ['user_id', 'code_hash', 'used_at'], 'migrate_authenticator.js'],
  ['authenticator_challenges', ['user_id', 'nonce_hash', 'token_version', 'consumed'], 'migrate_authenticator.js'],
  ['staff_authenticator_setup', ['user_id', 'code_hash', 'issued_by', 'token_version', 'expires_at_ms', 'attempts', 'consumed'], 'migrate_staff_authenticator_setup.js'],
  ['session_revocations', ['token_hash', 'user_id', 'expires_at'], 'migrate_sessions.js'],
  ['password_resets', ['user_id', 'token_hash', 'expires_at', 'used_at'], 'migrate_password_resets.js'],
  ['payment_methods', ['id','code','name','provider','instructions','requires_reference','reference_label','requires_proof','is_active','sort_order'], 'migrate_payment_methods.js'],
  ['password_history', ['id', 'user_id', 'password_hash', 'created_at'], 'migrate_password_history.js'],
  ['email_verifications', ['user_id', 'kind', 'token_hash', 'token_version', 'expires_at', 'used_at'], 'migrate_email_verification.js'],
  ['grad_applications', ['student_id'], 'base schema: see docs/ENV_SETUP_GUIDE.md'],
  ['document_fee_schedules', ['document_type_id', 'college_id', 'fee_items'], 'migrate_fee_schedules.js'],
  ['document_types', ['rental_fee', 'special_fee'], 'migrate_fee_schedules.js'],
  ['documents', ['document_sequence_number', 'pricing_snapshot', 'fee_breakdown'], 'migrate_fee_schedules.js'],
  ['documents', ['payment_cleared_at', 'or_earliest_issue_date', 'or_uploaded_at'], 'migrate_finance_receipts.js'],
  ['documents', ['is_same_day'], 'migrate_registrar_policy.js'],
  ['request_attachment_requirements', ['document_id', 'label', 'status'], 'migrate_request_attachments.js'],
  ['support_settings',['id','settings'],'migrate_support_tickets.js'],
  ['support_availability',['user_id','available'],'migrate_support_tickets.js'],
  ['support_tickets',['student_user_id','document_id','category','state','queued_at','assigned_to','reply_clock','open_general_owner','live_clerk'],'migrate_support_tickets.js'],
  ['support_ticket_messages',['ticket_id','sender_id','kind','metadata','client_key','payload_hash','import_key'],'migrate_support_tickets.js'],
  ['support_ticket_files',['message_id','filename','original_name','mime_type','size_bytes'],'migrate_support_tickets.js'],
  ['support_ticket_events',['ticket_id','actor_id','event_type','event_key','data'],'migrate_support_tickets.js'],
  ['supporting_document_types',['id','name','is_active'],'migrate_support_requirements.js'],
  ['request_attachment_requirements',['catalog_id','identity_key','replacement_of','superseded_at'],'migrate_support_requirements.js'],
  ['request_attachment_events',['requirement_id','document_id','event_type','snapshot'],'migrate_support_requirements.js'],
  ['request_attachment_uploads', ['requirement_id', 'file_path', 'uploaded_by'], 'migrate_request_attachments.js'],
  ['support_messages', ['student_user_id', 'sender_id', 'message', 'read_at'], 'migrate_support_messages.js'],
  ['document_request_counters', ['student_id', 'document_type', 'last_number', 'original_issued'], 'migrate_request_sequences.js'],
  ['system_templates', ['template_key', 'name', 'content', 'font_family', 'font_size', 'updated_at'], 'migrate_templates.js'],
  ['document_messages', ['document_id', 'sender_id', 'message', 'created_at', 'read_at'], 'migrate_document_messages.js'],
];
async function check(executor = pool) {
  const [rows] = await executor.query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()');
  const found = new Set(rows.map(row => `${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  return requirements.flatMap(([table, columns, migration]) => columns.filter(column => !found.has(`${table}.${column}`)).map(column => ({ field: `${table}.${column}`, migration })));
}
if (require.main === module) check().then(missing => {
  if (!missing.length) { console.log('Schema presence check passed. Verify configured MFA key and complete live acceptance separately.'); return; }
  console.error('Schema check failed. Apply the reviewed explicit migrations before recreating the backend:');
  for (const { field, migration } of missing) console.error(`${field}: ${migration}`);
  process.exitCode = 1;
}).catch(() => { console.error('Schema check could not connect or read metadata. Check database connectivity and permissions.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { check, requirements };
