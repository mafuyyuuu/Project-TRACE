# Project TRACE: Ultimate Capstone Defense Guide 🎓

This guide is designed to help your team prepare for your final Capstone defense. It covers the core pitch, an in-depth breakdown of every technology, why each was chosen over alternatives, the DOs and DON'Ts of presenting, and a comprehensive bank of mock panel questions with scripted answers.

---

## 🎯 1. Core Pitch: What is Project TRACE?

*   **The Problem:** Traditional university registrar offices suffer from manual data entry bottlenecks, lost paperwork, lack of transparency in document queuing, and zero predictive capacity for volume spikes. Students have no idea where their document is in the pipeline, and administrators have no data-driven tools to manage workloads.
*   **The Solution:** Project TRACE (**Tracking, Routing, and Automated Credential Engine**) is an **AI-Assisted Registrar Document Workflow System** built for the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office. It digitizes physical paperwork using Optical Character Recognition (OCR), automates queue management via a strict Role-Based Access Control (RBAC) pipeline, sends real-time multi-channel notifications (SMS & Email), and uses Machine Learning to predict future document volume so the administration can allocate staff proactively.

---

## 🏗️ 2. Our Tech Stack (In-Depth Breakdown)

This section covers **what** each technology is, **how** it is used in our system, and **why** we chose it instead of alternatives. Memorize the "Why not alternatives" part — panelists love asking this.

### A. Frontend — React (Vite) + Tailwind CSS

| Aspect | Detail |
|:---|:---|
| **What it is** | React is a JavaScript UI library for building component-based interfaces. Vite is a modern build tool. Tailwind CSS is a utility-first CSS framework. |
| **How we use it** | We built a single unified `/dashboard` route that dynamically renders one of 5 different command centers (Student, Finance, Window 1, Secretary, Admin) based on the logged-in user's `role` and `desk_assignment`. Each portal has its own tabs, modals, and data grids — all wired to live API endpoints. |
| **Why React over plain HTML/JS?** | Our system has 5 role-based dashboards with complex interactive components (split-screen modals, live tracking timelines, dynamic forms). Plain HTML/JS would require manually managing DOM updates, leading to spaghetti code. React's virtual DOM and component model keep the codebase modular and maintainable. |
| **Why React over Angular or Vue?** | React has the largest ecosystem and community support, making it easier to find solutions for edge cases. Angular is heavier and opinionated (TypeScript-enforced, dependency injection), which is over-engineered for our use case. Vue is a valid alternative, but our team had more experience with React. |
| **Why Vite over Create React App (CRA)?** | CRA is officially deprecated and uses Webpack, which is significantly slower for development builds. Vite uses ES modules and Hot Module Replacement (HMR), giving us near-instant page reloads during development — critical when iterating on 5 different dashboards. |
| **Why Tailwind over Bootstrap or custom CSS?** | Bootstrap comes with pre-built components that look generic. Tailwind gives us full control to create a custom, modern UI (glassmorphism, custom gradients) without fighting against a framework's default design. It also purges unused CSS in production, resulting in a smaller file size than Bootstrap. |

### B. Backend — Node.js + Express

| Aspect | Detail |
|:---|:---|
| **What it is** | Node.js is a JavaScript runtime built on Chrome's V8 engine. Express is a minimal web framework for building REST APIs. |
| **How we use it** | Express acts as our **API Gateway**. It handles JWT authentication, file uploads via Multer, all CRUD operations against MySQL, proxies requests to the Python AI Engine, and dispatches SMS/Email notifications. It also exposes webhook endpoints for n8n. |
| **Why Node.js over PHP (Laravel)?** | Node.js uses non-blocking I/O, making it excellent for handling concurrent API requests (e.g., multiple clerks verifying payments simultaneously). PHP traditionally uses a request-per-thread model. Also, using JavaScript on both frontend and backend reduces context-switching for our team. |
| **Why Node.js over Django (Python)?** | We already need Python for our AI Engine (EasyOCR, PyTorch). If we also used Python for the web server, the heavy ML libraries would bloat the main API process and slow down simple CRUD operations. By separating them into microservices, the Node.js API stays lightweight and fast, while the Python AI Engine independently handles the compute-heavy OCR tasks. |
| **Why Express over Fastify or Hapi?** | Express is the most mature and widely-used Node.js framework with the largest middleware ecosystem (Multer, CORS, JWT). Fastify is faster in benchmarks but has a smaller community and fewer tutorials. For a university capstone, developer velocity and documentation availability matter more than raw benchmark performance. |

