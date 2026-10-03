import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import useStaffAuthenticatorSetup from '@/hooks/useStaffAuthenticatorSetup';
export default function StaffAuthenticatorSetup({ user }) {
  const setup = useStaffAuthenticatorSetup(user.id);
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  async function issue() {
    if (await setup.issue(password)) { setPassword(''); setConfirming(false); }
  }
  return <section aria-label="Admin-assisted authenticator setup" className="mt-4 rounded-xl border p-4 space-y-3">
    <h3 className="font-bold">Staff authenticator setup</h3>
    <p className="text-sm">For initial enrollment only. Check the staff member’s identity, then give them a private setup code. This cannot replace an existing authenticator.</p>
    {setup.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{setup.error}</p>}
    {setup.result ? <>
      <p className="text-sm">For staff ID <strong>{setup.result.staff_id}</strong>. Expires {new Date(setup.result.expires_at).toLocaleTimeString('en-PH')}.</p>
      <code aria-label="Private staff setup code" className="block select-text break-all text-sm">{setup.result.setup_code}</code>
      <p className="text-sm">Ask the clerk to open <a href="/staff-setup" target="_blank" rel="noopener noreferrer" className="underline">{window.location.origin}/staff-setup</a> on their device. Enter their own ID/password and this code, then enroll their app. The code is shown here once; closing this account hides it.</p>
      <button type="button" onClick={setup.discard} className="trace-button trace-button-secondary">Hide setup code</button>
    </> : <>
      <label className="trace-label block">Your Admin password<input aria-label="Admin password for staff setup" autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} disabled={setup.busy} className="trace-control mt-2 block w-full" /></label>
      <button type="button" disabled={!password || setup.busy} onClick={() => setConfirming(true)} className="trace-button trace-button-secondary">Issue private setup code</button>
    </>}
    <ConfirmDialog open={confirming} title="Issue Staff Setup Code" message={`Issue a ten-minute initial authenticator setup code for ${user.full_name} (${user.student_id})? Any older setup code will stop working.`}
      confirmLabel="Issue setup code" loading={setup.busy} onConfirm={issue} onCancel={() => setConfirming(false)}>
      {setup.error && <p role="alert">{setup.error}</p>}
    </ConfirmDialog>
  </section>;
}
