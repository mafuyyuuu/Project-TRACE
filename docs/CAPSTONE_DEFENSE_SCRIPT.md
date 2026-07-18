# Project TRACE: Comprehensive Capstone Defense Script (3 Presenters)

**Estimated Time:** 15-20 minutes
**Roles:**
- **Speaker 1:** Formal greeting, Window 1 release demo, Admin AI Insights (Prophet & Random Forest), formal conclusion.
- **Speaker 2:** Problem statement, system architecture, Live Demo (Student, Finance). Highlights form dynamism and OCR AI.
- **Speaker 3:** Background of the study, comparison, scope and limitation, Secretary workflows.

---

## 🎬 Part 1: Introduction & Architecture (Speaker 1)
**(Setup: Display the Title Slide on the projector. Stand confidently. Ensure all servers (Frontend, Backend, AI Engine) are running locally.)**

**Speaker 1:** 
"Good day, respected panelists, our esteemed thesis adviser, and guests. We are the researchers behind TRACE, which stands for Tracking, Routing, and Automated Credential Engine. I am [Speaker 1 Name], and standing with me today are my co-researchers, [Speaker 2 Name] and [Speaker 3 Name]. 

Today, we present our study: An AI-Assisted Registrar Document Workflow System with Machine Learning and Process Recommendations. This is an AI-powered, centralized document routing and verification ecosystem, engineered specifically to modernize and optimize the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office.

**(Slide 1 & 2: Background of the Study & Comparison)**

**Speaker 1:**
"Thank you, [Speaker 1 Name]. Now, for a brief background of the study, the Registrar’s Office of Pamantasan ng Lungsod ng Pasig (PLP) serves as the custodian of student academic records and documents. Currently, the office employs a combination of conventional logbooks and semi-digital spreadsheets for record-keeping and document processing.

When comparing this current setup to our proposed system, the manual approach relies heavily on physical handoffs and physical verification. This often leads to processing delays, data entry errors, and a general lack of visibility into request progress. TRACE aims to modernize this by transitioning from manual logbooks to automated digital routing, and from manual data encoding to Intelligent Document Processing.

I will now pass the floor to [Speaker 2 Name] to discuss the specific problems we aim to solve."

**(Slide 3: Statement of the Problem)**

**Speaker 2:**
"Thank you, [Speaker 3 Name]. To understand the need for TRACE, we first examined the current operations of the PLP Registrar’s Office. At present, the office relies on a combination of manual logbooks, digital spreadsheets, and semi-digital workflows for processing document requests.

Based on our analysis, we identified several key operational challenges:
**First**, limited accessibility of registrar services. Students and alumni, particularly those located outside the campus, often need to visit the office personally to submit requests and follow up on their documents.
**Second**, manual encoding and information extraction. The heavy reliance on manual data entry increases the risk of encoding errors, duplicated information, and additional workload for registrar personnel.
**Third**, delays in document intake and workflow routing. The processing and movement of requests depend largely on manual procedures, which can slow down operations, especially during peak academic periods.
**Fourth**, limited visibility into request status. Once a request has been submitted, students and alumni have limited means of monitoring its progress, resulting in frequent follow-up inquiries.
**Finally**, the office currently has limited capability to analyze historical request data and forecast future workload demands, making it difficult to proactively plan for busy periods.

These challenges served as the basis for the development of TRACE.

I will now hand the floor back to [Speaker 3 Name] to establish our system's boundaries."

**(Slide 4 & 5: Scope and Limitation)**

**Speaker 3:**
"To establish the exact boundaries of our study, our scope is focused on four key functionalities: developing a cross-platform Web App, integrating OCR for data extraction, implementing automated workflow routing, and applying predictive analytics using Random Forest and Prophet.

