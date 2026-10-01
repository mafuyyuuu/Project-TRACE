export default function RegistrationReviewNotice({ user }) {
  if (user?.role !== 'student' || user.verification_status !== 'pending') return null;
  return <section aria-label="Registration review reason" className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
    <h4 className="font-bold">Awaiting manual proof review</h4>
    <p className="mt-1 break-words">{user.verification_reason || 'The automatic-check reason was not recorded for this account. Inspect the uploaded proof and account details.'}</p>
    <p className="mt-1">Pending review does not mean the proof is fake. Only the Registrar’s review determines approval or rejection.</p>
  </section>;
}