### C. Database — MySQL (v8)

| Aspect | Detail |
|:---|:---|
| **What it is** | MySQL is a relational database management system (RDBMS) that organizes data into structured tables with defined relationships. |
| **How we use it** | We maintain 4 core tables: `users` (accounts with role-based access), `documents` (the tracked document requests with status fields), `step_logs` (a global audit trail recording every action taken by every desk), and `notifications` (in-app alerts). We use connection pooling for performance. |
| **Why MySQL over MongoDB (NoSQL)?** | Our data is highly relational — every document belongs to a student, every step log references a document and a clerk, notifications reference a user. Relational databases enforce referential integrity via foreign keys. MongoDB would require us to manually maintain data consistency, which is risky for a document tracking system where audit accuracy is critical. |
| **Why MySQL over PostgreSQL?** | Both are excellent relational databases. We chose MySQL because it is the most widely taught database in Philippine CS/IT programs, making it easier for our entire team to contribute. PostgreSQL has more advanced features (JSONB, full-text search), but MySQL 8 supports JSON columns (which we use for `ocr_extracted_data`) and meets all our requirements. |
| **Why raw SQL over an ORM (Sequelize/Prisma)?** | ORMs add abstraction that can obscure performance issues. For a system where we need precise control over queries (e.g., joining `documents` with `step_logs` for the admin audit trail), raw parameterized SQL gives us full transparency and prevents the "N+1 query problem" that ORMs can silently introduce. |

### D. AI Engine — Python, Flask, EasyOCR (PyTorch), Prophet, Scikit-Learn

| Aspect | Detail |
|:---|:---|
| **What it is** | A dedicated Python microservice exposing REST endpoints for OCR text extraction, document verification, volume forecasting, and prescriptive recommendations. |
| **How we use it** | The Node.js backend proxies requests to 4 Flask endpoints: `POST /ocr/extract` (reads uploaded documents), `POST /ocr/verify` (verifies student IDs during registration), `GET /forecast` (7-day Prophet predictions), and `GET /ai/recommend` (Random Forest queue insights). |
| **Why EasyOCR over Tesseract?** | EasyOCR is built on PyTorch deep learning models, giving it significantly better accuracy on varied fonts, lighting conditions, and slightly rotated/skewed images — common when students photograph GCash receipts or clearance forms with their phone cameras. Tesseract is rule-based and struggles with these real-world conditions. |
| **Why Prophet over ARIMA or LSTM?** | Prophet was specifically designed by Meta (Facebook) for business time-series data with weekly/yearly seasonality. ARIMA requires manual parameter tuning (p, d, q) and stationarity testing. LSTM neural networks require large datasets and GPU training. Prophet works well out-of-the-box with our seeded historical data and automatically detects weekly registration patterns (e.g., more requests on Mondays). |
| **Why Random Forest over a simple threshold/rule-based system?** | A rule-based system (e.g., "if queue > 5, show warning") is brittle and requires manual tuning for every desk. Random Forest can learn non-linear relationships between multiple features (queue depth, time of day, day of week, clerk availability) and generate more nuanced, context-aware recommendations. |
| **Why Flask over FastAPI?** | Flask is simpler and more lightweight. Our AI endpoints are straightforward request-response patterns (upload image → get text). We don't need FastAPI's async capabilities or automatic OpenAPI docs for this internal microservice. Flask's lower overhead means faster cold-start times. |

### E. Workflow Orchestration — n8n

| Aspect | Detail |
|:---|:---|
| **What it is** | n8n is a self-hosted, open-source workflow automation tool that connects events and actions via visual node-based workflows. |
| **How we use it** | We use n8n to handle the conditional document routing logic. When a document status changes (e.g., Finance approves payment), the backend sends a webhook to n8n, which visually routes the document to the next correct desk based on document type and institutional rules. |
| **Why n8n over hardcoding the logic in Node.js?** | Institutional routing rules change frequently (e.g., "Starting next semester, Diploma requests must also pass through the Dean's Office"). With n8n, the Registrar Admin can visually update the workflow without touching code. Hardcoding these rules in Express would require a developer for every policy change. |
| **Why n8n over Zapier or Make?** | Zapier and Make are cloud-hosted SaaS platforms that charge per execution and send your data to third-party servers. n8n is **self-hosted** — all data stays on the university's own server. This is critical for student privacy compliance (Data Privacy Act of 2012 / RA 10173). It also runs for free via Docker. |

