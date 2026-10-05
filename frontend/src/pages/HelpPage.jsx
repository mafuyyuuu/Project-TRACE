import MotionDetails from '@/components/MotionDetails';

/** Role-aware excerpts from docs/USER_MANUAL.md; no separate workflow rules. */
export default function HelpPage({ user }) {
  const desk = user?.desk_assignment;
  const entries = [
    ['Why has my password-reset email not arrived?', 'Enter your Student ID, Staff ID or current saved email on Forgot Password, select Send Reset Link, then confirm Request Link. The same receipt message appears for every request to protect account privacy; it does not confirm that mail was delivered. Check the registered inbox and Spam/Junk. If nothing arrives, give the request reference to the Registrar. Use only the newest link, which expires after one hour and works once. Staff without a saved email or inbox must contact the Registrar.'],
    ['How do Main and More navigation work?', 'Main contains daily work. Choose the four-square More button for the other pages available to your role, including Help / FAQ; Finance transactions remain in Main. Back to main restores the daily links. Preferences and Logout work in both sets. Direct links reveal their current page automatically. On short screens, scroll with touch, wheel/trackpad or keyboard; the hidden scrollbar does not remove any links.'],
    ['Where is the quick guide?', 'Select the question mark beside the theme button in the dashboard header to replay the floating tour for your role. It highlights controls and blurs the background. Use Next, Back, Finish tour or Skip. New student accounts and staff/Admin who have not received their tour get one automatic offer after required setup. Skipping, logout or a new browser does not reset it. Older student accounts can replay it manually.'],
    ['Where is authenticator two-factor setup?', 'Open your avatar → Edit Profile → Security → Two-factor authentication. Enter your current password and select Set up authenticator app. Scan the QR code, enter the app code, select Enable authenticator and confirm. Copy confirms only after clipboard access succeeds; if it fails, download or select and copy the codes manually. Download started means you should check your browser’s downloads to confirm completion. Save the codes privately, then select I saved my recovery codes; copy/download does not dismiss them. An enrolled account uses its app code or a recovery code at login; email resend cannot bypass it. If setup is unavailable, the administrator must complete the server configuration.'],
    ['How do messages and case attachments work?', 'Open Messages & Attachments and choose the request. Send or Enter sends a message immediately. Window 1 receives student messages and can reply. Registrar staff may request extra documents for that case; select a JPG, PNG or PDF up to 10 MB and confirm submission. The Registrar accepts it or requests resubmission with a reason. No extra document is required unless requested for that case.'],
    ['How do confirmations work?', 'Login and OTP verification submit directly without a confirmation dialog. A processing indicator appears while either request runs; errors appear in the form. Resend OTP becomes available after a 60-second countdown; use the newest emailed code. A small Loading… indicator shows shared API activity across pages. Other saves and submissions still require confirmation. Cancel keeps your draft. A failed action displays feedback so you can correct it and retry.'],
    ['How do I verify or change my email?', 'Open your avatar → Edit Profile → Personal Info. Choose Verify beside Email Address, then select Verify Email in the message sent to your inbox. The link works once and expires after one hour; check Spam/Junk and refresh TRACE after verifying. Enter the new email and current password to change addresses, choose Verify and confirm, then open the link sent to the new address. Your existing email stays active until verification succeeds. Email verification is separate from login codes.'],
    ['How do I change appearance and text size?', 'Open Preferences in the sidebar or mobile menu. Choose light or dark mode and a text size from 100% to 200%. Changes apply across TRACE immediately and are remembered on this browser. Printed documents keep their original formatting.'],
    ['When do notification popups close?', 'Acknowledge with OK, Escape or the backdrop. Feedback also closes on navigation, internal queue-tab changes or leaving the browser tab; drafts and pending decisions are kept.'],
    ['What does a new-browser alert mean?', 'TRACE recognized a browser that has not previously signed in to your account. Open Security to review activity. If you do not recognize the login, contact the Registrar immediately.'],
  ];
  if (user?.role === 'student') entries.unshift(
    ['Are Good Moral certificates available?', 'Good Moral certificates are no longer available for new requests. Earlier requests and their records remain accessible.'],
    ['What is the Diploma reissue fee?', 'The default is ₱250. Admin may configure a different fee, and the Secretary sets the final amount before payment.'],
    ['How do I request and track documents?', 'Choose New Request. If your saved profile is incomplete, use Complete Profile in the missing-field popup, fill the required fields and confirm Save. Select the available document types and complete their fields. TOR asks Year Started/Year Ended. Filing shows rates only; the final pricing breakdown appears on your dashboard. Confirm submission. Use Live Track to see the current processing stage; History includes request and payment records.'],
    ['When do I pay?', 'The Secretary sets the price after preparing the document. Use the single payment action for the request’s total, or present your payment slip at Finance.'],
    ['How do uploads work?', 'Picking a file creates a local preview. Upload happens when you confirm Save or Submit. Already submitted supporting files cannot be replaced through a general student replacement action.'],
    ['How do I read my ID and view the saved proof?', 'During signup, select your account type and proof, then choose Read ID. Review the extracted fields and enter missing details manually. OCR does not submit registration. Your saved registration proof appears read-only in Edit Profile.'],
    ['Can I request multiple copies or repeat a request?', 'All available documents allow repeat requests and varying quantities except Honorable Dismissal. Honorable Dismissal allows one copy; an active or completed request blocks another. Cancellation or a terminal rejection allows retry. A Secretary return to Intake keeps the same request active.'],
    ['Which walk-in transactions qualify for same-day handling?', 'CTC, 2nd Copy of COR, 2nd Copy of OGR and CAV qualify when you present the original and a photocopy of the required document at Window 1. The clerk records these checks. Evaluation, pricing, payment and release checks still apply.'],
  );
  if (user?.role === 'student' && user?.user_type === 'alumni') entries.unshift(
    ['Which ID do alumni use?', 'New alumni register and sign in with their Alumni ID. Existing alumni keep their current login identifier. If OCR cannot extract the Alumni ID, enter it manually.'],
    ['Why must I complete the Graduate Application?', 'Submit the Graduate Application before using the other alumni features. Its fields come from the Registrar’s configured form.']);
  if (['Window 1', 'Secretary'].includes(desk)) entries.unshift(
    ['How do I export records?', 'Open Reports & Export, apply filters, select an export option, then choose Export. The document export follows the current filters.'],
  );
  if (user?.role === 'admin' || ['Window 1', 'Secretary', 'Finance'].includes(desk)) entries.unshift(
    ['How do I view a student’s full profile?', 'Choose the student’s name in a request or report list. The profile includes saved personal and educational details. Names without a resolved identifier cannot open a profile.'],
  );
  if (desk === 'Window 1') entries.unshift(
    ['Where are Intake and Release?', 'Use the queue tabs beside the upload card. Check required paperwork during Intake. Release documents only after the Secretary’s receipt verification and handoff. Tracking Desk remains a separate destination.'],
    ['How do I return an intake request?', 'Open Intake Check, type clear correction notes, choose Return, and confirm. Missing notes prevent the return.'],
  );
  if (desk === 'Secretary') entries.unshift(
    ['How do I evaluate and price a request?', 'Review the actual document type and supporting attachment. Confirm your evaluation decision. Prepare the document, enter its price, and confirm before generating the payment slip.'],
    ['Must the Official Receipt be uploaded immediately?', 'No. Verify the physical Official Receipt handed over by Finance. A digital retained copy can be uploaded later; record the physical check before handoff to Window 1.'],
  );
  if (desk === 'Finance') entries.unshift(
    ['How do I record counter payments?', 'Record payment details and the actual Official Receipt number, or choose Later to defer issuance, then confirm. Receipt OCR is an aid; check its values yourself. New same-day OR issuance closes at 4:00 PM Manila time. Payment clearance sends an acknowledgment while the OR is pending.'],
    ['Can I issue or upload the receipt later?', 'Yes. Deferred OR upload requires the actual receipt number, issue date and digital copy. An existing recorded OR keeps its number. Students receive the digital copy when published; the issued receipt accompanies the document at release. Transactions & Export shows elapsed time waiting for an OR, without promising an issue deadline.'],
    ['How do I export Finance transactions?', 'Open Transactions & Export, filter cleared payments by date and receipt state, then choose Export CSV. A request with multiple documents appears once with its total payment.'],
  );
  if (user?.role === 'admin') entries.unshift(
    ['Can I restore Good Moral or change the Diploma fee?', 'Good Moral types are retired and cannot be restored or edited. Historical requests remain on record. Diploma starts with a ₱250 reissue default; its configured fee remains editable and the Secretary sets the final amount.'],
    ['How do I set document availability and fees?', 'In System Maintenance → Document Types, choose Edit, set the fee, student/alumni/both audience and allowed colleges, then Save Changes and confirm. No selected colleges means all. Review unknown college assignments in Accounts. Counter types CTC, 2nd Copy of COR, 2nd Copy of OGR and CAV start as inactive fee drafts; review fees and requirements before activating.'],
    ['Where do I manage accounts?', 'Open System Maintenance → Accounts. Review account details and edit the supported fields. IDs remain read-only. Staff deactivation and temporary-password controls retain their existing permissions.'],
    ['How do I review pending registrations?', 'Use Account Verification → Review, inspect the proof, choose Verify or Reject, then confirm the decision. Pending registrations also appear in the notification bell.'],
    ['How do I export records?', 'Open Reports & Export, apply filters, select an export option, then choose Export. The document export follows the current filters.'],
  );
  return <section className="trace-page w-full pb-6" aria-label="User Manual / FAQ">
    <h1 className="trace-page-title">User Manual / FAQ</h1>
    <p className="trace-page-description">Guidance for your TRACE account. Contact the PLP Registrar for unresolved record or account concerns.</p>
    {entries.map(([question, answer]) => <MotionDetails key={question} summary={question}>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 select-text whitespace-normal">{answer}</p>
    </MotionDetails>)}
  </section>;
}
