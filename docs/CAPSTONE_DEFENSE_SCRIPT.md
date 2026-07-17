# Project TRACE: Comprehensive Capstone Defense Script (3 Presenters)

**Estimated Time:** 15-20 minutes
**Roles:**
- **Speaker 1 (The Visionary & Architect):** Handles the formal greeting, problem statement, technical stack overview, and the system architecture.
- **Speaker 2 (The Operator):** Executes the Live Demo specifically for the Student, Finance, and Secretary workflows. Highlights form dynamism and OCR AI.
- **Speaker 3 (The Strategist & Data Analyst):** Handles the Window 1 release, the Admin AI Insights (Prophet Forecasting, Random Forest), and the formal conclusion.

---

## 🎬 Part 1: Introduction & Architecture (Speaker 1)
**(Setup: Display the Title Slide on the projector. Stand confidently.)**

**Speaker 1:** 
"Good morning, respected panelists, our thesis adviser, and guests. We are [Group Name/Number]. I am [Speaker 1 Name], and joining me today are my co-researchers, [Speaker 2 Name] and [Speaker 3 Name]. 

Today, we are incredibly proud to present our capstone project: **Project TRACE** — an AI-powered, centralized document routing and verification system built specifically to modernize the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office.

**(Slide: The Problem / Pain Points)**

**Speaker 1:**
"To understand why we built TRACE, we first need to look at the current situation. Requesting a simple document, like a Transcript of Records, is currently a highly manual and disconnected process. We identified three major pain points:
1. **Physical Bottlenecks:** Students spend hours falling in line at multiple windows just to submit a form, and then queue again at the cashier to verify payments.
2. **Manual Processing Fatigue:** The registrar staff has to manually verify hundreds of physical forms and GCash receipts daily. This leads to human error, lost documents, and a massive backlog.
3. **Zero Transparency:** Once a student submits a request, it goes into a black box. They have no idea if it’s with the Secretary, the Dean, or ready for pickup unless they physically return to the campus to ask.

**(Slide: The Solution - Project TRACE Stack)**

**Speaker 1:**
"Project TRACE eliminates these bottlenecks by digitizing the entire lifecycle. To achieve this, we moved away from legacy PHP monoliths and implemented a modern decoupled microservice architecture. 

Our **Frontend** is built with React and Tailwind CSS for a highly responsive, app-like user experience. 
Our **Backend API** is powered by Node.js and Express, connected to a highly structured MySQL database utilizing connection pooling for speed. 
But what makes our system truly intelligent is our **independent Python AI Engine**. We built a custom Flask microservice that runs PyTorch and EasyOCR to visually read and validate documents. Finally, we use **n8n** as an orchestration layer for complex background tasks.

Instead of talking about it, we want to show it to you in action. I will now pass the floor to [Speaker 2 Name] to walk you through a live transaction."

---

## 💻 Part 2: Live Demo - Student to Secretary Flow (Speaker 2)
**(Action: Switch from PowerPoint to the Web Browser. Have the login page open.)**

**Speaker 2:** 
"Thank you, [Speaker 1 Name]. Good morning, panelists. Let's step into the shoes of a PLP IT student named Ana. 

*(Action: Type `STU2024001` and password `trace2024`, then click Login.)*

"Here is the **Student Dashboard**. Ana immediately sees her active requests and a history of her past documents. We designed this UI to be highly intuitive. Let's create a new request."

*(Action: Click 'New Request' button.)*

"Notice how the form is dynamic. If Ana requests a Diploma, she doesn't need to fill out much. But if she requests a Transcript of Records..."
*(Action: Select Transcript of Records from the dropdown)*
"...the system dynamically asks for the 'Number of Semesters Attended' and automatically calculates the total price based on that logic. I'll put 8 semesters, which totals 200 pesos. I'll upload a screenshot of my GCash payment receipt right here."
*(Action: Fill in the form, select a dummy receipt image, and click Submit.)*

"The moment we hit submit, the document enters our tracking pipeline. It is now strictly isolated in the **Pending Payment Verification** state. The student cannot bypass this. 

Let's switch perspectives. I'm going to log out and log in as the **Finance Officer**."
*(Action: Log out. Log in as `FINANCE001` with `trace2024`)*

