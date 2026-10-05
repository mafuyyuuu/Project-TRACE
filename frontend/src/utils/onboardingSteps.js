const STUDENT_STEPS = [
  { title: 'Start with your profile', target: 'tutorial-profile', area: 'profile', action: 'Open my profile', next: true,
    text: 'This is your Edit Profile button. Add your personal information and educational background. Missing-field markers and the progress bar show what remains; requests stay blocked until your saved profile is complete.' },
  { title: 'Verify your email', target: 'tutorial-email', area: 'email',
    text: 'Choose Verify beside Email Address, then click Verify Email in your inbox. The link works once and expires in one hour. Email confirmation is separate from ID approval. Changing your email also requires your current password.' },
  { title: 'Request documents', target: 'tutorial-new-request', area: 'dashboard',
    text: 'Use New Request to choose documents and copies. TOR uses Year Started and Year Ended. Rates here are for information; Secretary uses actual printed pages to prepare your final bill. Review your details before confirming.' },
  { title: 'Review and pay your bill', target: 'tutorial-requests', area: 'dashboard',
    text: 'Your requests appear here. When Secretary finishes pricing, the final itemized bill and payment action appear on this dashboard. Follow the payment instructions; Finance verifies your payment. A payment acknowledgment and the Official Receipt are separate.' },
  { title: 'Track and collect', target: 'tutorial-requests', area: 'dashboard',
    text: 'After filing a request, choose Live Tracking in its Action column. Follow the stages and respond to any rejection reason. Wait for the release notice and collection instructions before visiting Window 1.' },
  { title: 'Watch for updates', target: 'tutorial-notifications', area: 'dashboard',
    text: 'The bell shows payment, request and account updates. Open a notice to follow its link or see the related request.' },
  { title: 'Talk to Window 1', target: 'tutorial-support', area: 'dashboard', action: 'Open support',
    text: 'This button opens Support. Create a ticket even without a request, read an approved FAQ, or choose Talk to staff. Select a ticket to message; requested case documents appear as actionable bubbles. Your queue place is saved when you leave.' },
  { title: 'Protect your account', target: 'authenticator-heading', area: 'security',
    text: 'Edit Profile → Security contains password changes, other-device logout, security activity and Two-factor authentication. Scan the authenticator QR code or enter its manual key, and save your recovery codes. Preferences adjusts text size and theme.' },
  { title: 'Help is always nearby', target: 'tutorial-guide', area: 'dashboard',
    text: 'Use this question mark whenever you want to replay the tour. It opens automatically only once for a newly registered account. You can also ask Window 1 using chat.' },
];

const PROFILE = { title: 'Keep your account details current', target: 'tutorial-profile', area: 'profile', action: 'Open my profile', next: true,
  text: 'Use Edit Profile to check your contact information and change your photo using its camera. Save and confirm changes. If you have an email inbox, use Verify beside Email Address to confirm it by link.' };
const SECURITY = { title: 'Protect your staff account', target: 'authenticator-heading', area: 'security',
  text: 'Security contains Two-factor authentication, password changes and other-device logout. Save your authenticator recovery codes privately. Personal-browser trust is optional during login verification and ends at midnight Manila time; use shared-computer verification on school computers. Preferences changes text size and theme.' };
const UPDATES = { title: 'Watch for updates', target: 'tutorial-notifications', area: 'dashboard',
  text: 'The bell shows request and account updates. Read a notice and follow its link to the relevant task.' };
const HELP = { title: 'Replay this guide', target: 'tutorial-guide', area: 'dashboard',
  text: 'This question mark reopens the guide for your role. The automatic tour appears only once per account after required setup. Use Help / FAQ for instructions whenever you need them.' };
const nav = (tab, title, text) => ({ title, text, target: `nav:${tab}`, area: `navigation:${tab}`, action: `Open ${title}` });
const queue = text => ({ title: 'Work through your queues', target: 'tutorial-queues', area: 'dashboard', text });
const MESSAGES = nav('messages', 'Support', 'Select a ticket to read its conversation. Window 1 declares availability and claims the oldest ticket, one live slot per clerk. Send is immediate. Use the composer paperclip for authorized case documents; retained history stays tied to its ticket. Support settings and analytics are available to Admin and Window 1.');
const REPORTS = nav('reports', 'Reports & Export', 'Filter the report to the dates and records you need, review it and export the results. Dates and peso amounts appear in the report; exporting does not change a request.');