### F. Notifications — UniSMS + Nodemailer

| Aspect | Detail |
|:---|:---|
| **What it is** | UniSMS is an SMS gateway API. Nodemailer is a Node.js library for sending emails via SMTP. |
| **How we use it** | When the College Secretary evaluates a document or Finance verifies a payment, the backend dispatches **concurrent** SMS and Email alerts to the student using their stored `phone_number` and `email` from the `users` table. |
| **Why both SMS and Email?** | Not all students check their email regularly, and not all students have mobile data for email push notifications. SMS guarantees delivery to basic phones. Email provides a written record with more detail. Dual-channel ensures no student misses a critical update like "Your TOR is ready for pickup at Window 1." |
| **Why UniSMS over Twilio or Semaphore?** | UniSMS provides affordable SMS credits for Philippine mobile networks (Globe, Smart, TNT, Sun) with a simple REST API. Twilio is more expensive and optimized for US/international numbers. Semaphore is a valid alternative, but UniSMS offered better pricing for our test volume. |

### G. Security Stack — JWT + Bcrypt + RBAC

| Aspect | Detail |
|:---|:---|
| **What it is** | JWT (JSON Web Tokens) for stateless authentication, Bcrypt for password hashing, and Role-Based Access Control for authorization. |
| **How we use it** | On login, the backend verifies the hashed password with Bcrypt and issues a JWT token containing the user's `role` and `desk_assignment`. Every subsequent API request includes this token. The backend middleware decodes it and blocks unauthorized access (e.g., a Student cannot call the Finance verification endpoint). The frontend also reads the role from the token to decide which dashboard to render. |
| **Why JWT over sessions?** | JWT is stateless — the server doesn't need to store session data in memory. This is better for microservice architectures because the Python AI Engine and n8n can also validate the same token without sharing a session store. |
| **Why Bcrypt over SHA-256?** | SHA-256 is a fast hash, which is actually bad for passwords — attackers can brute-force billions of SHA-256 hashes per second. Bcrypt is intentionally slow and includes a salt, making it resistant to rainbow table attacks and brute-force. |

---

## 🧠 3. Defending the AI & Machine Learning Features

Your panel will heavily scrutinize the "AI" part of your title. Here is exactly how to defend each module:

### A. The OCR Intake Engine (EasyOCR)
*   **What it does:** Scans physical walk-in documents (e.g., Honorable Dismissal clearances, Student IDs) and converts the text into structured digital data.
*   **How to defend it:** "We used **EasyOCR** (built on PyTorch deep learning) because it is a highly robust, pre-trained model that excels at reading varied fonts and real-world image conditions. We didn't need to train it from scratch; we wrote Python logic to cross-reference the extracted text against the requested document type and log an `ai_verified` or `ai_flagged` status."
*   **Fallback:** "If the OCR `confidence_score` is below our threshold, the system flags the document for manual College Secretary review via the Split-Screen Evaluation Modal. The AI assists, but the human is always the final decision-maker."

### B. The 7-Day Volume Forecast (Prophet)
*   **What it does:** Predicts how many document requests the Registrar will receive over the next 7 days.
*   **How to defend it:** "We used **Prophet** because it is specifically designed by Meta (Facebook) for time-series forecasting with automatic weekly seasonality detection. We seeded our database with historical step logs using `mock_data_gen.py`, which gave Prophet enough data to produce reliable predictions. The Registrar Admin can use these forecasts to schedule more clerks on predicted busy days."
*   **Data source:** "The model is trained on historical timestamps from the `step_logs` table — every time a document moves through the pipeline, that timestamp becomes training data."

