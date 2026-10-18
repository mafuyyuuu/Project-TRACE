# Project TRACE: Comprehensive Capstone Defense Script (3 Presenters)

**Estimated Time:** 15-20 minutes

> 📌 **Content reviewed: October 6, 2026.** The original three-presenter script and visual format are retained. Rehearse the matching deployed version with synthetic records and privately prepared credentials. The ticket redesign has local checks; include its demo only on the matching deployed revision. Use [CAPSTONE_DEFENSE_GUIDE.md](CAPSTONE_DEFENSE_GUIDE.md) for updated diagrams and the question bank.

**Roles:**
- **Speaker 1:** Formal greeting, Window 1 release demo, Admin AI Insights (Prophet and aggregate advice), formal conclusion.
- **Speaker 2:** Problem statement, system architecture, Live Demo (Student, Finance). Highlights form dynamism and OCR AI.
- **Speaker 3:** Background of the study, comparison, scope and limitation, Secretary workflows.

---

## 🎬 Part 1: Powerpoint Presentation
**(Setup: Display the Title Slide on the projector. Stand confidently. Check the matching frontend, API/database health and AI service. Complete demo-account password/MFA setup privately. Use the intended Docker/Caddy deployment or an isolated local demo; never demonstrate with real identity or payment records.)**

**Speaker 1:**
"Good day, respected panelists, our esteemed thesis adviser, and guests. We are the researchers behind TRACE, which stands for Tracking, Routing, and Automated Credential Engine. I am [Speaker 1 Name], and standing with me today are my co-researchers, [Speaker 2 Name] and [Speaker 3 Name].

Today, we present our study: An AI-Assisted Registrar Document Workflow System with Machine Learning and Process Recommendations. This is an AI-powered, centralized document routing and verification ecosystem, engineered specifically to modernize and optimize the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office.

**(Slide 1 & 2: Background of the Study & Comparison)**

**Speaker 3:**
"Thank you, [Speaker 1 Name]. Now, for a brief background of the study, the Registrar’s Office of Pamantasan ng Lungsod ng Pasig (PLP) serves as the custodian of student academic records and documents. Currently, the office employs a combination of conventional logbooks and semi-digital spreadsheets for record-keeping and document processing.

When comparing this current setup to our proposed system, the manual approach relies heavily on physical handoffs and physical verification. This often leads to processing delays, data entry errors, and a general lack of visibility into request progress. TRACE aims to modernize this by transitioning from manual logbooks to automated digital routing, and from manual data encoding to Intelligent Document Processing.

I will now pass the floor to [Speaker 2 Name] to discuss the specific problems we aim to solve."

**(Slide 3: Statement of the Problem)**

**Speaker 2:**
"Thank you, [Speaker 3 Name]. To understand the need for TRACE, we first examined the current operations of the PLP Registrar’s Office. At present, the office relies on a combination of manual logbooks, digital spreadsheets, and semi-digital workflows for processing document requests.

Based on our analysis, we identified several key operational challenges:
1. **Limited Accessibility of Registrar Services** – Students and alumni, particularly those located outside the campus, often need to visit the office personally to submit requests and follow up on their documents.
2. **Manual Encoding and Information Extraction** – The heavy reliance on manual data entry increases the risk of encoding errors, duplicated information, and additional workload for registrar personnel.
3. **Delays in Document Intake and Workflow Routing** – The processing and movement of requests depend largely on manual procedures, which can slow down operations, especially during peak academic periods.
4. **Limited Visibility into Request Status** – Once a request has been submitted, students and alumni have limited means of monitoring its progress, resulting in frequent follow-up inquiries.
5. **Limited Workload Analysis and Forecasting Capability** – The office currently has limited capability to analyze historical request data and forecast future workload demands, making it difficult to proactively plan for busy periods.

These challenges served as the basis for the development of TRACE.

I will now hand the floor back to [Speaker 3 Name] to establish our system's boundaries."

**(Slide 4 & 5: Scope and Limitation)**

**Speaker 3:**
"To establish the exact boundaries of our study, our scope is focused on four key functionalities: developing a cross-platform Web App, integrating OCR for data extraction, implementing automated workflow routing, and forecasting recorded request demand with Prophet and presenting descriptive aggregate advice.

