# Project TRACE: Comprehensive Capstone Defense Script (3 Presenters)

**Estimated Time:** 15-20 minutes

> 📌 **Content reviewed: October 6, 2026.** The original three-presenter script and visual format are retained. Rehearse the matching deployed version with synthetic records and privately prepared credentials. The ticket redesign has local checks; include its demo only on the matching deployed revision. Use [CAPSTONE_DEFENSE_GUIDE.md](CAPSTONE_DEFENSE_GUIDE.md) for updated diagrams and the question bank.

**Roles:**
- **Speaker 1:** Formal greeting, Window 1 release demo, Admin AI Insights (Prophet & Random Forest), formal conclusion.
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
"To establish the exact boundaries of our study, our scope is focused on four key functionalities: developing a cross-platform Web App, integrating OCR for data extraction, implementing automated workflow routing, and applying predictive analytics using Random Forest and Prophet.

However, the system acknowledges a few key limitations. Operationally, we strictly handle digital intake and analytics, while the generation and physical issuance of credentials remain exclusively with the registrar staff. Furthermore, the system is strictly for PLP students and alumni, excluding any third-party organizations. During this testing phase, we also utilize a simulated environment, meaning our predictive models use dummy datasets and the payment component relies on a demonstration account. Finally, because our OCR relies on AI, poor document quality or bad handwriting can naturally hinder its performance, in which case manual data entry serves as the necessary fallback.

I will now return the floor to [Speaker 2 Name] to explain how we built a system within these boundaries."

**(Slide 6: System Architecture)**

**Speaker 2:**
"TRACE operates on a modern, decoupled framework divided into three layers.

First, the Presentation Layer is our React Web App. It serves as the primary interface for students to submit requests and for registrar personnel to process them.

Second, the Application Layer acts as our core engine. A Node.js backend handles the primary requests, while an independent Python Flask microservice powers our AI. This includes using EasyOCR for data extraction and identity verification, and utilizing n8n for rule-based workflow routing. This layer also provides prototype analytics, using Prophet for workflow-event forecasting and Random Forest plus thresholds for queue insights.

Finally, the Data Layer utilizes a MySQL database. It acts as our single source of truth, securely storing request records, payment statuses, and step logs. Together, these layers allow the system to output automated tracking, actionable workload forecasts, and intelligent process recommendations.

We will now transition to the Live System Demo to show you exactly how these technologies interact."

---

## 💻 Part 2: Live Demo - Student to Secretary Flow
**(Action: Switch from PowerPoint to the Web Browser. Have the login page open.)**

**Speaker 2:**
"We will begin the demo at the Student Portal."

*(Action: Navigate to Registration Page)*

"Before filing a request, a student creates an account with an email and identity proof. Read ID suggests fields from readable text; the student checks them and enters missing information manually. The registration check compares school, identifier and college text. An inconclusive result stays pending for Admin review with a reason. This assists identity review; it cannot prove that an ID is genuine or that it belongs to the uploader."

*(Action: Admin quickly verifies the account. Log in as Student)*

"Once identity review is complete, the student fills the required saved profile and verifies email through the Profile button and a one-click inbox link. New alumni first submit the configured Graduate Application. Identity approval, email ownership and login MFA are separate checks.

*(Action: Show Profile completion, Email Verify and the role tutorial using a prepared account.)*

The floating tutorial highlights actual controls; the question mark replays it. In Profile, College and Program come from the approved catalog. PLP graduation and last attendance are separate fields; alumni must provide the applicable graduation year. We will now use a complete, verified synthetic student account to file a request."

*(Action: Select Transcript of Records from the dropdown)*

"...TOR asks for **Year Started and Year Ended**, together with copies. Filing shows the configured per-page rate and applicable extra charges, **without an estimated total**. Study years do not determine printed pages; the final itemized amount appears after preparation and server pricing.

