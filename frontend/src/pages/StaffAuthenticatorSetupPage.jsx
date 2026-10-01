import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '@/components/AuthShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import useStaffEnrollment from '@/hooks/useStaffEnrollment';
import { downloadRecoveryCodes } from '@/utils/downloadRecoveryCodes';
const inputClass = 'mt-2 w-full rounded-xl border border-white/30 bg-white/10 p-3 text-base';
export default function StaffAuthenticatorSetupPage() {
  const auth = useStaffEnrollment();
  const [id, setId] = useState(''), [password, setPassword] = useState(''), [setupCode, setSetupCode] = useState(''), [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const payload = () => ({ employee_id: id.trim(), password, setup_code: setupCode.trim(), code });
  async function enroll() {
    if (await auth.run(payload(), true)) { setConfirming(false); setPassword(''); setSetupCode(''); setCode(''); }
  }
  return <AuthShell title="Staff authenticator setup" subtitle="Window 1, Finance and College Secretary can use their own authenticator app without an email inbox.">
    {auth.error && <p role="alert" className="my-3 rounded-xl bg-red-950 p-3 text-sm">{auth.error}</p>}
    {auth.codes.length ? <section className="space-y-4">
      <p role="status">Authenticator enabled. Save these recovery codes privately before continuing. Each works once; they will not be shown again.</p>
      <ul aria-label="Recovery codes" className="select-text font-mono text-sm space-y-2">{auth.codes.map(value => <li key={value} className="break-all">{value}</li>)}</ul>
      <button type="button" onClick={() => downloadRecoveryCodes(auth.codes)} className="rounded-xl border px-3 py-2">Download recovery codes</button>
      <button type="button" onClick={() => { window.location.href = '/dashboard'; }} className="w-full rounded-xl bg-white p-3 font-bold text-green-900">I saved my recovery codes — Continue</button>
    </section> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!auth.setup) auth.run(payload()); else setConfirming(true); }}>
      {!auth.setup ? <>
        <p className="text-sm">Ask Admin to check your identity and issue a private ten-minute setup code. Use your own staff password.</p>
        <label className="block">Staff ID<input required maxLength={50} autoComplete="username" value={id} disabled={auth.busy} onChange={event => setId(event.target.value)} className={inputClass} /></label>
        <label className="block">Staff password<input required maxLength={64} type="password" autoComplete="current-password" value={password} disabled={auth.busy} onChange={event => setPassword(event.target.value)} className={inputClass} /></label>
        <label className="block">Admin setup code<input required maxLength={64} autoComplete="off" value={setupCode} disabled={auth.busy} onChange={event => setSetupCode(event.target.value)} className={`${inputClass} font-mono`} /></label>
      </> : <>
        <p className="text-sm">Scan with your authenticator app, or enter the manual key below. Setup expires {new Date(auth.setup.expires_at).toLocaleTimeString('en-PH')}.</p>
        {auth.qr && <img src={auth.qr} alt="Staff authenticator setup QR" width={240} height={240} className="max-w-full rounded-xl" />}
        <p>Manual setup key: <code className="select-text break-all">{auth.setup.secret}</code></p>
        <label className="block">Authenticator code<input required maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={code} disabled={auth.busy} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className={inputClass} /></label>
        <button type="button" disabled={auth.busy} onClick={() => { auth.restart(); setCode(''); }} className="underline">Start again</button>
      </>}
      <button disabled={auth.busy || (auth.setup && code.length !== 6)} type="submit" className="w-full rounded-xl bg-white p-3 font-bold text-green-900 disabled:opacity-50">{auth.busy ? 'Verifying…' : auth.setup ? 'Enable authenticator' : 'Verify staff setup'}</button>
    </form>}
    <div className="mt-6"><Link to="/" className="underline">Back to Login</Link></div>
    <ConfirmDialog open={confirming} title="Enable Staff Authenticator" message="Enable this authenticator and revoke older sessions? Save the recovery codes that appear next." confirmLabel="Enable authenticator" loading={auth.busy} onConfirm={enroll} onCancel={() => setConfirming(false)}>
      {auth.error && <p role="alert">{auth.error}</p>}
    </ConfirmDialog>
  </AuthShell>;
}