However, the system acknowledges a few key limitations. Operationally, we strictly handle digital intake and analytics, while the generation and physical issuance of credentials remain exclusively with the registrar staff. Furthermore, the system is strictly for PLP students and alumni, excluding any third-party organizations. During this testing phase, we also utilize a simulated environment, meaning our predictive models use dummy datasets and the payment component relies on a demonstration account. Finally, because our OCR relies on AI, poor document quality or bad handwriting can naturally hinder its performance, in which case manual data entry serves as the necessary fallback.

I will now return the floor to [Speaker 2 Name] to explain how we built a system within these boundaries."

**(Slide 6: System Architecture)**

**Speaker 2:**
"TRACE operates on a modern, decoupled framework divided into three layers.

First, the Presentation Layer is our React Web App. It serves as the primary interface for students to submit requests and for registrar personnel to process them.

Second, the Application Layer acts as our core engine. A Node.js backend handles the primary requests, while an independent Python Flask microservice powers our AI. This includes using EasyOCR for data extraction and identity verification, and utilizing n8n for rule-based workflow routing. This layer also provides prototype analytics, using Prophet for recorded request-arrival forecasting and aggregate rules for observed queue/report advice.

Finally, the Data Layer utilizes a MySQL database. It acts as our single source of truth, securely storing request records, payment statuses, and step logs. Together, these layers allow the system to output automated tracking, actionable workload forecasts, and intelligent process recommendations.

We will now transition to the Live System Demo to show you exactly how these technologies interact."

---

## 💻 Part 2: Live Demo - Student to Secretary Flow
**(Action: Switch from PowerPoint to the Web Browser. Have the login page open.)**

**Speaker 2:**
"We will begin the demo at the Student Portal."

*(Action: Navigate to Registration Page)*

"Before filing a request, a student creates an account with an email and identity proof. The student enters identity details manually and uploads proof. The registration check compares school, identifier and college text. An inconclusive result stays pending for Admin review with a reason. This assists identity review; it cannot prove that an ID is genuine or that it belongs to the uploader."

"An alumnus with lost or unavailable proof can choose Records / proof unavailable and explain why.
That account stays pending, without an OCR check, until Admin records the alternative identity
evidence and decision. This is available in the production build; current students still upload
proof. We demonstrate it using synthetic records only."

*(Action: Admin quickly verifies the account. Log in as Student)*

"Once identity review is complete, the student fills the required saved profile and verifies email through the Profile button and a one-click inbox link. New alumni first submit the configured Graduate Application. Identity approval, email ownership and login MFA are separate checks.

*(Action: Show Profile completion, Email Verify and the role tutorial using a prepared account.)*

The floating tutorial highlights actual controls; the question mark replays it. In Profile, College and Program come from the approved catalog. PLP graduation and last attendance are separate fields; alumni must provide the applicable graduation year. We will now use a complete, verified synthetic student account to file a request."

*(Action: Select Transcript of Records from the dropdown)*

"...TOR displays the saved **Year Started** read-only, together with copies; Year Ended is not requested. Filing shows the configured per-page rate and applicable extra charges, **without an estimated total**. Study years do not determine printed pages; the final itemized amount appears after preparation and server pricing.

That is the single most important design decision in our system, so let me explain it before we go further. For page-based documents, the final charge needs the actual printed-page count. Admin manages the fee schedule, Secretary records the pages and the server calculates the amount. Flat-fee types follow their configured rule. The old way was to charge a fee up front and hope it matched. Ours does the work first and bills what the document actually cost. It also means a student never pays for something the office later finds it cannot issue."

*(Action: Submit the request without any payment step.)*

"The request enters the pipeline at **Pending Window 1 Intake**. Notice there was no checkout screen at all.

Let's switch perspectives. I'm logging in as the **Window 1 Clerk** — the counter students physically walk up to."

*(Action: Log out. Log in as `WINDOW1001` using privately prepared demo credentials and the required factor)*

"Window 1 sits at *both* ends of our pipeline. Here at the front is the **Intake Queue**: the first human look at every request. The clerk confirms the paperwork is there and readable.

The Waiting column measures elapsed time from the latest intake entry, using days and weeks for longer waits. A compact registration QR sits below Upload Document; applicants choose their type and can open a larger preview. It is separate from the payment-slip tracking QR.

This is also where walk-ins enter. A student with no internet can come to this counter and the clerk files the request for them — it enters exactly the same queue, unpaid, so a walk-in cannot skip its own evaluation or its bill. If they brought paper with them, the clerk scans it here and our Python OCR engine reads it, the same way it would an online upload."