"The Finance Desk has a very focused view—they only see documents awaiting payment verification. Here is Ana's request. When I open it..."
*(Action: Click on Ana's request to open the modal)*
"...the system displays the GCash receipt she uploaded. I can zoom in to verify the reference number. If the receipt was fake, we added a red 'Reject Payment' button that forces the clerk to type a reason, which is sent back to the student. But this looks good, so I will click the green 'Verify Payment' button."
*(Action: Click Verify Payment.)*

"Now that it's paid, the system intelligently routes the document. Because Ana is an IT student, her document does not go to a general pool. It goes strictly to the College of Computer Studies. Let's log in as the **CCS Secretary** to see this."
*(Action: Log out. Log in as `SEC-CCS001` with `trace2024`)*

"Here is the Secretary Queue. When the secretary opens Ana's document, they don't just see a basic form. They are presented with our **Split-Screen Evaluation interface**. 
If this were a physical document that was scanned in, our Python AI Engine would have run OCR (Optical Character Recognition) on it, extracting the text and pre-filling the fields on the right. The Secretary simply compares the original image on the left with the extracted data on the right, makes any minor corrections, and clicks 'Approve'."

*(Action: Click Approve.)*

"The moment I click Approve, two things happen instantly in the background: A customized SMS is dispatched to Ana's phone via the UniSMS API, and an Email is sent via Nodemailer, telling her the document is ready. 

I will now hand it over to [Speaker 3 Name] to show the final release and our powerful Admin AI Insights."

---

## 🧠 Part 3: Live Demo - Release & AI Insights (Speaker 3)

**Speaker 3:**
"Thank you, [Speaker 2 Name]. Panelists, we are now at the final step of the document's journey."

*(Action: Log out. Log in as `WINDOW1001` with `trace2024`)*

"I am now logged in as the **Window 1 Clerk**. Their sole responsibility is dispatching. They can see Ana's document is flagged as 'Ready for Window 1'. 
When Ana arrives at the window and claims her TOR, the clerk clicks 'Release'. This updates the status to 'Completed' and fires a final SMS thanking the student. The lifecycle is complete, and it was entirely paperless."

*(Action: Click Release. Log out. Log in as `ADMIN001` with `trace2024`)*

"But what happens to the thousands of transactions generated by this system? This brings us to the **Registrar Admin Dashboard**. This is the command center."

*(Action: Navigate to the Dashboard / AI Insights tab)*

"Because we log every single state change and timestamp in our `step_logs` database table, we possess highly structured time-series data. 
We feed this data into our Python AI Engine, which runs two specific machine learning algorithms.

First, you'll see this chart. This is generated by a **Prophet forecasting model**. It analyzes historical traffic and predicts exactly how many document requests the Registrar will receive over the next 7 days, allowing the university to allocate staff efficiently before peak seasons like graduation.

Second, below the chart, we have the **AI Insights Panel**. This uses a **Random Forest classification algorithm**. It constantly monitors the queue metrics. If the AI detects that the Secretary Desk is holding 40% more documents than usual, it triggers a prescriptive alert on this dashboard, warning the Admin of a potential bottleneck before it actually causes a delay.

Finally, we also utilize AI during student account registration. When a student signs up and uploads their PLP ID, our OCR engine runs a strict 3-point cross-match: It verifies the institution name, verifies the Student ID number, and mathematically checks if the College they selected matches the text printed on their ID. If it doesn't match, the account is flagged for manual review."

---

## 🎯 Part 4: Conclusion & Q&A (Speaker 3 & Team)
**(Action: Switch back to PowerPoint - Conclusion Slide)**

**Speaker 3:**
"To conclude, Project TRACE is not just a digital filing cabinet. By combining React, Node.js, and specialized Python Machine Learning models, we have built an intelligent ecosystem. 

We successfully eliminated physical queues, drastically reduced the manual verification workload through OCR, and most importantly, we transformed raw university data into actionable, predictive intelligence for the administration. 

Project TRACE proves that the future of educational administration is proactive, transparent, and AI-driven.

Thank you very much for your time and attention. We now warmly open the floor to the panel for any questions, and we can gladly navigate through the system if you wish to see any specific features."

*(All 3 speakers stand ready. Keep the `ADMIN001` dashboard open in the background browser so you can easily show logs, registered users, or specific features if the panelists ask "Can you show me how...?")*