### C. The Administrative Insights (Random Forest)
*   **What it does:** Generates prescriptive UI alerts (e.g., "Secretary Queue Alert: 5 documents pending — consider redistributing workload").
*   **How to defend it:** "We utilized a **Random Forest** classification algorithm via Scikit-Learn to analyze current queue metrics (depth per desk, avg processing time, time of day). The model prescribes actionable insights rather than just displaying raw numbers, transforming the Admin dashboard from a passive monitor into a proactive decision-support tool."

---

## ✅ 4. DOs and ❌ DON'Ts for the Live Demo

### DOs
*   **DO follow a strict script for the live demo.** Unscripted clicking leads to errors. Practice this exact flow: *Log in as Student → Request a Document → Upload GCash → Log in as Finance → Verify Payment → Log in as Secretary → Show Split-Screen OCR Evaluation → Log in as Window 1 → Release → Show the SMS/Email notification → Log in as Admin → Show Forecast & AI Insights.*
*   **DO highlight the pain point FIRST.** Start the presentation by reminding them how slow, paper-based, and frustrating the current registrar queueing system is. Show a before/after comparison. TRACE is the direct solution.
*   **DO divide and conquer questions.** If a panelist asks about the database, the backend dev should answer. If it's about the UI, let the frontend dev answer. Don't talk over each other.
*   **DO acknowledge limitations gracefully.** If they suggest a feature you don't have, say: *"That's an excellent point for scalability. For our MVP, we focused heavily on the core document routing, but that would be our very next feature in Version 2."*
*   **DO mention data privacy.** Proactively mention that n8n is self-hosted (no third-party data exposure) and all passwords are hashed with Bcrypt. Panelists are impressed when you think about compliance.

### DON'Ts
*   **DON'T get defensive.** If a panelist critiques a feature or finds a flaw, thank them. (e.g., *"That's a great observation, we didn't account for that specific edge case. We will note that down."*)
*   **DON'T panic if a bug happens.** If something errors out during the demo, stay calm. Say, *"It looks like we are hitting a slight environment snag, but the intended flow here routes the document to Finance."* Move on smoothly.
*   **DON'T read straight from the screen.** Maintain eye contact with the panelists. The screen is for *them* to look at. You should know the system by heart.
*   **DON'T make up technical answers.** If asked a highly technical question you don't know, say: *"I would need to consult our documentation on that specific library, but the general concept is..."*
*   **DON'T say "we just used it because it was easy."** Always frame your answer as a deliberate decision: *"We chose X over Y because..."*

---

## ❓ 5. Mock Panel Questions & Scripted Answers

### 🏗️ Architecture & Tech Stack Questions

**Q1: Why did you build the AI backend in Python instead of Node.js?**
> "Node.js is fantastic for handling concurrent web requests, but Python is the undisputed industry standard for Machine Learning and AI — libraries like PyTorch, EasyOCR, Scikit-Learn, and Prophet are all Python-native. By splitting them into separate microservices, each service does what it is best at. The Node.js API stays lightweight for fast CRUD operations, while the Python Flask service independently handles the compute-heavy OCR and ML tasks without blocking the main server."

**Q2: Why MySQL and not MongoDB? Wouldn't a NoSQL database be more flexible?**
> "Our data is inherently relational. Every document belongs to a student, every step log references a document and a clerk, every notification links to a user. MongoDB would require us to manually embed or reference these relationships, risking data inconsistency. MySQL enforces referential integrity through foreign keys — if we try to create a step log for a non-existent document, the database itself will reject it. For a mission-critical audit trail system, that guarantee is non-negotiable."

**Q3: What is a microservice architecture and why did you use it?**
> "A microservice architecture means splitting the system into independent services that communicate via APIs. Our system has three: the Node.js API Gateway, the Python AI Engine, and the n8n Orchestrator. This design means if the AI Engine crashes due to a heavy OCR job, the main API and all the dashboards continue running normally. It also allows us to scale them independently — for example, we could deploy the AI Engine on a GPU server while keeping the API on a cheaper instance."

**Q4: Why Vite instead of Webpack or Create React App?**
> "Create React App is officially deprecated by the React team. Vite uses native ES modules and provides Hot Module Replacement that is 10-20x faster than Webpack during development. For a project with 5 different dashboards that we constantly iterate on, that speed difference saves us hours of development time."