*(Action: Open the intake check, then click 'Route to Secretary')*

"On approving intake, the request enters its college Secretary queue. Automatic document assignment is disabled in the approved deployment. If enabled later, the configured n8n workflow can assign the corresponding Secretary account; unassigned work uses college filtering if routing is unavailable. The server still enforces the college boundary. This is different from Vercel’s production-domain assignment setting.

I'll pass the floor to [Speaker 3 Name], logging in as the **CCS Secretary**."

*(Action: Log out. Log in as `SEC-CCS001` using privately prepared demo credentials and the required factor)*

**Speaker 3:**
"The Secretary has four working queues: Initial Evaluation, Processing & Pricing, OR Verification, and Final Handoff. Each represents a different action, and records/exports are scoped to the assigned college.

First, **Initial Evaluation**. Opening Ana's request presents our **Split-Screen Evaluation interface** — the scanned original on the left, the AI-extracted fields on the right. The Secretary compares them, corrects anything the OCR misread, and then does the thing that matters to the student: sets an **estimated ready date**. That date is required. It is sent straight to Ana by SMS and email, so she can plan around it instead of guessing."

*(Action: Set a ready date, click 'Accept for Processing'.)*

"Second, **Processing and Pricing**. The Secretary prints, signs and dry-seals the physical document — and *now* they know the page count, so now they can price it."

*(Action: Open the pricing modal.)*

"I enter the actual printed pages. The server uses the applicable saved Admin schedule, copies and itemized fees to calculate the final charge; rental, special and named items apply once per document type. The breakdown, pages and clerk identity are saved so a later rate change does not rewrite an old bill.

Notice the button says 'Save & Bill Student'. That is because this is the last document in Ana's request. If she had asked for a Transcript *and* a Diploma, pricing the first would just save quietly — we only bill when every document in the request has a price. Otherwise she would be sent to the Finance Office twice for one request."

*(Action: Click Save & Bill Student. The payment slip appears.)*

"Billing does three things at once: Ana gets an SMS and email with the amount, the Finance Office is told to expect it, and this **Order of Payment** slip is generated. The QR code carries the tracking number, so nobody at the Finance counter or at Window 1 has to retype it.

Ana now has two ways to pay. Let me show both. I'll hand to [Speaker 2 Name] at the Finance desk."

*(Action: Log out. Log in as `FINANCE001` using privately prepared demo credentials and the required factor)*

**Speaker 2:**
"The Finance Desk has two queues. **Awaiting Payment** is read-only — it shows what each student has been billed, so if someone walks up holding that printed slip, the clerk can answer them immediately.

If Ana pays online, she uploads her reference and receipt from her own dashboard and it lands in our verification queue. But suppose she walks in and pays cash at the cashier. The clerk records the payment details and either enters the issued Official Receipt or chooses Later to defer issuance. A payment acknowledgment is separate from the actual OR. That is what this form records."

*(Action: Open 'Log Counter Payment' and scan a receipt image.)*

"I can type the details, or scan the receipt and let our AI read it. This is the **third** use of OCR in our system, after document intake and ID verification at registration. It pulls the OR number, the amount and the date.

Two things worth noting. It deliberately takes the *largest* figure on the receipt, because a receipt lists line items before its total — taking a line-item amount could under-record a payment. This remains a heuristic, so the largest figure can also be wrong. And the fields stay editable: the clerk re-checks every one before saving. A misread amount here is a money error, so the AI assists the decision, it never makes it. If our AI engine is down entirely, this form still works by hand — there is a student standing at the counter either way."

*(Action: Confirm the fields, click Record Payment. Then open the Verification Queue.)*

"Logging a payment is not the same as clearing it. It moves into **Verification**, exactly where an online payment would — a walk-in is held to the same standard. The clerk cross-references against Finance's own records and approves.

*Crucially*: that click is the **only** place in our entire codebase that marks a document as PAID. The Secretary sets the price; Finance confirms the money. One person cannot do both, and that separation is what makes the money trail auditable.

Finance can clear payment while the OR is pending: the student receives an acknowledgment, then the digital OR when published. At exactly 4:00 PM Manila time, new same-day issuance closes. The current earliest-date rule uses the next calendar date, not a holiday calendar or a promised issuance time. The dedicated **Payment History** sidebar page keeps paid records separate from these dashboard queues. Its **From/To** filters still use inclusive Manila dates. **View OR** opens an available private copy; missing or deferred copies keep their own states and upload actions. **Export** uses the current filters. Elapsed receipt waiting time is informational.

