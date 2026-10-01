import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import ConfirmDialog from '@/components/ConfirmDialog';
import useAuthenticator from '@/hooks/useAuthenticator';
import { downloadRecoveryCodes } from '@/utils/downloadRecoveryCodes';

const inputClass = 'mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-900';
const buttonClass = 'rounded-xl bg-[#15803d] px-4 py-3 text-sm font-bold text-white disabled:opacity-50';

export default function AuthenticatorSettings({ user }) {
  const auth = useAuthenticator(user.id);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  useEffect(() => {
    let current = true;
    if (auth.setup?.provisioning_uri) {
      QRCode.toDataURL(auth.setup.provisioning_uri, { width: 240, margin: 2 }).then(value => {
        if (current) { setQr(value); setQrError(''); }
      }).catch(() => { if (current) setQrError('QR preview unavailable. Use the manual setup key below.'); });
    }
    return () => { current = false; };
  }, [auth.setup]);
  const payload = () => ({ current_password: password, ...(recovery ? { recovery_code: code } : { code }) });
  async function confirm() {
    if (await auth.run(confirmation.action, confirmation.payload)) {
      setConfirmation(null); setPassword(''); setCode(''); setQr(''); setRecovery(false);
    }
  }
  function stage(action) {
    if (password && code) setConfirmation({ action, payload: payload() });
  }
  function downloadCodes() {
    downloadRecoveryCodes(auth.codes);
  }
  return <section aria-labelledby="authenticator-heading" onKeyDown={event => { if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault(); }} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
    <h3 id="authenticator-heading" className="text-sm font-black">Two-factor authentication</h3>
    <p className="text-sm">Use an authenticator app on your phone to generate login codes. Available to every TRACE account.</p>
    {auth.error && <div className="space-y-2"><p role="alert" className="text-sm text-red-700 dark:text-red-300">{auth.error}</p>
      {!auth.status && <button type="button" className={buttonClass} onClick={auth.retry}>Retry authenticator settings</button>}</div>}
    {auth.notice && <p role="status" className="text-sm text-green-700 dark:text-green-300">{auth.notice}</p>}
    {!auth.status && !auth.error && <p role="status">Loading authenticator settings…</p>}
    {auth.status && <>
      <p className="text-sm font-bold">Authenticator app: {auth.status.enabled ? 'Enabled' : 'Not enabled'}</p>
      {!auth.status.available && <p className="text-sm text-amber-700 dark:text-amber-300">Authenticator setup is temporarily unavailable. Contact the administrator to finish server configuration.</p>}
      {auth.codes.length > 0 ? <div className="space-y-3">
        <p className="text-sm font-bold">Save your recovery codes now. Each works once; these codes will not be shown again.</p>
        <ul aria-label="Recovery codes" className="select-text space-y-2 rounded-xl bg-gray-50 p-3 font-mono text-sm dark:bg-gray-800">
          {auth.codes.map(value => <li key={value} className="break-all">{value}</li>)}
        </ul>
        <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={downloadCodes}>Download recovery codes</button>
          <button type="button" className={buttonClass} onClick={() => { navigator.clipboard?.writeText(auth.codes.join('\n')).catch(() => {}); }}>Copy recovery codes</button>
          <button type="button" className={buttonClass} onClick={auth.acknowledgeCodes}>I saved my recovery codes</button></div>
      </div> : auth.status.available && <>
        <label className="block text-sm font-semibold">Current password
          <input type="password" autoComplete="current-password" value={password} disabled={auth.busy} onChange={event => setPassword(event.target.value)} className={inputClass} />
        </label>
        {!auth.status.enabled && !auth.setup ? <button type="button" className={buttonClass} disabled={auth.busy || !password} onClick={() => auth.run('setup', { current_password: password })}>Set up authenticator app</button> : <>
          {auth.setup && <div className="space-y-3">
            <p className="text-sm">Scan this QR code with your authenticator app, then enter its six-digit code. Setup expires after 10 minutes.</p>
            {qr && <img src={qr} width="240" height="240" className="max-w-full rounded-xl" alt="Scan to set up TRACE in your authenticator app" />}
            {qrError && <p role="status" className="text-sm">{qrError}</p>}
            <p className="text-sm">Manual setup key: <code className="select-text break-all font-mono">{auth.setup.secret}</code></p>
          </div>}
          <label className="block text-sm font-semibold">{recovery ? 'Recovery code' : 'Authenticator code'}
            <input value={code} disabled={auth.busy} autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} maxLength={recovery ? 35 : 6}
              onChange={event => setCode(recovery ? event.target.value : event.target.value.replace(/\D/g, ''))} className={inputClass} />
          </label>
          <div className="flex flex-wrap gap-2">
            {auth.setup ? <><button type="button" disabled={auth.busy || !password || code.length !== 6} className={buttonClass} onClick={() => stage('enable')}>Enable authenticator</button>
              <button type="button" disabled={auth.busy} className="rounded-xl border px-4 py-3 text-sm" onClick={() => { auth.discardSetup(); setQr(''); setCode(''); setPassword(''); }}>Cancel setup</button></> : <>
              <button type="button" disabled={auth.busy} className="text-sm underline" onClick={() => { setRecovery(value => !value); setCode(''); }}>{recovery ? 'Use authenticator code' : 'Use a recovery code'}</button>
              <button type="button" disabled={auth.busy || !password || !code} className={buttonClass} onClick={() => stage('regenerate')}>Generate new recovery codes</button>
              <button type="button" disabled={auth.busy || !password || !code} className="rounded-xl border border-red-300 px-4 py-3 text-sm text-red-700 disabled:opacity-50 dark:text-red-300" onClick={() => stage('disable')}>Disable authenticator</button>
            </>}
          </div>
        </>}
      </>}
      {auth.status.enabled && !auth.codes.length && <p className="text-sm">{auth.status.recovery_codes_remaining} unused recovery codes remain. Lost your phone and codes? Contact the registrar for identity-verified account recovery.</p>}
    </>}
    {auth.busy && <p role="status">Updating authenticator settings…</p>}
    <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.action === 'disable' ? 'Disable authenticator?' : 'Confirm authenticator change'}
      message={confirmation?.action === 'regenerate' ? 'All previous recovery codes will stop working. Older sessions and browser trust will be revoked.' : 'This updates login protection and revokes older sessions and browser trust.'}
      loading={auth.busy} onConfirm={confirm} onCancel={() => setConfirmation(null)} confirmLabel="Confirm change">
      {auth.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{auth.error}</p>}
    </ConfirmDialog>
  </section>;
}