**Q5: Why did you use n8n instead of just putting the routing logic inside your Node.js code?**
> "Institutional routing rules change. For example, next semester, the Dean's Office might need to approve Diploma requests before they go to Window 1. With n8n, the admin can visually update the workflow without touching any code. If we hardcoded these rules in Express, every policy change would require a developer to modify, test, and redeploy the backend. n8n also provides a visual audit trail of every workflow execution, which is useful for debugging."

### 🤖 AI & Machine Learning Questions

**Q6: What happens if a student uploads a blurry image and the OCR fails?**
> "Our AI engine returns a `confidence_score` for every extraction. If the score is below our threshold, the system flags the document as `ai_flagged` instead of `ai_verified`. The College Secretary will then see this flag in the Split-Screen Evaluation Modal — the scanned image on the left, editable fields on the right — and can manually correct the extracted data. The AI assists and accelerates the process, but the human is always the final decision-maker."

**Q7: How did you train your Prophet forecasting model? Where did the training data come from?**
> "We seeded our database with realistic historical data using a Python script called `mock_data_gen.py`. This script generates thousands of `step_log` entries with timestamps spread across weeks, simulating real-world patterns like higher volume on Mondays and lower volume on weekends. Prophet then trains on these timestamps. In production, the model would continuously improve as real student requests generate organic training data."

**Q8: How accurate is your volume forecast? Did you validate it?**
> "Prophet provides a forecast with upper and lower confidence bounds (yhat_upper and yhat_lower) which we display on the Admin dashboard's spline chart. We validated the model by splitting our seeded data into training and test sets and comparing predicted vs. actual values. The model captures weekly seasonality well, which is the most important pattern for staffing decisions."

**Q9: Your system title says 'AI-Assisted' — is the OCR really AI or just pattern matching?**
> "EasyOCR is built on top of PyTorch, which is a deep learning framework. It uses a combination of a CRAFT text detection model and a CRNN (Convolutional Recurrent Neural Network) recognition model — both are genuine neural networks. This is fundamentally different from pattern matching or regex. The model can recognize text it has never seen before, handle varying fonts, and tolerate skewed images. That is precisely what makes it AI."

**Q10: What is Random Forest and why is it suitable for your recommendations engine?**
> "Random Forest is an ensemble machine learning algorithm that builds multiple decision trees and aggregates their outputs. We chose it for generating admin recommendations because it handles multiple input features well (queue depth, average processing time, time of day, day of week) and is resistant to overfitting. Unlike a simple if-else rule, it can learn complex, non-linear patterns — for example, detecting that queue backlogs are most dangerous on Friday afternoons, not just when the count exceeds a threshold."

### 🔐 Security & Data Privacy Questions

**Q11: Is the system secure? What security measures did you implement?**
> "Yes. We implemented three layers of security: (1) **Authentication** — passwords are hashed with Bcrypt, a deliberately slow hashing algorithm resistant to brute-force attacks. Login returns a JWT token. (2) **Authorization** — every API endpoint checks the JWT's embedded `role` and `desk_assignment`. A Window 1 Clerk cannot access Finance endpoints. (3) **Data Protection** — all SQL queries use parameterized inputs to prevent SQL injection, and n8n is self-hosted to prevent student data from leaving the university's server. We are also aligned with RA 10173 (Data Privacy Act of 2012)."

**Q12: How do you prevent SQL injection attacks?**
> "Every database query in our Node.js backend uses parameterized queries — we never concatenate user input directly into SQL strings. For example, instead of writing `WHERE student_id = '${input}'`, we write `WHERE student_id = ?` and pass the input as a separate parameter. The MySQL driver automatically escapes all special characters, making injection impossible."

**Q13: What if someone steals a JWT token?**
> "JWT tokens are set with an expiration time. Even if intercepted, the token becomes invalid after the expiry. For our MVP, we use short-lived tokens. In a production deployment, we would implement refresh token rotation and HTTPS to encrypt tokens in transit, preventing man-in-the-middle attacks."

### 💳 Payment & Workflow Questions

**Q14: Why manual GCash verification instead of an automated payment gateway like PayMongo?**
> "PLP's Finance Office requires manual human verification of all payments per their existing accounting policies. Automated gateways would bypass their compliance requirements. Our system digitizes their existing workflow — students still pay via GCash, but instead of bringing a physical receipt to the window, they upload a screenshot and Reference Number digitally. The Finance Clerk then verifies it from their dashboard, which is faster and fully auditable."