For the release demonstration we will use an issued synthetic OR. Back to [Speaker 3 Name] for receipt inspection and handoff."

*(Action: Log out. Log in as `SEC-CCS001`.)*

**Speaker 3:**
"Third, **OR Verification**. The Secretary inspects the issued receipt against its recorded number, using the digital copy or an explicit physical-inspection acknowledgment. This is a paperwork check; it does not clear payment a second time.

*(Action: Inspect the synthetic OR and confirm verification.)*

Fourth, **Final Handoff**. Payment and receipt inspection are complete, but the printed document is still in the Secretary’s hands. This action records that the paper actually reached Window 1.

We made this a deliberate, separate step. Marking a document 'ready for pickup' while it is still sitting in a drawer is exactly the drift this whole system exists to eliminate."

*(Action: Click 'Handed to Window 1'.)*

I will now hand the floor to [Speaker 1 Name] to demonstrate the final release process and our powerful Admin AI Insights."

---

## 🧠 Part 3: Live Demo - Release & AI Insights

**Speaker 1:**
"Thank you, [Speaker 3 Name]. Panelists, we are now at the final step of the document's journey."

*(Action: Log out. Log in as `WINDOW1001` using privately prepared demo credentials and the required factor)*

"I am back at the **Window 1 Clerk** — the same desk we started at, now at the other end of the pipeline. Ana's document sits in the **Release Queue**.

Notice the Official Receipt number on the row. When Ana arrives, she presents the physical receipt Finance gave her, and the clerk checks it against what is on screen before letting the document go. Online payments also require the appropriate issued OR and recorded receipt check; a payment channel label is not a substitute for that inspection.

There is also a third view here — the **Tracking Desk** — which shows every document in the system at any stage. That is deliberate: this is the window a student walks up to and asks 'where is mine?', so it is the one queue we do *not* filter down.

When Ana claims her Transcript, the clerk clicks Release. That closes the request, fires a final SMS and email, and notifies the Secretary who prepared it that it was collected. Nine recorded stages, one audit trail, and timestamped transitions."

*(Action: Click Release. Log out. Log in as `ADMIN001` using privately prepared demo credentials and the required factor)*

"But what happens to the thousands of transactions generated by this system? This brings us to the **Registrar Admin Dashboard**. This is the command center of Project TRACE."

*(Action: Briefly show System Maintenance, Templates, Security Logs and Reports & Export.)*

“Admin maintains Registrar-approved programs, document availability and fee schedules. Templates provide isolated previews; Security contains authenticator settings and account activity. Reports show visible draft filters and Apply. Export at the upper right opens dataset/CSV options; KPI summaries and Records stay on the main page. Show student ID/name, college and document type filters, then reconcile the exported document count and amount. Secretary reports remain locked to their college; Finance keeps grouped payments on screen and expands their documents in the shared CSV. We preserve role permissions while using shared controls, dark mode, readable status colors and enlarged text.”

*(Action: If demonstrated, open only the messaging feature verified on this deployment.)*

“Support now uses one ticket workspace: approved FAQs first, explicit staff escalation, and a durable first-come queue with one live ticket per Window 1 clerk. Manila service calendars pause reply timers outside hours. Case-specific document bubbles preserve upload and replacement history. Files require ticket authorization. We will show these only on the matching deployed revision.”

**Optional live demo:** Create a synthetic ticket, open an FAQ, escalate, claim it from Window 1, and request a case document through the paperclip. Show its persisted state and private history after reload.

“Support analytics show observed waits, first response and resolution durations with sample counts and median/p90; unavailable data is not a fabricated zero. Aggregated support advice is descriptive and does not train on private conversations. Our local 100-user test saved all 100 messages with no duplicate or cross-user accepted messages; latest p95 was 558 ms for saves and 392 ms for reads. Matching staging and physical-device acceptance remain separate.”

*(Action: Navigate to the Dashboard / AI Insights tab)*

"Because we log every single state change and timestamp in our database, we possess highly structured time-series data. We feed this data back into our Python AI Engine, which runs two specific machine learning algorithms.

