import { PRIVACY_NOTICE_VERSION } from '@/utils/registrationPrivacy';

/** Registration disclosure; the parent owns acknowledgment and submission. */
export default function RegistrationPrivacyNotice() {
  return <div className="space-y-5 text-sm leading-relaxed select-text">
    <p className="text-xs text-gray-500 dark:text-gray-400">TRACE registration notice · Version {PRIVACY_NOTICE_VERSION}</p>
    <p>Pamantasan ng Lungsod ng Pasig (PLP), through the Registrar’s Office, uses TRACE to receive student and alumni registrations and provide Registrar services.</p>
    <section className="space-y-2"><h3 className="font-bold">Information and purpose</h3>
      <p>Registration collects your Student or Alumni ID, name, college, program, email, phone number, password and identity proof. Alumni also provide study years or an explanation if proof is unavailable. TRACE stores a password hash rather than your plain password.</p>
      <p>These details support identity and account verification, access to your account, document requests, required service communications and account security. TRACE records the version and server time of this acknowledgment with your registration.</p>
    </section>
    <section className="space-y-2"><h3 className="font-bold">Proof checks and authorized access</h3>
      <p>The OCR service attempts to read the school, ID number and college from your uploaded proof. A match can verify the account automatically; unreadable or unmatched details remain pending for authorized staff review. Contact the Registrar if a check is incorrect. Alumni who cannot supply proof require manual identity review.</p>
      <p>Authorized Registrar personnel access information according to their role and assigned work. TRACE’s hosting, OCR, email and SMS services process the information needed to operate these services. Your registration proof is accessed through authenticated file permissions.</p>
    </section>
    <section className="space-y-2"><h3 className="font-bold">Retention and your rights</h3>
      <p>TRACE does not automatically delete registration proof when an account is approved. Ask the Registrar for the school’s applicable retention schedule and how to request access, correction, objection or deletion. Requests remain subject to applicable law and required school records retention.</p>
      <p>For privacy questions or to exercise your rights, contact the PLP Registrar’s Office and request referral to the school’s Data Protection Officer. You may also raise a concern with the <a className="trace-action underline" href="https://privacy.gov.ph/" target="_blank" rel="noreferrer">National Privacy Commission (opens in a new tab)</a>.</p>
    </section>
    <p>Acknowledging this notice confirms that you have read how registration information is used. It does not waive your privacy rights or authorize unrelated processing. The school must establish the applicable lawful basis and obtain separate, specific consent where required.</p>
  </div>;
}
