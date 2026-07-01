# Coding Preferences & Standards

This document outlines the coding preferences and conventions for Project TRACE.

## 🎨 Frontend (React + Tailwind)

- **Framework:** Use React (via Vite) for all UI portals (Student and Clerk).
- **Styling:** Use Tailwind CSS exclusively. No inline styles. Leverage Tailwind for glassmorphism and modern, clean layouts.
- **Components:** Keep components modular and reusable. Separate the fetching logic (hooks) from the presentational components.
- **State Management:** Use standard React hooks (`useState`, `useEffect`, `useMemo`). Keep complex global state minimal, relying on backend fetches when possible.

## ⚙️ Backend (Node.js + Express)

- **Architecture:** Follow a controller-service-route pattern to keep logic decoupled.
- **File Uploads:** Use `multer` for catching `multipart/form-data` uploads. Do not store images permanently in memory; write them to disk temporarily, send them to the Python OCR service, and then clean them up or store them securely.
- **Database Access:** Use raw SQL queries or a lightweight query builder. Ensure all inputs are parameterized to prevent SQL Injection.
- **Webhooks:** All webhook endpoints (e.g., from n8n or Payment Gateways) must handle errors gracefully and respond quickly (200 OK) to avoid timeouts.

## 🧠 AI Engine (Python)

- **Framework:** Flask for exposing the EasyOCR functionality via a simple HTTP REST API.
- **Virtual Environments:** Always run Python inside a virtual environment (`.venv`).
- **Dependencies:** Keep `requirements.txt` strictly updated with only the necessary OCR and web packages.

## 🛣️ Orchestration (n8n)

- **Logic Separation:** Hardcoded institutional routing rules should be avoided in Node.js. If a document path depends on the document type, Node.js should emit an event to n8n, which visually handles the routing logic.
- **Idempotency:** Workflows should be designed to handle duplicate triggers safely.

## 💳 Payments

- **Integration:** Prefer established gateways (e.g., PayMongo or Xendit) for handling QRPh and GCash.
- **Verification:** Never trust client-side success callbacks for payments. Always wait for the server-side webhook to verify payment authenticity before updating the MySQL database.