const WINDOW1_STEPS = [PROFILE, SECURITY,
  queue('Intake and Release hold different tasks. At Intake, open Review to check the student profile and submitted documents before confirming a decision. At Release, follow the ready-for-collection instructions and confirm only after the correct student receives their documents.'),
  nav('tracking-desk', 'Tracking Desk', 'Find a submitted request by its tracking number or scan its TRACE submission QR. Open its details to check its current stage before directing the student.'),
  MESSAGES, REPORTS, UPDATES, HELP];
const SECRETARY_STEPS = [PROFILE, SECURITY,
  queue('Open the request you are processing. Enter actual printed pages where required; Admin manages rates and TRACE calculates the final breakdown. Confirm the charge and handoff only after reviewing the documents. Records & Export includes a Secretary-cleared filter for work handed to Window 1 or released.'),
  MESSAGES, nav('grad-applications', 'Graduate Applications', 'Open an application to review the submitted alumni information, then use the available confirmed decision controls.'), nav('reports', 'Records & Export', 'Review your assigned college records. Secretary-cleared includes Ready for Pick-up and Completed; choose Completed only for released records. Review filters before exporting.'), UPDATES, HELP];
const FINANCE_STEPS = [PROFILE, SECURITY,
  queue('Review the final bill and submitted payment proof against Finance records before verifying payment. A payment acknowledgment is separate from the Official Receipt. If the OR is deferred, watch its elapsed waiting time and issue it when ready. Payments at or after 4:00 PM Manila time have no same-day OR.'),
  nav('reports', 'Transactions & Export', 'Open the Finance transaction report, choose filters and export the matching payment records. Check totals and receipt details before using the export.'),
  nav('messages', 'Support', 'Open authorized linked case conversations. General tickets, live queue claims, lifecycle management and document requirement requests belong to Registrar staff.'),
  UPDATES, HELP];
const ADMIN_STEPS = [PROFILE, SECURITY,
  { title: 'Review account applications', target: 'tutorial-account-review', area: 'dashboard',
    text: 'Review each identity proof together with the applicant type, Program/Course and College. An inconclusive OCR result needs manual review; it is not a counterfeit verdict. Open Review and confirm your decision after checking the supplied information.' },
  nav('admin-maintenance', 'System Maintenance', 'Manage accounts and reference data here. Admin controls default and college fee schedules. Confirm account changes and deactivations; for staff without email, use the initial authenticator setup after checking their identity.'),
  nav('admin-templates', 'Templates', 'Choose a template, review its isolated preview, then confirm a save when its wording and layout are correct. Existing saved templates remain in use until changed.'),
  nav('admin-tracker', 'Document Tracker', 'Check the request stage and history when investigating delays or helping another desk. Review the record before taking any available action.'),
  MESSAGES, nav('admin-reports', 'Reports & Export', 'Filter and review the report before exporting. Use Efficiency Analytics for measured workload and completion trends.'),
  nav('admin-security', 'Security Logs', 'Review account login and security events. Activity Logs also records administrative and workflow actions. Investigate unfamiliar activity without sharing credentials.'), UPDATES, HELP];
const OTHER_STAFF_STEPS = [PROFILE, SECURITY, nav('dashboard', 'Dashboard', 'Use the actions available to your assigned desk. Check the request details and confirm decisions only when the required work is complete.'), UPDATES, HELP];

export function getOnboardingSteps(user) {
  if (user?.role === 'admin') return ADMIN_STEPS;
  if (user?.role !== 'clerk') return STUDENT_STEPS;
  if (['Window 1', 'Receiving Desk'].includes(user.desk_assignment)) return WINDOW1_STEPS;
  if (user.desk_assignment === 'Secretary') return SECRETARY_STEPS;
  if (user.desk_assignment === 'Finance') return FINANCE_STEPS;
  return OTHER_STAFF_STEPS;
}
