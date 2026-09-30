/** Role-aware excerpts from docs/USER_MANUAL.md; no separate workflow rules. */
export default function HelpPage({ user }) {
  const desk = user?.desk_assignment;
  const entries = [
    ['How do confirmations work?', 'Review the confirmation before saving or submitting. Cancel keeps your draft. A failed action displays feedback so you can correct it and retry.'],
    ['How do I change my email?', 'Open your avatar → Edit Profile. Enter the new email and current password, save, then verify the six-digit code. Your existing email stays active until verification succeeds.'],
    ['How do I change appearance?', 'Open Preferences in the sidebar or mobile menu to choose light or dark mode. Your browser remembers the preference.'],
    ['When do notification popups close?', 'Acknowledge with OK, Escape or the backdrop. Feedback also closes on navigation, internal queue-tab changes or leaving the browser tab; drafts and pending decisions are kept.'],
    ['What does a new-browser alert mean?', 'TRACE recognized a browser that has not previously signed in to your account. Open Security to review activity. If you do not recognize the login, contact the Registrar immediately.'],
  ];
  if (user?.role === 'student') entries.unshift(
    ['Are Good Moral certificates available?', 'Good Moral certificates are no longer available for new requests. Earlier requests and their records remain accessible.'],
    ['What is the Diploma reissue fee?', 'The default is ₱250. Admin may configure a different fee, and the Secretary sets the final amount before payment.'],
    ['How do I request and track documents?', 'Choose New Request, select the available document types and complete their fields. Confirm submission. Use Live Track to see the current processing stage; History includes request and payment records.'],
    ['When do I pay?', 'The Secretary sets the price after preparing the document. Use the single payment action for the request’s total, or present your payment slip at Finance.'],
    ['How do uploads work?', 'Picking a file creates a local preview. Upload happens when you confirm Save or Submit. Already submitted supporting files cannot be replaced through a general student replacement action.'],
    ['How do I read my ID and view the saved proof?', 'During signup, select your account type and proof, then choose Read ID. Review the extracted fields and enter missing details manually. OCR does not submit registration. Your saved registration proof appears read-only in Edit Profile.'],
    ['Can I request multiple copies or repeat a request?', 'Repeatable documents allow quantities. Honorable Dismissal allows one copy; an active or completed request blocks another. Cancellation or a terminal rejection allows retry. A Secretary return to Intake keeps the same request active.'],
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
    ['How do I record counter payments?', 'Record the Official Receipt number and payment details, then confirm. Receipt OCR is an aid; check its values yourself.'],
    ['Can I upload the retained receipt later?', 'Yes. Give the physical Official Receipt to the College Secretary and upload the retained copy through the authorized deferred-OR action later.'],
  );
  if (user?.role === 'admin') entries.unshift(
    ['Can I restore Good Moral or change the Diploma fee?', 'Good Moral types are retired and cannot be restored or edited. Historical requests remain on record. Diploma starts with a ₱250 reissue default; its configured fee remains editable and the Secretary sets the final amount.'],
    ['How do I set document availability and fees?', 'In System Maintenance → Document Types, choose Edit, set the fee, student/alumni/both audience and allowed colleges, then Save Changes and confirm. No selected colleges means all. Review unknown college assignments in Accounts. Counter types CTC, 2nd Copy of COR, 2nd Copy of OGR and CAV start as inactive fee drafts; review fees and requirements before activating.'],
    ['Where do I manage accounts?', 'Open System Maintenance → Accounts. Review account details and edit the supported fields. IDs remain read-only. Staff deactivation and temporary-password controls retain their existing permissions.'],
    ['How do I review pending registrations?', 'Use Account Verification → Review, inspect the proof, choose Verify or Reject, then confirm the decision. Pending registrations also appear in the notification bell.'],
    ['How do I export records?', 'Open Reports & Export, apply filters, select an export option, then choose Export. The document export follows the current filters.'],
  );
  return <section className="space-y-5 max-w-3xl">
    <h1 className="text-2xl sm:text-3xl font-display font-black">User Manual / FAQ</h1>
    <p className="text-sm text-gray-600 dark:text-gray-300">Guidance for your TRACE account. Contact the PLP Registrar for unresolved record or account concerns.</p>
    {entries.map(([question, answer]) => <details key={question} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <summary className="cursor-pointer font-bold text-sm">{question}</summary><p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 select-text">{answer}</p>
    </details>)}
  </section>;
}
