import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

const STEPS = [
  ['Complete your profile', 'Open Edit Profile from your profile picture. Fill in Personal Info and Educational Background. The progress bar and missing-field markers show what remains. New Request explains each missing field and links directly to Edit Profile; requests stay blocked until your saved profile is complete.'],
  ['Verify your email', 'Use Verify Email and open the one-click link in your inbox or spam folder. ID approval and email verification are separate. You can resend an expired link. Verify a new email before it replaces your current address. Alumni submit the graduate application first.'],
  ['Request documents', 'Choose New Request, select documents and quantities, and enter the requested details. TOR asks for Year Started and Year Ended. Rates are for information; Secretary enters the actual printed pages to calculate the final bill. Review the confirmation before submitting.'],
  ['Review and pay your bill', 'Your dashboard shows the final itemized charges and request total when pricing finishes. Follow the payment instructions and submit proof, or pay at the Finance counter. Finance verifies payment. A payment acknowledgment is separate from the Official Receipt; an OR may be issued later.'],
  ['Track and collect', 'Open Live Tracking on a request to follow its stages. A rejection includes a reason; respond to the indicated action. Wait for the release notice and collection instructions before visiting the release counter.'],
  ['Messages, attachments and notifications', 'Check the notification bell and Messages & Attachments for staff replies. Choose the relevant request to message Window 1. When Registrar asks for a named attachment, upload it under that requirement and check whether it was accepted or needs resubmission.'],
  ['Protect your account', 'Edit Profile → Security contains password changes, other-device logout, security activity and Two-factor authentication. Authenticator setup uses a QR code or manual key. Keep recovery codes somewhere safe. Preferences changes text size and theme on this browser.'],
];

export default function OnboardingTutorial({ onComplete }) {
  const [step, setStep] = useState(0);
  return <ModalShell open onClose={onComplete} title="TRACE quick guide" maxWidth="max-w-xl" footer={
    <div className="flex flex-wrap gap-3 justify-between">
      <button type="button" onClick={onComplete} className="border rounded-xl px-4 py-2">Close guide</button>
      <div className="flex flex-wrap gap-3">
        {step > 0 && <button type="button" onClick={() => setStep(value => value - 1)} className="border rounded-xl px-4 py-2">Back</button>}
        <button type="button" onClick={() => step === STEPS.length - 1 ? onComplete() : setStep(value => value + 1)} className="bg-green-700 text-white rounded-xl px-4 py-2">{step === STEPS.length - 1 ? 'Done' : 'Next'}</button>
      </div>
    </div>
  }>
    <section aria-live="polite" className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">Step {step + 1} of {STEPS.length}</p>
      <h2 className="text-xl font-bold">{STEPS[step][0]}</h2>
      <p className="leading-relaxed">{STEPS[step][1]}</p>
    </section>
  </ModalShell>;
}
