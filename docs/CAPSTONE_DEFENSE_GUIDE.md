# Project TRACE: Capstone Defense Guide

This guide is designed to help your team prepare for your final Capstone defense. It covers the most critical system features, how to defend your architectural choices, and potential questions the panel might ask.

---

## 🎯 1. Core Pitch: What is Project TRACE?
**The Problem:** Traditional university registrar offices suffer from manual data entry bottlenecks, lost paperwork, and lack of transparency in document queuing.
**The Solution:** Project TRACE is an **AI-Assisted Registrar Document Workflow System**. It digitizes physical paperwork using Optical Character Recognition (OCR), automates queue management via a strict Role-Based Access Control (RBAC) pipeline, and uses Machine Learning to predict future document volume so the administration can allocate staff proactively.

---

## 🧠 2. Defending the AI & Machine Learning Features
Your panel will heavily scrutinize the "AI" part of your title. Here is exactly how to defend each module:

### A. The OCR Intake Engine (EasyOCR)
* **What it does:** Scans physical walk-in documents (e.g. Honorable Dismissal clearances) and converts the text into digital data.
* **How to defend it:** 
  * "We used **EasyOCR** (built on PyTorch) because it is a highly robust, pre-trained model that excels at reading standard printed text right out of the box."
  * "Since it is pre-trained, we did not need to train it from scratch. We only had to write the Python logic to cross-reference the extracted text against the requested document type to verify validity."
  * **Fallback:** "If the OCR confidence score is too low, the system flags the document for manual College Secretary review. We do not let AI blindly approve things."

### B. The 7-Day Volume Forecast (Facebook Prophet)
* **What it does:** Predicts how many document requests the Registrar will receive over the next 7 days.
* **How to defend it:**
  * "We used **Prophet** because it is specifically designed by Facebook for time-series forecasting. It automatically detects weekly seasonality (e.g., more requests on Mondays, fewer on Fridays)."
  * "This allows the Registrar Admin to predict peak loads during enrollment or graduation season and assign more clerks to Window 1."

### C. The Administrative Insights (Random Forest)
* **What it does:** Generates prescriptive UI alerts (e.g., "Secretary Queue Alert: 5 documents pending").
* **How to defend it:**
  * "We utilized a **Random Forest** classification algorithm via Scikit-Learn to analyze current queue loads and historical throughput. The model prescribes actionable insights to the Admin to resolve bottlenecks before they delay student requests."

---

## 🎥 3. Prioritize in Your Live Demo (Video Presentation)
When recording or presenting your system demo, follow this exact flow to wow the panel:

1. **Student Dashboard:** Show a student logging in, viewing their active requests progress bar, and uploading a physical requirement via the "Camera/Scan" dropzone.
2. **Finance Desk:** Log in as Finance to quickly verify the GCash payment.
3. **Window 1 (Scanning):** Show the Window 1 clerk receiving the digital request and triggering the AI OCR.
4. **College Secretary (Split-Screen Evaluation):** This is your **wow factor**. Show the Secretary reviewing the AI's extracted text on the right while viewing the scanned image on the left. Click "Approve."
5. **Registrar Admin (The ML Dashboard):** Finish by logging in as the Admin. Show off the dynamic 7-Day Volume Forecast graph and the real-time AI Insights panel. Emphasize that the system is now *data-driven*.

---

## ❓ 4. Anticipated Panel Questions & Answers

**Q1: Why did you build the AI backend in Python instead of Node.js?**
* **Answer:** "Node.js is fantastic for handling our Express API and real-time database connections, but Python is the industry standard for Machine Learning. Libraries like PyTorch, Prophet, and Scikit-learn are heavily optimized for Python. We used a microservice architecture where our Node backend communicates with our Python Flask AI engine via HTTP."

**Q2: What happens if a student uploads a blurry image and the OCR fails?**
* **Answer:** "Our AI engine returns a `confidence_score`. If the score falls below our threshold, the system flags the document as `ai_flagged`. The College Secretary will then use the Split-Screen Evaluation modal to manually correct the extracted data. The AI assists, but the human remains the final decision-maker."

**Q3: How did you test the Prophet forecasting model if the system is brand new?**
* **Answer:** "We built a Python script (`mock_data_gen.py`) to seed our MySQL database with thousands of rows of realistic historical queue data. This allowed us to train the Prophet model to recognize simulated weekly trends, proving the architecture works."

**Q4: Is the system secure?**
* **Answer:** "Yes. We use JWT (JSON Web Tokens) for authentication, Bcrypt for password hashing, and strictly parameterized SQL queries in our Node backend to prevent SQL injection attacks. Furthermore, our Role-Based Access Control ensures a Window 1 Clerk cannot access the Finance verification queue."

---

## 🚀 Final Tips for the Day
* **Don't rush.** Let the UI animations (like the Recharts graphs and the modal popups) play out. 
* **If a bug happens live:** Do not panic. Simply explain, "That's an edge case we are tracking in our development backlog, but the primary workflow routes successfully."
* **Be proud.** You've built a full-stack, multi-role, AI-integrated microservice architecture. It is a highly advanced Capstone! Good luck!
