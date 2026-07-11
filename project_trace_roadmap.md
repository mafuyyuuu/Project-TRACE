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

## 🚧 Phase 3: Hardware & 3rd-Party Integrations (Pending / Next Steps)
*Replacing mockups with real-world integrations and physical hardware bridges.*

* **Frontend (React/Vite):**
  * **Finance Desk:** Replace the Mock GCash QR Code SVG with the actual Finance Department's merchant QR code image.
  * **Window 1 Desk:** Implement the WebTWAIN SDK (or similar web-scanning library) to allow the "Scan" button to trigger the physical hardware scanner on the clerk's desk.
* **Backend (Node.js/Express):**
  * **SMS Alerts:** Integrate the Twilio API (or Semaphore) in `documents.js` to dispatch real SMS text messages to students when their documents hit the `ready_window_1` status.
  * **Payment Gateway (Optional):** Integrate PayMongo or Xendit webhooks for automated GCash payment verification, reducing the manual workload for the Finance Clerk.
* **ML/AI Engine (Flask/Python):**
  * Run `mock_data_gen.py` to seed the database with 12 months of historical step logs, allowing the **Prophet** forecasting model and **Random Forest** prescriptive engine to generate highly accurate predictions immediately on launch.

---

## 🚀 Phase 4: Production Deployment (Pending)
*Taking the system live on external servers.*

* **Frontend:** Build the Vite project (`npm run build`) and serve via Nginx or deploy to Vercel/Netlify.
* **Backend:** Deploy the Node.js API to a VPS (e.g., DigitalOcean, AWS EC2) or a PaaS (e.g., Render, Railway) using PM2 for process management.
* **ML/AI Engine:** Deploy the Flask application. *(Note: Because PyTorch/EasyOCR is heavy, this microservice may require a server with adequate RAM or a small GPU for fast inference).*
* **Database:** Migrate the local MySQL database to a managed cloud database (e.g., AWS RDS, PlanetScale).