First, you'll see the forecast chart. Prophet fits complete Manila-day counts of requested documents, with actual zero days and exact document-type history, and predicts the next seven days. If unavailable, an explicitly labelled historical weekday average uses the same observed series. At least 14 complete days are required. No random baseline, type percentage or minimum-one volume is used. Forecast accuracy and staffing usefulness still require held-out real-history evaluation.

Second, the **AI Insights Panel** shows observed counts across every active document stage and its Manila snapshot time. Pending volume alone does not establish efficiency or delays. Document and Support Analytics send the loaded report’s aggregates to the existing AI service for descriptive advice beside the measured charts. No identities or chats are sent. Production no longer uses the four-coded-example Random Forest classifier; transparent sample-based rules do not claim validated staffing or causal predictions.

Finally, we also utilize our AI during the very first step: Student Account Registration. When a student signs up and uploads their PLP ID, our OCR engine runs a strict **3-point cross-match verification**. It visually reads the ID and verifies:
1. The Institution Name (PLP).
2. The Student ID Number.
3. The specific College they selected in the dropdown.

If an engineering student accidentally selects the College of Nursing, the AI detects the mismatch between the form and the physical ID, and flags the account for manual review. The account remains pending for Admin review when text checks are inconclusive. These checks do not guarantee authenticity or ownership."

---

## 🎯 Part 4: Conclusion & Q&A
**(Action: Switch back to PowerPoint - Conclusion Slide)**

**Speaker 1:**
"To conclude, Project TRACE is not just a digital filing cabinet. By combining React, Node.js, and specialized Python Machine Learning models, we have built an intelligent, self-monitoring ecosystem.

We connected filing, authorized evaluation, recorded fees, payment verification and release in one visible workflow. OCR assists reading and analytics provide advisory views. Claims about reduced queues, processing time or model accuracy must come from our actual study measurements, rather than this demo alone.

The next evaluation priorities are live acceptance, a restore rehearsal, measured capacity and validated AI performance. Staff remain responsible for institutional decisions.

Thank you very much for your time, your attention, and the opportunity to present our research. We now warmly open the floor to the panel for any questions, and we can gladly navigate through the system if you wish to see any specific features."

*(All 3 speakers stand ready. Keep the `ADMIN001` dashboard open in the background browser so you can easily show logs, registered users, or specific features if the panelists ask "Can you show me how...?")*


## Revision 2 Batch 10 — Support / Messaging UI

Support now follows the main TRACE Figma two-column layout, with aligned readable ticket rows, local search of loaded authorized metadata, contextual linked-case viewing, a labeled confirmed availability switch and a primary Window 1 claim action. Success feedback uses dismissible toasts; failures and confirmations remain in context. The compact widget preserves drafts across close/reopen. Digital evaluation separates discussion into a side panel or a mobile view without discarding either draft. Existing ticket/desk/college authorization, FAQ/reply/requirement actions, service hours and queue assignment remain; no new staff chat connection or unsupported presence/read/unread data is added.

