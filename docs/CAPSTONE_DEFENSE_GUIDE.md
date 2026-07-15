# Project TRACE: Ultimate Capstone Defense Guide 🎓

This guide is designed to help your team prepare for your final Capstone defense. It covers the core pitch, a simple breakdown of the tech stack, the DOs and DON'Ts of presenting, and how to defend your architectural choices.

---

## 🎯 1. Core Pitch: What is Project TRACE?
*   **The Problem:** Traditional university registrar offices suffer from manual data entry bottlenecks, lost paperwork, and lack of transparency in document queuing.
*   **The Solution:** Project TRACE is an **AI-Assisted Registrar Document Workflow System**. It digitizes physical paperwork using Optical Character Recognition (OCR), automates queue management via a strict Role-Based Access Control (RBAC) pipeline, and uses Machine Learning to predict future document volume so the administration can allocate staff proactively.

---

## 🏗️ 2. Our Tech Stack (Explained Simply)
If a panelist asks "What technologies did you use and why?", here is how to answer simply but professionally:

*   **Frontend (The User Interface): React, Vite, Tailwind CSS.** 
    *   *Simple Explanation:* This is what the user sees and clicks. We used React because it makes the app feel fast and dynamic (pages don't need to reload). Tailwind CSS was used to make the UI look modern and clean.
*   **Backend (The Traffic Cop): Node.js & Express.** 
    *   *Simple Explanation:* This is the server that processes logic in the background. When the frontend asks for data, Node.js checks security, processes the request, and securely talks to the database.
*   **Database (The Vault): MySQL.** 
    *   *Simple Explanation:* A relational database where we securely store user accounts, document requests, and activity logs.
*   **AI Engine (The Specialist): Python, Flask, EasyOCR, Scikit-Learn.** 
    *   *Simple Explanation:* This is a separate "microservice". Node.js is great for web traffic, but Python is the industry standard for AI. EasyOCR allows the system to physically *read* uploaded documents to assist staff, while Scikit-Learn/Prophet help predict busy days (volume forecasting).
*   **APIs (The Messengers): UniSMS & Nodemailer.** 
    *   *Simple Explanation:* We integrated these third-party services to automatically send real-time text messages and emails to students about their document status.
*   **Orchestrator: n8n.** 
    *   *Simple Explanation:* A background workflow manager that helps automate complex multi-step routing logic.

---

## 🧠 3. Defending the AI & Machine Learning Features
Your panel will heavily scrutinize the "AI" part of your title. Here is exactly how to defend each module:

### A. The OCR Intake Engine (EasyOCR)
*   **What it does:** Scans physical walk-in documents (e.g., Honorable Dismissal clearances) and converts the text into digital data.
*   **How to defend it:** "We used **EasyOCR** (built on PyTorch) because it is a highly robust, pre-trained model that excels at reading standard printed text. We didn't need to train it from scratch; we only wrote the Python logic to cross-reference the extracted text against the requested document type."
*   **Fallback:** "If the OCR confidence score is too low, the system flags the document for manual College Secretary review. We do not let AI blindly approve things."

### B. The 7-Day Volume Forecast (Prophet)
*   **What it does:** Predicts how many document requests the Registrar will receive over the next 7 days.
*   **How to defend it:** "We used **Prophet** because it is specifically designed by Facebook for time-series forecasting. It automatically detects weekly seasonality, allowing the Registrar Admin to predict peak loads."

### C. The Administrative Insights (Random Forest)
*   **What it does:** Generates prescriptive UI alerts (e.g., "Secretary Queue Alert: 5 documents pending").
*   **How to defend it:** "We utilized a **Random Forest** classification algorithm via Scikit-Learn to analyze current queue loads. The model prescribes actionable insights to the Admin to resolve bottlenecks before they delay student requests."

---

## ✅ 4. DOs and ❌ DON'Ts for the Live Demo

### DOs
*   **DO follow a strict script for the live demo.** Unscripted clicking leads to errors. Practice this exact flow: *Log in as Student -> Request a Document -> Upload GCash -> Log in as Finance -> Verify Payment -> Log in as Secretary -> Show Split-Screen OCR Evaluation -> Show the SMS/Email notification.*
*   **DO highlight the pain point.** Start the presentation by reminding them how slow, paper-based, and frustrating the current registrar queueing system is. TRACE is the direct solution.
*   **DO divide and conquer questions.** If a panelist asks about the database, the backend dev should answer. If it's about the UI, let the frontend dev answer. Don't talk over each other.
*   **DO acknowledge limitations gracefully.** If they suggest a feature you don't have, say: *"That's an excellent point for scalability. For our MVP, we focused heavily on the core document routing, but that would be our very next feature in Version 2."*

### DON'Ts
*   **DON'T get defensive.** If a panelist critiques a feature or finds a flaw, thank them. (e.g., *"That's a great observation, we didn't account for that specific edge case. We will note that down."*)
*   **DON'T panic if a bug happens.** If something errors out during the demo, stay calm. Say, *"It looks like we are hitting a slight environment snag, but the intended flow here routes the document to Finance."* Move on smoothly.
*   **DON'T read straight from the screen.** Maintain eye contact with the panelists. The screen is for *them* to look at. You should know the system by heart.
*   **DON'T make up technical answers.** If asked a highly technical question you don't know, say: *"I would need to consult our documentation on that specific library, but the general concept is..."*

---

## ❓ 5. Anticipated Panel Questions & Answers

**Q1: Why did you build the AI backend in Python instead of Node.js?**
*   **Answer:** "Node.js is fantastic for handling our real-time web requests, but Python is the industry standard for Machine Learning. By splitting them into microservices, they each do what they are best at without slowing the whole system down."

**Q2: What happens if a student uploads a blurry image and the OCR fails?**
*   **Answer:** "Our AI engine returns a `confidence_score`. If the score is too low, it flags the document as `ai_flagged`. The College Secretary will then use the Split-Screen Evaluation modal to manually correct the extracted data. The AI assists, but the human is the final decision-maker."

**Q3: Is the system secure?**
*   **Answer:** "Yes. We use JWT (JSON Web Tokens) for authentication, Bcrypt for password hashing, and parameterized SQL queries to prevent SQL injection attacks. Furthermore, our strict Role-Based Access Control ensures a Window 1 Clerk cannot access the Finance verification queue."

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