However, the system acknowledges a few key limitations. Operationally, we strictly handle digital intake and analytics, while the generation and physical issuance of credentials remain exclusively with the registrar staff. Furthermore, the system is strictly for PLP students and alumni, excluding any third-party organizations. During this testing phase, we also utilize a simulated environment, meaning our predictive models use dummy datasets and the payment component relies on a demonstration account. Finally, because our OCR relies on AI, poor document quality or bad handwriting can naturally hinder its performance, in which case manual data entry serves as the necessary fallback.

I will now return the floor to [Speaker 2 Name] to explain how we built a system within these boundaries."

(Slide 6: System Architecture)

**Speaker 2:**
"TRACE operates on a modern, decoupled framework divided into three layers.

First, the Presentation Layer is our React Web App. It serves as the primary interface for students to submit requests and for registrar personnel to process them.

Second, the Application Layer acts as our core engine. A Node.js backend handles the primary requests, while an independent Python Flask microservice powers our AI. This includes using EasyOCR for data extraction and identity verification, and utilizing n8n for rule-based workflow routing. This layer also drives our analytics, using Prophet for volume forecasting and Random Forest to classify live queue metrics.

Finally, the Data Layer utilizes a MySQL database. It acts as our single source of truth, securely storing request records, payment statuses, and step logs. Together, these layers allow the system to output automated tracking, actionable workload forecasts, and intelligent process recommendations.

We will now transition to the Live System Demo to show you exactly how these technologies interact."

---

## 💻 Part 2: Live Demo - Student to Secretary Flow (Speaker 2)
**(Action: Switch from PowerPoint to the Web Browser. Have the login page open.)**

**Speaker 2:** 
"We will begin the demo at the Student Portal."

*(Action: Navigate to Registration Page)*

"Before a student can request anything, they must create an account. During registration, the student is required to upload their PLP Student ID. This is where our OCR AI performs its first critical task. Our Python API visually reads the uploaded ID to perform a strict identity verification—cross-matching the Pamantasan ng Lungsod ng Pasig institution name and the student number. This guarantees that fake accounts cannot enter the system."

*(Action: Admin quickly verifies the account. Log in as Student)*

"Once the Admin approves the account, the student logs in to request a document. Our forms are dynamic—for example, selecting a Transcript automatically calculates the fee based on attended semesters.

*(Action: Select Transcript of Records from the dropdown)*

"...the system dynamically adapts, asking for the 'Number of Semesters Attended'. It then automatically calculates the total price based on that logic. I'll input 8 semesters, which totals 200 pesos. The student pays via GCash, and I'll upload a screenshot of that payment receipt right here."

*(Action: Fill in the form, select a dummy receipt image, and click Submit.)*

"The moment we hit submit, the document enters our tracking pipeline. It is now strictly isolated in the **Pending Payment Verification** state. The student cannot bypass this, ensuring financial security. 

Let's switch perspectives. I'm going to log out and log in as the **Finance Officer**."

*(Action: Log out. Log in as `FINANCE001` with `trace2024`)*

