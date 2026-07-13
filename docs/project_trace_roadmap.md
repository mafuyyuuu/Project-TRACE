# Project TRACE: Progress & Roadmap

This document serves as the master tracking sheet for Project TRACE. It organizes the system's development into distinct phases across the full technology stack (Frontend, Backend, and Machine Learning) so you can easily track what has been completed and what remains for a true production rollout.

---

## ✅ Phase 1: Foundation & Core Logic (Completed)
*The initial setup of the architecture, database schema, and UI shells.*

* **Frontend (React/Vite):**
  * Built the unified `/dashboard` route handling 5 different command center views based on user roles (Student, Finance, Window 1, Secretary, Admin).
  * Designed the Tailwind CSS UI components (timeline bars, evaluation modals, KPI cards).
* **Backend (Node.js/Express):**
  * Established the MySQL database schema and connection pooling.
  * Created foundational CRUD routes in `documents.js` and `auth.js`.
  * Set up role-based authentication and desk assignments.
* **ML/AI Engine (Flask/Python):**
  * Built the `/ocr/extract` microservice wrapping the **EasyOCR (PyTorch)** model.
  * Built the `/ocr/verify` endpoint for ID matching.
* **Orchestrator:**
  * n8n workflow designed to handle basic routing between statuses.

---

## ✅ Phase 2: Dynamic Data Wiring (Completed)
*Connecting the UI to the database and removing hardcoded placeholders.*

* **Database (MySQL):**
  * Executed `migration.js` to patch schema constraints and add missing columns (`amount`, `copies`, `ocr_confidence_score`, `purpose`, `course`, `gcash_reference_no`).
* **Backend (Node.js/Express):**
  * Built dynamic KPI endpoints (`/stats`, `/stats/forecast`, `/stats/insights`).
  * Updated the tracking endpoints to return all necessary document metadata and step logs.
  * Added the `/student/:studentId` lookup endpoint for manual data entry.
* **Frontend (React/Vite):**
  * Replaced all 61+ hardcoded strings, dates, and numbers in `DashboardPage.jsx`.
  * Wired up the API service methods (`getDashboardStats`, `getForecast`, `getInsights`, `lookupStudent`).
  * Replaced the static forecast chart and AI insights with dynamic data mapping.
  * Wired image previews to pull dynamically from the backend upload directory.

---

## ✅ Phase 3: Hardware & 3rd-Party Integrations (Completed)
*Replacing mockups with real-world integrations and automating the core loops.*

* **Backend (Node.js/Express) & SMS:**
  * ✅ **SMS Alerts:** Integrated the UniSMS API in `documents.js` to dispatch real SMS text messages to students upon evaluation and payment verification.
  * ✅ **Instant Checkout & Dynamic Pricing:** Completely automated the Secretary's fee assessment by implementing dynamic smart forms (e.g., asking for semesters attended) and calculating exactly `Math.ceil(semesters / 4) * 100` before instantly popping the GCash modal.
* **ML/AI Engine (Flask/Python) & Workflow:**
  * ✅ **AI Requirement Verification:** Modified the EasyOCR Flask endpoint to actively cross-reference uploaded requirements against the requested document type, saving an `ai_verified` or `ai_flagged` status.
  * ✅ **In-App Notifications & Settings:** Added Bell Icon tracking and User Profile updates for phone numbers.
  * ✅ **Machine Learning Seeding:** Ran `mock_data_gen.py` to seed thousands of historical step logs, fully activating the **Prophet** forecasting model and **Random Forest** prescriptive engine for the Admin dashboard.
  * ✅ **Hardware Scanner Bridge:** Built a simulated scanner hook in the Window 1 Clerk dashboard to activate PyTorch OCR.
  * ✅ **n8n Workflow Execution:** Deployed and published the `routing-workflow.json` orchestrator to completely automate document forwarding across desks.

---

## ✅ Phase 4: UI/UX Polishing & Code Quality (Completed)
*Refining the frontend architecture and resolving all technical debt.*

* **Frontend Codebase:**
  * ✅ **ESLint Resolution:** Eliminated all 30+ linting errors, including unused variables, purity warnings, and bad state assignments inside `useEffect`.
  * ✅ **Modal Architecture Refactor:** Extracted inline modals (`LiveTrackingModal`, `SecretaryEvaluationModal`, `FinanceVerificationModal`) into standalone components to prevent file bloat and prop-drilling errors.
  * ✅ **Dynamic JSON Rendering:** Fixed the display of the `purpose` field so it neatly maps non-empty JSON key-value pairs in the Secretary Dashboard.
  * ✅ **UI Realignment:** Ensured all UI elements precisely match the design mockups, optimizing spacing and responsivenes.

---

## 🚀 Phase 5: Production Deployment (Pending)
*Taking the system live on external servers.*

* **Frontend:** Build the Vite project (`npm run build`) and serve via Nginx or deploy to Vercel/Netlify.
* **Backend:** Deploy the Node.js API to a VPS (e.g., DigitalOcean, AWS EC2) or a PaaS (e.g., Render, Railway) using PM2 for process management.
* **ML/AI Engine:** Deploy the Flask application. *(Note: Because PyTorch/EasyOCR is heavy, this microservice may require a server with adequate RAM or a small GPU for fast inference).*
* **Database:** Migrate the local MySQL database to a managed cloud database (e.g., AWS RDS, PlanetScale).
* **Dockerization:** Wrap the entire system into orchestrated Docker containers for easy scaling.