That is the single most important design decision in our system, so let me explain it before we go further. For page-based documents, the final charge needs the actual printed-page count. Admin manages the fee schedule, Secretary records the pages and the server calculates the amount. Flat-fee types follow their configured rule. The old way was to charge a fee up front and hope it matched. Ours does the work first and bills what the document actually cost. It also means a student never pays for something the office later finds it cannot issue."

*(Action: Submit the request without any payment step.)*

"The request enters the pipeline at **Pending Window 1 Intake**. Notice there was no checkout screen at all.

Let's switch perspectives. I'm logging in as the **Window 1 Clerk** — the counter students physically walk up to."

*(Action: Log out. Log in as `WINDOW1001` using privately prepared demo credentials and the required factor)*

"Window 1 sits at *both* ends of our pipeline. Here at the front is the **Intake Queue**: the first human look at every request. The clerk confirms the paperwork is there and readable.

This is also where walk-ins enter. A student with no internet can come to this counter and the clerk files the request for them — it enters exactly the same queue, unpaid, so a walk-in cannot skip its own evaluation or its bill. If they brought paper with them, the clerk scans it here and our Python OCR engine reads it, the same way it would an online upload."

*(Action: Open the intake check, then click 'Route to Secretary')*

"On approving intake, the request enters its college Secretary queue. The configured n8n workflow can assign the corresponding Secretary account; unassigned work uses college filtering if routing is unavailable. The server still enforces the college boundary. This is different from Vercel’s production-domain assignment setting.

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

Finance can clear payment while the OR is pending: the student receives an acknowledgment, then the digital OR when published. At exactly 4:00 PM Manila time, new same-day issuance closes. The current earliest-date rule uses the next calendar date, not a holiday calendar or a promised issuance time. Finance’s transaction view shows elapsed waiting time and supports filtered exports.

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

“Admin maintains Registrar-approved programs, document availability and fee schedules. Templates provide isolated previews; Security contains authenticator settings and account activity. Reports place Export beside the header, then Filters, KPI summaries and Records. We preserve role permissions while using shared controls, dark mode, readable status colors and enlarged text.”

*(Action: If demonstrated, open only the messaging feature verified on this deployment.)*

“Support now uses one ticket workspace: approved FAQs first, explicit staff escalation, and a durable first-come queue with one live ticket per Window 1 clerk. Manila service calendars pause reply timers outside hours. Case-specific document bubbles preserve upload and replacement history. Files require ticket authorization. We will show these only on the matching deployed revision.”

**Optional live demo:** Create a synthetic ticket, open an FAQ, escalate, claim it from Window 1, and request a case document through the paperclip. Show its persisted state and private history after reload.

“Support analytics show observed waits, first response and resolution durations with sample counts and median/p90; unavailable data is not a fabricated zero. Aggregated support advice is descriptive and does not train on private conversations. Our local 100-user test saved all 100 messages with no duplicate or cross-user accepted messages; latest p95 was 558 ms for saves and 392 ms for reads. Matching staging and physical-device acceptance remain separate.”

*(Action: Navigate to the Dashboard / AI Insights tab)*

"Because we log every single state change and timestamp in our database, we possess highly structured time-series data. We feed this data back into our Python AI Engine, which runs two specific machine learning algorithms.

First, you'll see this line chart. This is generated by a **Prophet forecasting model**. It fits daily counts of step-log events and returns seven nonnegative integer predictions. Multiple events can belong to one document, so this is a workload-event proxy rather than a distinct-request forecast. The API does not return uncertainty bounds. Staffing use requires sufficient real history and held-out evaluation; a plausible line is not proof of accuracy.

Second, below the chart, we have the **AI Insights Panel**. This uses a **Random Forest classification algorithm**. It uses evaluation-queue count, release-queue count and today’s step-log count. The current prototype fits four coded examples and applies queue thresholds. Its recommendations are advisory; it has not established a learned 40% trend, optimal staffing or validated prediction accuracy.

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