"The Finance Desk has a highly focused workspace—they only see documents awaiting payment verification. Here is the students' request. When I open it..."
*(Action: Click on Ana's request to open the modal)*
"...the system displays the GCash receipt she uploaded. I can easily zoom in to verify the reference number. 
*Crucially*, if this receipt were fake or blurry, the clerk can use this text area to add 'Clerk Notes' and click the red 'Reject Payment' button. That note is immediately sent back to the student. But this receipt is valid, so I will click the green 'Verify Payment' button."

*(Action: Click Verify Payment.)*

"...The clerk simply reviews the GCash receipt and clicks verify, which solves the issue of students visiting the office with insufficient funds.

Once the payment is verified, our n8n orchestration engine intelligently routes the document. Because the requester is an IT student, the system deterministically routes the file strictly to the College of Computer Studies, rather than a general queue.

I will now pass the floor to [Speaker 3 Name], who will log in as the **CCS Secretary** to demonstrate this intelligent filtering in action."

*(Action: Log out. Log in as `SEC-CCS001` with `trace2024`)*

**Speaker 3:**
"Here is the Secretary Queue. When the secretary opens Ana's document, they aren't just looking at a basic form. They are presented with our **Split-Screen Evaluation interface**. If this were a physical document scanned into the system, our Python AI Engine would have run OCR (Optical Character Recognition) on it, extracting the text and pre-filling the input fields on the right. The Secretary simply compares the original image on the left with the AI-extracted data on the right, makes any minor human corrections, and clicks 'Approve'."

*(Action: Click Approve.)*

"The exact moment I click Approve, two things happen instantly in the background: A customized SMS is dispatched to Ana's mobile phone via the UniSMS API, and an Email is sent via Nodemailer, notifying her that the document evaluation is complete. 

I will now hand the floor to [Speaker 1 Name] to demonstrate the final release process and our powerful Admin AI Insights."

---

## 🧠 Part 3: Live Demo - Release & AI Insights (Speaker 3)

**Speaker 1:**
"Thank you, [Speaker 3 Name]. Panelists, we are now at the final step of the document's journey."

*(Action: Log out. Log in as `WINDOW1001` with `trace2024`)*

"I am now logged in as the **Window 1 Clerk**. Their sole responsibility is dispatching. They can see Ana's document is now flagged as 'Ready for Window 1'. 
When Ana physically arrives at the window and claims her TOR, the clerk simply clicks 'Release'. This updates the status to 'Completed' and fires a final SMS thanking the student. The lifecycle is complete, and it was entirely paperless."

*(Action: Click Release. Log out. Log in as `ADMIN001` with `trace2024`)*

"But what happens to the thousands of transactions generated by this system? This brings us to the **Registrar Admin Dashboard**. This is the command center of Project TRACE."

*(Action: Navigate to the Dashboard / AI Insights tab)*

"Because we log every single state change and timestamp in our database, we possess highly structured time-series data. We feed this data back into our Python AI Engine, which runs two specific machine learning algorithms.

First, you'll see this line chart. This is generated by a **Prophet forecasting model**. It analyzes historical traffic and predicts exactly how many document requests the Registrar will receive over the next 7 days. This allows the university to proactively allocate staff before peak seasons, like enrollment or graduation.

Second, below the chart, we have the **AI Insights Panel**. This uses a **Random Forest classification algorithm**. It constantly monitors queue metrics. If the AI detects that the Secretary Desk is holding 40% more documents than usual, it triggers a prescriptive alert on this dashboard, warning the Admin of a potential bottleneck *before* it actually causes a major delay.

Finally, we also utilize our AI during the very first step: Student Account Registration. When a student signs up and uploads their PLP ID, our OCR engine runs a strict **3-point cross-match verification**. It visually reads the ID and verifies:
1. The Institution Name (PLP).
2. The Student ID Number.
3. The specific College they selected in the dropdown. 

If an engineering student accidentally selects the College of Nursing, the AI detects the mismatch between the form and the physical ID, and flags the account for manual review. This guarantees that fake accounts cannot enter the system."

---

## 🎯 Part 4: Conclusion & Q&A (Speaker 3 & Team)
**(Action: Switch back to PowerPoint - Conclusion Slide)**

**Speaker 1:**
"To conclude, Project TRACE is not just a digital filing cabinet. By combining React, Node.js, and specialized Python Machine Learning models, we have built an intelligent, self-monitoring ecosystem. 

We successfully eliminated physical queues, drastically reduced the manual verification workload through OCR, and most importantly, we transformed raw university data into actionable, predictive intelligence for the administration. 

Project TRACE proves that the future of educational administration is proactive, highly transparent, and AI-driven.

Thank you very much for your time, your attention, and the opportunity to present our research. We now warmly open the floor to the panel for any questions, and we can gladly navigate through the system if you wish to see any specific features."

*(All 3 speakers stand ready. Keep the `ADMIN001` dashboard open in the background browser so you can easily show logs, registered users, or specific features if the panelists ask "Can you show me how...?")*