**Q15: What happens if the Finance Clerk rejects a payment?**
> "The document status resets to `pending_payment`. The student receives an SMS and Email notification explaining the rejection, and they can re-upload a new receipt. The rejection is permanently logged in the `step_logs` table with the clerk's ID and timestamp, maintaining full accountability."

**Q16: Can you walk us through the complete lifecycle of a document request?**
> "Sure. (1) A verified student logs in and submits a request — the system auto-calculates the fee based on document type. (2) The student uploads a GCash receipt with Reference Number — status becomes `pending_payment_verification`. (3) The Finance Clerk reviews and approves it — status becomes `pending_secretary`. (4) The College Secretary evaluates the request using the Split-Screen modal — status becomes `ready_window_1`. (5) Window 1 releases the physical document to the student — status becomes `completed`. Every single step is logged in the `step_logs` table and the student receives SMS + Email at key transitions."

### 📊 Scalability & Deployment Questions

**Q17: Can this system handle multiple universities or just PLP?**
> "The architecture is inherently scalable. The desk assignments, document types, and routing rules are all data-driven, not hardcoded. To deploy for a different university, we would update the n8n workflow to match their routing policy, change the seed data, and configure their branding. The core engine — OCR, forecasting, audit logging — works universally."

**Q18: What would you change if you had more time or a Version 2?**
> "Three things: (1) A **Forgot Password** flow using JWT reset tokens sent via email. (2) **Real hardware scanner integration** using WebTWAIN to trigger physical scanners from the browser. (3) **Payment gateway integration** with PayMongo or Xendit for schools that allow automated payments. We would also Dockerize all three services for one-command deployment."

**Q19: How would you deploy this system in production?**
> "We would containerize all three services with Docker — the React frontend served via Nginx, the Node.js API managed by PM2, and the Flask AI Engine on a server with adequate RAM for PyTorch. The MySQL database would migrate to a managed cloud instance like AWS RDS or PlanetScale. The n8n orchestrator would run in its own Docker container. We would use HTTPS via Let's Encrypt and set up CI/CD for automated deployments."

**Q20: What if 100 students submit requests at the same time?**
> "Our Node.js backend uses non-blocking I/O and MySQL connection pooling, meaning it can handle hundreds of concurrent connections without spawning new threads. The AI Engine is the potential bottleneck since OCR is compute-heavy, but because it's a separate microservice, we can scale it independently — for example, running multiple Flask workers or deploying it on a more powerful server — without affecting the main API's responsiveness."

### 🧪 Testing & Data Questions

**Q21: How did you test the system?**
> "We conducted end-to-end testing of the core loop: Student submission → Payment → Finance verification → Secretary evaluation → Window 1 release → Completed. We tested each role's dashboard independently, verified SMS/Email delivery, and confirmed that the AI OCR correctly flags invalid documents. We also ran ESLint across the entire frontend to eliminate code quality issues."

**Q22: Where does your mock data come from?**
> "We built a Python script called `mock_data_gen.py` in the `ai-engine` directory that seeds the `step_logs` table with thousands of realistic historical entries. These entries have timestamps distributed across weeks with patterns mimicking real-world behavior — more submissions on weekdays, fewer on weekends. This data trains the Prophet forecasting model and gives the Random Forest meaningful metrics to analyze."

---

## 🔥 6. MUST REMEMBER (Cheat Sheet)

Do not freeze up during the demo! Keep these on a sticky note next to your laptop:

*   **Global Password:** `trace2024` (For all accounts)
*   **Test Accounts:**
    *   `STU2024001` (Student)
    *   `FINANCE001` (Finance Clerk)
    *   `SEC001` (College Secretary)
    *   `WINDOW1001` (Window 1 Clerk)
    *   `ADMIN001` (Registrar Admin)
*   **Demo Flow Script:** Student Login → New Request → GCash Upload → Finance Login → Verify → Secretary Login → Evaluate → Window 1 Login → Release → Admin Login → Show Forecast + Insights
*   **Services to Start:** Backend (port 3000), Frontend (port 5173), AI Engine (port 5000), n8n via Docker (port 5678)
*   **Panic Phrase:** *"We're experiencing a minor environment inconsistency, but the intended behavior here is..."*
