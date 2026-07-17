# Project TRACE: Comprehensive Capstone Defense Script (3 Presenters)

**Estimated Time:** 15-20 minutes
**Roles:**
- **Speaker 1 (The Visionary & Architect):** Handles the formal greeting, problem statement, technical stack overview, and the system architecture.
- **Speaker 2 (The Operator):** Executes the Live Demo specifically for the Student, Finance, and Secretary workflows. Highlights form dynamism and OCR AI.
- **Speaker 3 (The Strategist & Data Analyst):** Handles the Window 1 release, the Admin AI Insights (Prophet Forecasting, Random Forest), and the formal conclusion.

---

## 🎬 Part 1: Introduction & Architecture (Speaker 1)
**(Setup: Display the Title Slide on the projector. Stand confidently. Ensure all servers (Frontend, Backend, AI Engine) are running locally.)**

**Speaker 1:** 
"Good morning, respected panelists, our esteemed thesis adviser, and guests. We are [Group Name/Number]. I am [Speaker 1 Name], and standing with me today are my co-researchers, [Speaker 2 Name] and [Speaker 3 Name]. 

Today, we are incredibly proud to present the culmination of our research and development: **Project TRACE**. This is an AI-powered, centralized document routing and verification ecosystem, engineered specifically to modernize and optimize the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office.

**(Slide: The Problem / Pain Points)**

**Speaker 1:**
"To truly understand the value of TRACE, we first need to examine the current reality. Requesting a simple document, like a Transcript of Records, is a highly manual, disconnected, and frustrating process. We identified three critical pain points:
1. **Physical Bottlenecks:** Students spend hours falling in line at multiple windows just to submit a form, and then queue *again* at the cashier to verify their payments.
2. **Manual Processing Fatigue:** The registrar staff is burdened with manually verifying hundreds of physical forms and GCash receipts daily. This inevitably leads to human error, misplaced documents, and a massive backlog.
3. **Zero Transparency:** Once a student submits a request, it goes into a 'black box'. They have absolutely no idea if their document is with the Secretary, the Dean, or ready for pickup unless they physically travel back to the campus to ask.

**(Slide: The Solution - Project TRACE Stack)**

**Speaker 1:**
"Project TRACE eliminates these bottlenecks by completely digitizing the document lifecycle. To achieve this, we moved away from traditional, monolithic architectures and implemented a modern, decoupled microservice approach. 

Our **Frontend** is built with React and Tailwind CSS, delivering a highly responsive, app-like user experience. 
Our **Backend API** is powered by Node.js and Express, connected to a robust MySQL database that utilizes connection pooling for high-speed, concurrent access. 
But what makes our system truly intelligent is our **independent Python AI Engine**. We built a custom Flask microservice running PyTorch and EasyOCR to visually read and validate uploaded documents. Finally, we integrated **n8n** as an orchestration layer for complex background tasks.

Instead of just talking about the architecture, we want to prove it to you in action. I will now pass the floor to [Speaker 2 Name] to walk you through a live transaction."

---

## 💻 Part 2: Live Demo - Student to Secretary Flow (Speaker 2)
**(Action: Switch from PowerPoint to the Web Browser. Have the login page open.)**

**Speaker 2:** 
"Thank you, [Speaker 1 Name]. Good morning, panelists. Let's step into the shoes of a PLP IT student named Ana. 

*(Action: Type `STU2024001` and password `trace2024`, then click Login.)*

"Here is the **Student Dashboard**. Ana immediately sees her active requests, her payment history, and a timeline of her past documents. We designed this UI to be highly intuitive. Let's create a new request."

*(Action: Click 'New Request' button.)*

"Notice how the form is dynamic. If Ana requests a Certificate of Enrollment, the form is simple. But if she requests a Transcript of Records..."
*(Action: Select Transcript of Records from the dropdown)*
"...the system dynamically adapts, asking for the 'Number of Semesters Attended'. It then automatically calculates the total price based on that logic. I'll input 8 semesters, which totals 200 pesos. Ana pays via GCash, and I'll upload a screenshot of that payment receipt right here."
*(Action: Fill in the form, select a dummy receipt image, and click Submit.)*

"The moment we hit submit, the document enters our tracking pipeline. It is now strictly isolated in the **Pending Payment Verification** state. The student cannot bypass this, ensuring financial security. 

Let's switch perspectives. I'm going to log out and log in as the **Finance Officer**."
*(Action: Log out. Log in as `FINANCE001` with `trace2024`)*

"The Finance Desk has a highly focused workspace—they only see documents awaiting payment verification. Here is Ana's request. When I open it..."
*(Action: Click on Ana's request to open the modal)*
"...the system displays the GCash receipt she uploaded. I can easily zoom in to verify the reference number. 
*Crucially*, if this receipt were fake or blurry, the clerk can use this text area to add 'Clerk Notes' and click the red 'Reject Payment' button. That note is immediately sent back to the student. But this receipt is valid, so I will click the green 'Verify Payment' button."
*(Action: Click Verify Payment.)*

"Now that it's paid, the system intelligently routes the document. Because Ana is an IT student, her document does not go into a massive, chaotic general pool. It is routed strictly to the College of Computer Studies. Let's log in as the **CCS Secretary** to see this intelligent filtering in action."
*(Action: Log out. Log in as `SEC-CCS001` with `trace2024`)*

"Here is the Secretary Queue. When the secretary opens Ana's document, they aren't just looking at a basic form. They are presented with our **Split-Screen Evaluation interface**. 
If this were a physical document scanned into the system, our Python AI Engine would have run OCR (Optical Character Recognition) on it, extracting the text and pre-filling the input fields on the right. The Secretary simply compares the original image on the left with the AI-extracted data on the right, makes any minor human corrections, and clicks 'Approve'."

*(Action: Click Approve.)*

"The exact moment I click Approve, two things happen instantly in the background: A customized SMS is dispatched to Ana's mobile phone via the UniSMS API, and an Email is sent via Nodemailer, notifying her that the document evaluation is complete. 

I will now hand the floor to [Speaker 3 Name] to demonstrate the final release process and our powerful Admin AI Insights."

---

## 🧠 Part 3: Live Demo - Release & AI Insights (Speaker 3)

**Speaker 3:**
"Thank you, [Speaker 2 Name]. Panelists, we are now at the final step of the document's journey."

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

**Speaker 3:**
"To conclude, Project TRACE is not just a digital filing cabinet. By combining React, Node.js, and specialized Python Machine Learning models, we have built an intelligent, self-monitoring ecosystem. 

We successfully eliminated physical queues, drastically reduced the manual verification workload through OCR, and most importantly, we transformed raw university data into actionable, predictive intelligence for the administration. 

Project TRACE proves that the future of educational administration is proactive, highly transparent, and AI-driven.

Thank you very much for your time, your attention, and the opportunity to present our research. We now warmly open the floor to the panel for any questions, and we can gladly navigate through the system if you wish to see any specific features."

*(All 3 speakers stand ready. Keep the `ADMIN001` dashboard open in the background browser so you can easily show logs, registered users, or specific features if the panelists ask "Can you show me how...?")*