See [README workflow walkthrough](../README.md#main-workflows) for the screenshots, walkthrough and local evidence. Batch 10 adds **no migration or environment variable**; [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) tracks required earlier migrations. These are repository changes for dev, not a claim that the live site is updated.

## Revision 2 Batch 11 — short analytics walkthrough

“Here, Support Analytics reports ticket service separately from document processing. These cards summarize recorded ticket volume, escalations, backlog, FAQ actions and staff episodes. Each card includes its cohort or denominator. The statistical table keeps median, p90, samples and missing measurements in minutes. No data does not mean zero, and service time excludes the Awaiting Student pause while wall time includes it. These demonstration records are synthetic; they illustrate the interface rather than measured institutional results.”

[Walkthrough and screenshots](../README.md#main-workflows).

## Optional internal-assistance demonstration — matching deployed revision only

*(Action: A desk clerk opens Support → Internal assistance, creates a synthetic concern and confirms. Admin opens the private queue and confirms Claim ticket.)*

“Staff concerns use a separate ticket queue. Each creator sees only their own concerns; Admin must claim a ticket before replying or managing it. Student Support remains visible to Admin for monitoring, without intervention. This asynchronous queue does not import student files or feed student support analytics.”

*(Action: Admin selects Await staff reply; Finance replies; Admin resolves with a note. Show retained history and confirm reopening.)*

“The assigned Admin is retained while awaiting the staff response. Resolution needs a recorded note, and reopening preserves history while returning the concern to the queue. Ordinary staff chat was initially deferred; the authorized implementation is demonstrated below. We distinguish these local checks from acceptance on the deployed database and devices.”

## Additional staff coordination demonstration — matching deployed revision

*(Action: Finance opens Support → Staff coordination, searches for a Secretary, enters a first message and confirms. Show the message in the Secretary account and reply.)*

“Staff now coordinate in a separate conversation category. The server selects eligible active desk recipients; students, Admin and self are excluded. Secretaries coordinate with peers from their own college and with Window 1 or Finance, without gaining cross-college student-record access. Existing student assistance remains in Support tickets.”

*(Action: Switch conversation categories and return to a drafted message. Show Admin monitoring the staff history without a composer.)*

“Category switches preserve drafts. Accepted message retries reuse the recorded message rather than duplicating it. Admin can monitor operational discussions but cannot intervene; staff concerns needing an Admin reply use Internal Assistance. These screenshots/local checks are separate from verification on the deployed database and devices.”

Integration demonstration note: Receiving Desk is Window 1’s legacy label, not another processing role. An assigned case cannot be taken over by changing the label. Linked case conversation access follows the college saved at routing. Open another notification while Support is already visible to show selection changes without restarting the workspace. Do not claim live delivery or migration completion from this local demonstration.


## Admin functional review walkthrough — 2026-10-12

Open **Support → Internal assistance** for staff concerns; Admin monitors operational student
conversations without replying. In **Efficiency Analytics**, switch between **Document
Efficiency** and **Support Analytics**; these use separate sources and reporting views.
**Scan Field Detection** is the average percentage of expected fields detected in scans,
not verified AI accuracy. Say: “The demo has three example scans detecting one, two and
three of the three fields, giving 66.7%. One new scan detecting all three changes the
combined result to 75%. The recorded-only result is shown separately. This demonstrates
the calculation; it does not establish text correctness or real-world accuracy.” With
demo off, no eligible recorded scans means **Not measured**. See
[measurement rules](AI_MODEL_EVALUATION.md#ocr-metric-correction).
In **System Maintenance → Accounts**, choose Students, open a
student/alumni and review the deactivate/reactivate confirmation. History and identity
verification remain; deactivation invalidates existing sessions. In any reporting role,
edit visible **Student ID / Name** and other filters, choose **Apply Filters**, then
**Export → Export CSV**. Fee and purpose details are readable; timestamps retain exact
Manila date/time. Secretary college scope and Finance complete payment groups remain.
This follow-up adds no migration. Screenshots use synthetic records; live deployment and
actual service outcomes are verified separately. Cosmetic redesign awaits the next Figma.


### Finance workflow follow-up — 2026-10-12

Finance pack setup/replacement uses first and last serial bounds that imply exactly 50 consecutive numbers. The server infers the changing numeric block and preserves zero padding/literals; replacement is audited without a clerk reason input. All previous reserved serials remain unavailable. Pack activation creates no receipt. Confirmed eligible payment verification automatically issues one OR and snapshots saved student identity/cashier/payment; Later defers the copy only. An immediate copy is validated and published atomically with clearance and issuance. The 4 PM Manila cutoff remains; explicit after-cutoff issuance can be completed from Payment History on an eligible later date. Printing/reprinting never allocates. Duplicate uploads on verification retry are discarded while the original published file is retained.

Verification owns receipt settings, printer calibration and receipt/pack audits. Payment History contains shared history filters, grouped cleared payments, View OR / Upload OR and missing-copy elapsed time; the exceptional Issue pending OR action prevents after-cutoff or historical payments from being stranded. History has no export/configuration block. Finance Reports & Export uses the same shared report component/API as the other roles, including applied-scope safeguards and readable CSV. Review contains no Discussion module; Support remains available.

Additive `migrate_student_name_parts.js` adds nullable first/middle/last profile fields and does not split old names or rewrite `users.full_name`, request names or issued snapshots. Students confirm matching identity parts in Edit Profile with the existing Save confirmation; the API validates against the saved full name under the profile lock and logs confirmation. Finance takes saved parts from the identified student, ignores client payor overrides and preserves unsplit historical names. New snapshots print Last name, First name M.I. Historical receipts keep their original name. Existing print fields/order remain; exact physical alignment still requires the original receipt reference and printer calibration.

Verification in this disconnected session covers source parsing and actual service/helper execution with in-memory model fixtures. Full Vitest, build/lint, browser and MySQL checks are pending; prepared source is not evidence of cloud deployment. See the consolidated [migration ledger](DEPLOYMENT_CHECKLIST.md) and [README walkthrough](../README.md#finance-receipt-walkthrough).

New signup collects first/middle/last fields, builds Full Name automatically and saves parts with the account in the registration transaction. Existing accounts confirm their unsplit names in Edit Profile; legacy API clients that send only Full Name remain supported. Read ID retains a detected full-name hint, fills other eligible empty fields and never guesses compound name boundaries. The new form requires first/last before confirmation; middle remains optional.


## 2026-10-13 — field limits and registration review

Demonstrate the phone field stopping excess digits, rejecting an incomplete/foreign number, and saving 09/+639 equivalents consistently. Show bounded whole copies/pages, centavo fee precision, and server rejection when UI validation is bypassed. Import Phone Number as Text for spreadsheets that display the CSV marker. Explain that an inconclusive college read leaves signup pending and prevents login until Admin reviews it; spacing tolerance does not skip college or ID checks. The review no longer shows a stray zero. Do not claim real-photo accuracy or live SMS delivery from local synthetic tests.


## 2026-10-13 — unclaimed pickup SMS reminders

Explain that normal Ready for Pickup handoff already requests SMS/email. Demonstrate the three-day and weekly schedule using synthetic dates, showing claimed exclusion, recipient batching and the persistent attempt ledger. Distinguish key configured, provider accepted, provider rejected and unknown delivery. No real message was sent in the coding environment; live provider delivery remains a deployment acceptance check.

### Current-student enrollment information

Current students save Year Level and Section in Educational Background. Both are
required by the saved-profile request gate and visible in authorized student lookup.
College graduation/last-attendance fields are alumni-only in the profile and are
not required for current-student requests. TOR still snapshots trusted Year Started;
its years never determine printed pages or prices. Alumni education, document
availability, graduate-application checks and existing historical values remain.
The additive `migrate_current_student_details.js` migration must precede the matching
API upgrade. This change is locally tested code, not a claim of live deployment.


### October 16 review correction

Student chat is reached through Support; the dashboard launcher is removed. Support Analytics is Admin-only in Efficiency Analytics and its API denies non-Admin actors, including Window 1. Operational tickets, support settings, archive rules, and actual billing transitions retain their existing permissions. The updated payment card uses saved fee snapshots and one amount/action per request group. Payment-slip preview supports printing or browser Save as PDF. Shared Preferences, selected-file feedback, centered phone dialogs, FAQ-only scrolling and paged record tables are local UI corrections; deployment and physical-device acceptance remain separate.

## October 17 UI demonstration addendum

“Each tab keeps its own login, while the backend independently checks every request. Signup and document filing retain drafts across three steps. Current students declare Regular or Irregular using the existing study-load field. After a confirmed save, authorized views refresh without a page reload. Admin can delegate an individual pending intake to a Secretary in the verified college; this does not grant unrestricted Window 1 access. Support guidance stays visible, and ticket controls retain their role rules. Our Figma review covers all 149 current source frames, with responsive, dark-theme and enlarged-text adaptations. These are local verification results, not a claim of production deployment or exact pixel parity for every state.”

## Registration preflight follow-up

Demonstrate a reserved Student ID blocked before leaving signup Academic Details. Explain that the public check returns availability only, has an independent rate limit and creates no reservation. Final validation and the unique database index still prevent concurrent duplicate accounts. Rejected applicants reuse their existing account. New Request Back preserves drafts/files, while only the first-step Cancel dismisses.

Latest Support demonstration: the i icon opens the authorized linked request; permitted ticket-action icons reveal their names on hover and retain confirmations. Guidance is below messages and the identity header has no internal scrolling. Window badges partition the loaded records into current work, completed and other statuses, with the list limit visible. Admin service failures show unavailable instead of an assumed empty queue.


## Admin PDF demonstration addendum

“Admin can now download a generated PDF from Reports & Export, or directly from Document and Support Analytics. We apply a period first, then open the downloaded file: its timestamp, filters, measured summaries, charts and complete matching tables remain readable outside the application. Available AI advice is labeled separately. Missing measurements stay explicit, and raw conversations and proof uploads are excluded. The PDF re-reads current saved data, includes up to 1,000 matching rows, and asks us to narrow larger scopes. Other reporting accounts retain their authorized CSV exports.”


## Forecast visibility, source evidence and accuracy — October 18

Open **Admin → Dashboard → 7-Day Volume Forecast**. The chart uses a solid line for the latest 14 complete days of recorded requests and a dashed green line for all seven future estimates. Dated numeric cards retain each day, including zero. Expand opens the same chart and **View forecast data source and daily counts**, which lists the complete aggregate model input with pagination. Snapshot time, exact type, day/sample count and method label distinguish Prophet, the historical weekday fallback and insufficient history. Current-day partial requests are excluded; predictions cover tomorrow through day seven in Manila time.

The source is `documents.created_at`, counted once per requested document (not once per student/request group or workflow action). The model sees dates/counts only, up to 90 complete days, with a 14-day minimum. Seeded/synthetic records in that database are also records; the code cannot certify their institutional provenance. `ai-engine/mock_data_gen.py` is an optional synthetic-data writer and must never be presented as a real Registrar dataset or run to manufacture validation evidence.

Defense wording: “Our prototype forecasts incoming document counts from recorded daily requests. We demonstrate the input counts, selected type, dated estimates and model/fallback label. Predictive accuracy on held-out real institutional data has not yet been established, so we do not claim an accuracy percentage.” Do not substitute scan field detection, successful software tests, forecast confidence or descriptive queue advice for measured model accuracy. OCR needs its own labeled-image/text/field evaluation; rule-based report advice has separate definitions and denominators.

For an accuracy study, freeze provenance-checked real history and use multiple chronological cutoffs, fitting only earlier data. Match the actual seven-day target and the production one-day gap: after the last complete training day, the simulated current day is excluded, and evaluate days 2–8 after that training cutoff. Compare dated actual vs predicted counts and the historical-weekday baseline over the same folds. Report MAE (documents/day), RMSE, tested dates/sample size and per-horizon errors, not an invented percent. Zero-demand days need suitable metrics rather than undefined percentage errors. This is an evaluation procedure, not an executed result. Prophet documentation: https://facebook.github.io/prophet/docs/diagnostics.html.


## Evaluate forecasting against saved history — October 18

Admin → Dashboard → 7-Day Volume Forecast → Expand → **Evaluate existing history** runs a read-only rolling-origin backtest for the selected exact document type. At least **22 complete Manila days** are required: 14 training days (the production minimum), one skipped simulated current day and seven unseen target days. More history supports up to five nonoverlapping weekly target windows. Only earlier rows enter each fit, using the same Prophet configuration/seed as the production forecast. The selected period, tested dates, training cutoffs, zero/nonzero samples, model version/settings and every actual/predicted/baseline value remain inspectable.

Report **MAE and RMSE in documents/day** and **WAPE as percent error**, alongside the historical-weekday baseline scored on exactly the same dates. WAPE is undefined when all target counts are zero. Do not convert these metrics into a generic accuracy percentage. Results can show Prophet is worse than the baseline; the interface preserves that result. Few folds/two weekly cycles or all-zero targets are limited evidence. Missing history/model failure produces no score. This validates the saved dataset only, not unseen institutional operations.

The data-origin panel identifies TRC-MOCK-prefixed generated records when present. Absence of that prefix does not certify real data: other synthetic records can exist. For defense, disclose provenance, train/test windows, tested samples and method. Forecast evaluation does not measure OCR accuracy or validate a Random Forest. Current queue recommendations are explicit workflow rules with concrete next steps for intake, evaluation, preparation/pricing, payment, OR/handoff and pickup; they require staff review and do not automatically assign staff or change requests. The earlier four-example classifier is not active.

Document-analytics advice is served from the same packaged analytics module and now includes a stage-specific suggested action when measured stage samples support a comparison. Saved measurements remain available during AI outages. Rebuild backend **and ai-engine**, then deploy the matching frontend; no migration/new dependency/environment variable is needed. Older images omitted analytics.py, which can cause both forecast fallback and unavailable document advice. Confirm both routes after deployment rather than inferring availability from an old screenshot.


### Graduate application academic selection
As a new alumnus, choose College first and Degree Program from its approved catalog, complete the configured questions, and confirm submission. Show the saved application and access refresh. Explain that the API independently checks active College/Program membership inside the save transaction; this application stores readable answer snapshots without changing the profile’s academic routing. Existing application answers remain readable. No new migration is required for this patch.
