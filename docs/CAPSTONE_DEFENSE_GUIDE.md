# Project TRACE: Ultimate Capstone Defense Guide 🎓

This guide is designed to help your team prepare for your final Capstone defense. It covers the core pitch, an in-depth breakdown of every technology, why each was chosen over alternatives, the DOs and DON'Ts of presenting, and a comprehensive bank of mock panel questions with scripted answers.

> 📌 **Content reviewed against the repository: October 6, 2026.** This preserves the original defense format and detailed question bank. Distinguish implemented code, local verification and the deployed version. Use [PROGRESS.md](PROGRESS.md) for evidence, [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md) for deployment, and [SUPPORT_DESIGN.md](SUPPORT_DESIGN.md) for the implemented ticket policies. See [SUPPORT_VALIDATION.md](SUPPORT_VALIDATION.md) for local evidence; demonstrate only the matching deployed version.

---

## 🎯 1. Core Pitch: What is Project TRACE?

*   **The Problem:** Traditional university registrar offices suffer from manual data entry bottlenecks, lost paperwork, lack of transparency in document queuing, and zero predictive capacity for volume spikes. Students have no idea where their document is in the pipeline, and administrators have no data-driven tools to manage workloads.
*   **The Solution:** Project TRACE (**Tracking, Routing, and Automated Credential Engine**) is an **AI-Assisted Registrar Document Workflow System** built for the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office. It digitizes physical paperwork using Optical Character Recognition (OCR), automates queue management via a strict Role-Based Access Control (RBAC) pipeline, sends real-time multi-channel notifications (SMS & Email), and uses prototype Machine Learning and queue-based insights to assist workload planning. Current forecast inputs are daily recorded request-arrival counts; measured predictive accuracy and operational improvements require a separate evaluation.

---

## 📊 2. System Diagrams

Use these diagrams during your defense presentation. They visually explain the architecture, data flow, and access control so the panelists immediately grasp how the system works before you dive into code-level details.

### Diagram 1: System Architecture Overview
This shows the frontend, API, AI engine and optional routing integration, together with HTTPS, persistent private files and notifications. The current deployment uses Vercel for the frontend and Docker Compose/Caddy for the server services.

```mermaid
graph TB
    subgraph "👤 Users (Browser)"
        STU["🧑‍🎓 Student Portal"]
        FIN["💰 Finance Clerk"]
        SEC["📜 College Secretary"]
        W1["🏢 Window 1 Clerk"]
        ADM["👑 Registrar Admin"]
    end

    subgraph "Frontend - React / Vite / Tailwind"
        UI["Unified /dashboard Route<br/>5 role views + shared UI<br/>Vercel frontend"]
    end

    subgraph "Backend - Node.js / Express"
        API["REST API + Socket.IO<br/>Session / role / ownership checks"]
        AUTH["Auth Middleware<br/>Role-Based Access Control"]
        ROUTES["Controllers → Services → Models<br/>Parameterized SQL"]
    end

    subgraph "Database - MySQL v8"
        DB[("MySQL Database")]
        USERS["users table"]
        DOCS["documents table"]
        LOGS["step_logs table"]
        NOTIFS["notifications table"]
        TICKETS["Support tickets, messages, files<br/>Events + queue/settings"]
    end

    subgraph "AI Engine - Python / Flask"
        OCR["POST /ocr/extract<br/>EasyOCR (PyTorch)"]
        VERIFY["POST /ocr/verify<br/>Identity Text Checks"]
        FORECAST["POST /forecast<br/>Prophet (7-Day)"]
        INSIGHTS["POST /ai/recommend<br/>Aggregate document prototype"]
        SUPPORTAI["POST /ai/support-insights<br/>Aggregate rule-based advice"]
    end

    subgraph "Orchestrator - n8n (Docker)"
        N8N["Routing Workflow<br/>Webhook-Based Triggers"]
    end

    subgraph "External APIs"
        SMS["📱 UniSMS<br/>Text Notifications"]
        EMAIL["📧 Nodemailer<br/>Email Alerts"]
    end

    STU & FIN & SEC & W1 & ADM --> UI
    PROXY["🔒 Caddy HTTPS<br/>API + WebSocket proxy"]
    FILES[("Private upload volume")]
    UI -->|"HTTPS + authenticated requests"| PROXY
    UI <-->|"Private Socket.IO notifications"| PROXY
    PROXY --> API
    ROUTES -->|"Authorized file access"| FILES
    FORECAST -->|"Daily request-arrival aggregates"| DB
    API --> AUTH --> ROUTES
    ROUTES -->|"SQL Queries"| DB
    DB --- USERS & DOCS & LOGS & NOTIFS & TICKETS
    ROUTES -->|"Proxy AI Requests"| OCR & VERIFY & FORECAST & INSIGHTS & SUPPORTAI
    ROUTES -->|"Webhook Trigger"| N8N
    N8N -->|"Status Update Callback"| ROUTES
    ROUTES -->|"Send SMS"| SMS
    ROUTES -->|"Send Email"| EMAIL

    style UI fill:#3b82f6,color:#fff
    style API fill:#22c55e,color:#fff
    style DB fill:#f59e0b,color:#fff
    style OCR fill:#8b5cf6,color:#fff
    style VERIFY fill:#8b5cf6,color:#fff
    style FORECAST fill:#8b5cf6,color:#fff
    style INSIGHTS fill:#8b5cf6,color:#fff
    style N8N fill:#ef4444,color:#fff
    style SMS fill:#06b6d4,color:#fff
    style EMAIL fill:#06b6d4,color:#fff
```

### Diagram 2: Document Lifecycle Pipeline

Nine statuses, **evaluate first and pay later**. Use this to explain the core workflow during the
demo — and be ready for the question it invites, which is *why* payment comes so late. The answer is
below the diagram.

```mermaid
flowchart LR
    A["🧑‍🎓 Student<br/>Files Request"] --> B["PENDING_W1_INTAKE"]
    W1["🏢 Window 1<br/>Walk-in at counter"] --> B
    B -->|"🏢 Window 1<br/>Checks paperwork, scans"| C["PENDING_SEC_EVALUATION"]
    C -->|"📜 Secretary<br/>Accepts + sets ready date"| D["SEC_PROCESSING"]
    D -->|"📜 Secretary<br/>Prints, then prices it"| E["PENDING_STUDENT_PAYMENT"]
    E -->|"🧑‍🎓 Pays online"| F["PENDING_FINANCE_VERIFICATION"]
    E -->|"💰 Finance logs<br/>counter payment"| F
    F -->|"💰 Finance verifies<br/>sets PAID"| G["PAID_PENDING_SEC_RELEASE"]
    F -->|"💰 Finance rejects"| E
    G -->|"📜 Secretary inspects<br/>issued Official Receipt"| OR["SEC_OR_VERIFIED"]
    OR -->|"📜 Secretary records<br/>physical handoff"| H["READY_FOR_RELEASE"]
    H -->|"🏢 Window 1 releases<br/>against the OR"| I["COMPLETED"]

    D -.->|"📱 SMS + 📧 Email<br/>Estimated ready date"| A
    E -.->|"📱 SMS + 📧 Email<br/>Amount due"| A
    H -.->|"📱 SMS + 📧 Email<br/>Ready for pickup"| A

    style A fill:#3b82f6,color:#fff
    style W1 fill:#3b82f6,color:#fff
    style B fill:#f59e0b,color:#fff
    style C fill:#8b5cf6,color:#fff
    style D fill:#8b5cf6,color:#fff
    style E fill:#f97316,color:#fff
    style F fill:#f97316,color:#fff
    style G fill:#22c55e,color:#fff
    style OR fill:#3b82f6,color:#fff
    style H fill:#22c55e,color:#fff
    style I fill:#10b981,color:#fff
```

**Why pricing follows preparation.** Page-based types use the actual printed-page count; flat-fee types use their configured rule. Admin manages rates and college overrides, Secretary records actual pages, and the server computes and saves the itemized final charge. Filing shows rates only, not an estimated total. TOR uses saved Year Started, without a request Year Ended; study years do not imply pages. The old design charged a fee up front and hoped it matched; this one bills what
the document actually cost. It also means a student never pays for something the office later finds
it cannot issue.

**Two rules the panel will probe.** Rejection returns a document *exactly one step*, never to the
start — so the desk that can fix the problem is the one that receives it. Finance payment clearance is not undone by receipt inspection; refunds are handled off-system. Consult the shared transition map for permitted stage returns rather than inferring them from badge colors.

### Diagram 3: AI & Machine Learning Data Flow
This shows exactly how each AI/ML module receives data, processes it, and returns results to the system.

```mermaid
flowchart TB
    subgraph "Input Sources"
        SCAN["📄 Scanned Document<br/>(Image File)"]
        IDPHOTO["🪪 Student ID Photo<br/>(Registration Upload)"]
        STEPLOGS["📊 Daily COUNT of documents<br/>(Recorded request arrivals)"]
        QUEUES["📋 All-stage queue snapshot from Node<br/>Manila-day workflow actions"]
    end

    subgraph "Python Flask AI Engine"
        subgraph "Module A: EasyOCR (PyTorch)"
            OCR_EXTRACT["POST /ocr/extract<br/>Text Extraction"]
            OCR_VERIFY["POST /ocr/verify<br/>Cross-Reference Check"]
        end
        subgraph "Module B: Prophet (Meta)"
            PROPHET["POST /forecast<br/>Time-Series Model"]
        end
        subgraph "Module C: Aggregate Advice"
            RF["POST /ai/recommend<br/>Observed queue rules<br/>No performance prediction"]
        end
    end

    subgraph "Outputs"
        EXTRACTED["Extracted Text +<br/>confidence_score"]
        VERIFIED["Text-match result<br/>+ review reason"]
        FORECAST_OUT["7-Day Request-Arrival Forecast<br/>Nonnegative integer predictions"]
        ALERTS["Queue snapshot + descriptive advice<br/>(No efficiency confirmation)"]
    end

    SCAN --> OCR_EXTRACT --> EXTRACTED
    IDPHOTO --> OCR_VERIFY --> VERIFIED
    STEPLOGS --> PROPHET --> FORECAST_OUT
    QUEUES --> RF --> ALERTS
    QUEUES -->|"Observed counts; local fallback"| ALERTS

    EXTRACTED -->|"Saved to documents<br/>ocr_extracted_data"| DB[("MySQL")]
    VERIFIED -->|"Sets ai_verified<br/>or ai_flagged"| DB
    FORECAST_OUT -->|"Displayed on<br/>Admin Spline Chart"| ADMIN["👑 Admin Dashboard"]
    ALERTS -->|"Rendered as<br/>Alert Cards"| ADMIN

    style OCR_EXTRACT fill:#8b5cf6,color:#fff
    style OCR_VERIFY fill:#8b5cf6,color:#fff
    style PROPHET fill:#ec4899,color:#fff
    style RF fill:#f97316,color:#fff
    style DB fill:#f59e0b,color:#fff
    style ADMIN fill:#22c55e,color:#fff
```

### Diagram 4: Role-Based Access Control (RBAC) Map
This shows exactly what each role can and cannot do in the system. Useful when a panelist asks about security or authorization.

```mermaid
flowchart LR
    subgraph "🧑‍🎓 Student"
        S1["Submit Document Requests"]
        S2["Verify Email / Complete Profile<br/>Submit Payment Proof"]
        S3["View Live Tracking Timeline"]
        S4["Receive SMS + Email Alerts"]
    end

    subgraph "💰 Finance Clerk"
        F1["View Payment Verification Queue"]
        F2["Approve / Reject Payments"]
        F3["Review Proof / Issue or Defer OR<br/>Separate Payment History<br/>Private OR Preview + Filtered Export"]
    end

    subgraph "📜 College Secretary"
        SE1["View Evaluation Queue"]
        SE2["Split-Screen OCR Review"]
        SE3["Actual Pages / Server Pricing<br/>OR Check + Handoff<br/>Assigned-College Reports"]
    end

    subgraph "🏢 Window 1 Clerk"
        W1A["AI Intake Scanner Dropzone<br/>Compact Expandable Registration QR"]
        W1B["View Release Queue"]
        W1C["Release Documents to Students"]
    end

    subgraph "👑 Registrar Admin"
        A1["7-Day Volume Forecast Chart"]
        A2["AI Insights Alert Panel"]
        A3["System Maintenance<br/>Accounts / Programs / Fee Schedules"]
        A4["Global Activity Logs Audit"]
        A5["Manual Registration Review<br/>Templates / Security / Reports"]
    end

    JWT["🔐 JWT + current account check<br/>Role / desk / ownership scope"] --> S1 & F1 & SE1 & W1A & A1

    style JWT fill:#ef4444,color:#fff
```

### Diagram 5: Database Entity Relationship
This expands the original core-table diagram with the current profile, catalog, pricing, attachment and messaging relationships. It is a selected logical overview, not the full SQL schema. In particular, documents.student_id is a logical account reference rather than an enforced SQL foreign key. The ticket relationships below describe the local implementation; deploy its explicit preserving migrations before demonstrating it. Legacy message tables remain as preserved import sources.

```mermaid
erDiagram
    users ||--o{ support_tickets : "owns / handles"
    users ||--o{ staff_conversations : "participant pair"
    staff_conversations ||--o{ staff_conversation_messages : "retained history"
    staff_conversations ||--o{ staff_conversation_events : "retry audit"
    documents |o--o{ support_tickets : "optional case link"
    support_tickets ||--o{ support_ticket_messages : "conversation"
    support_ticket_messages ||--o{ support_ticket_files : "private attachments"
    support_tickets |o--o{ support_ticket_events : "durable lifecycle"
    supporting_document_types |o--o{ request_attachment_requirements : "approved identity"
    request_attachment_requirements |o--o{ request_attachment_events : "retained review history"
    users ||--o{ documents : "submits"
    users ||--o{ notifications : "receives"
    documents ||--o{ step_logs : "generates"
    users ||--o{ step_logs : "performs"

    users {
        INT id PK
        VARCHAR student_id UK
        VARCHAR email
        VARCHAR password_hash
        VARCHAR full_name
        ENUM role "student / clerk / admin"
        ENUM user_type "student / alumni"
        VARCHAR desk_assignment
        VARCHAR id_proof_path
        ENUM verification_status "pending / verified / rejected"
        VARCHAR course
        VARCHAR phone_number
        BOOLEAN is_active
    }

    documents {
        INT id PK
        VARCHAR tracking_number UK
        VARCHAR student_id "logical account reference"
        VARCHAR document_type
        VARCHAR current_status "PENDING_W1_INTAKE / SEC_PROCESSING / etc (9 stages + legacy values)"
        DATE estimated_ready_date "estimated date, not guarantee"
        INT page_count "basis for the charge"
        TEXT pricing_notes "why the amount is what it is"
        INT priced_by_clerk_id FK "which Secretary set it"
        DATETIME priced_at "gates billing, not `amount`"
        VARCHAR payment_channel "digital / walk_in"
        VARCHAR or_number "issued OR; may be deferred"
        JSON pricing_snapshot
        JSON fee_breakdown
        TIMESTAMP payment_cleared_at
        DATE or_earliest_issue_date
        VARCHAR official_receipt_path
        ENUM payment_status "UNPAID / PAID"
        VARCHAR file_path
        VARCHAR receipt_image_path
        VARCHAR gcash_reference_no
        DECIMAL amount
        INT copies
        DECIMAL ocr_confidence_score
        VARCHAR purpose
        JSON ocr_extracted_data
    }

    step_logs {
        INT id PK
        INT document_id FK
        INT clerk_id FK
        VARCHAR action_taken
        VARCHAR from_status
        VARCHAR to_status
        DATETIME timestamp_started
        DATETIME timestamp_completed
        TEXT notes
    }

    notifications {
        INT id PK
        INT user_id FK
        VARCHAR title
        TEXT message
        VARCHAR type
        BOOLEAN is_read
        TIMESTAMP created_at
    }

    users ||--o| student_profiles : "saved profile"
    colleges ||--o{ programs : "approved catalog"
    colleges ||--o{ users : "assigned college"
    document_types ||--o{ document_fee_schedules : "college overrides"
    documents ||--o{ document_messages : "request history"
    users ||--o{ support_messages : "general history"
    documents ||--o{ request_attachment_requirements : "case requirements"
    request_attachment_requirements ||--o{ request_attachment_uploads : "upload versions"
    users ||--o| authenticator_credentials : "encrypted factor"
    users ||--o{ authenticator_recovery_codes : "hashed recovery"
    users ||--o{ session_revocations : "revoked sessions"
    users ||--o{ security_logs : "account activity"

    student_profiles {
        INT user_id PK
        DATE birth_date
        VARCHAR home_address
        INT graduation_year "separate PLP year"
        INT last_attendance_year "not reclassified"
        INT elem_grad_year
        INT jhs_grad_year
        INT shs_grad_year
    }
    colleges {
        INT id PK
        VARCHAR name
        BOOLEAN is_active
    }
    programs {
        INT id PK
        INT college_id FK
        VARCHAR name
        BOOLEAN is_active
    }
    document_types {
        INT id PK
        VARCHAR name
        DECIMAL base_fee
        VARCHAR fee_rule
        BOOLEAN is_active
    }
    document_fee_schedules {
        INT id PK
        INT document_type_id FK
        INT college_id FK
        JSON fee_items
    }
    document_messages {
        INT id PK
        INT document_id FK
        INT sender_id FK
        VARCHAR message
        TIMESTAMP created_at
    }
    support_messages {
        INT id PK
        INT student_user_id FK
        INT sender_id FK
        VARCHAR message
        TIMESTAMP created_at
    }
    request_attachment_requirements {
        INT id PK
        INT document_id FK
        VARCHAR label
        VARCHAR instructions
        ENUM status
    }
    request_attachment_uploads {
        INT id PK
        INT requirement_id FK
        VARCHAR file_path
        VARCHAR original_filename
    }
    support_tickets {
        INT id PK
        INT student_user_id FK
        INT document_id FK "nullable after cancellation"
        ENUM state "FAQ / Queued / In progress / Awaiting / Resolved"
        INT assigned_to FK
        DATETIME queued_at
        DATETIME reply_requested_at
    }
    support_ticket_messages {
        BIGINT id PK
        INT ticket_id FK
        INT sender_id FK
        VARCHAR client_key "unique per sender"
        JSON metadata
    }
    support_ticket_files {
        BIGINT id PK
        BIGINT message_id FK
        VARCHAR filename UK "protected download"
    }
    support_ticket_events {
        BIGINT id PK
        INT ticket_id FK
        VARCHAR event_key UK
        VARCHAR event_type
        DATETIME created_at
    }
    supporting_document_types {
        INT id PK
        VARCHAR name UK
        BOOLEAN is_active
    }
    request_attachment_events {
        BIGINT id PK
        INT requirement_id FK "nullable after cancellation"
        JSON snapshot "original requirement/case identity"
        DATETIME created_at
    }
    authenticator_credentials {
        INT user_id PK
        TEXT active_secret "encrypted, never displayed"
        BIGINT last_counter
    }
    authenticator_recovery_codes {
        INT id PK
        INT user_id FK
        VARCHAR code_hash
        DATETIME used_at
    }
    session_revocations {
        VARCHAR token_hash PK
        INT user_id FK
        DATETIME expires_at
    }
    security_logs {
        INT id PK
        INT user_id FK
        VARCHAR event_type
        TIMESTAMP created_at
    }
```

---

## 🏗️ 3. Our Tech Stack (In-Depth Breakdown)

This section covers **what** each technology is, **how** it is used in our system, and **why** we chose it instead of alternatives. Memorize the "Why not alternatives" part — panelists love asking this.

### A. Frontend — React (Vite) + Tailwind CSS

| Aspect | Detail |
|:---|:---|
| **What it is** | React is a JavaScript UI library for building component-based interfaces. Vite is a modern build tool. Tailwind CSS is a utility-first CSS framework. |
| **How we use it** | We built a single unified `/dashboard` route that dynamically renders one of 5 different command centers (Student, Finance, Window 1, Secretary, Admin) based on the logged-in user's `role` and `desk_assignment`. Each portal has its own tabs, modals, and data grids — all wired to live API endpoints. |
| **Why React over plain HTML/JS?** | Our system has 5 role-based dashboards with complex interactive components (split-screen modals, live tracking timelines, dynamic forms). Plain HTML/JS would require manually managing DOM updates, leading to spaghetti code. React's virtual DOM and component model keep the codebase modular and maintainable. |
| **Why React over Angular or Vue?** | Our existing role components, hooks and team workflow use React. Angular and Vue are valid alternatives; this repository does not contain a comparative performance or productivity study. |
| **Why Vite over Create React App (CRA)?** | Vite provides the development server, HMR and production build for this React SPA. We use its existing alias/proxy setup and verify production builds; no measured speed comparison is claimed. |
| **Why Tailwind over Bootstrap or custom CSS?** | Tailwind supports our existing theme palette, responsive utilities and shared trace-* controls. Reusable conventions now keep buttons, fields, modal spacing, motion and dark mode aligned across roles. |

### B. Backend — Node.js + Express

| Aspect | Detail |
|:---|:---|
| **What it is** | Node.js is a JavaScript runtime built on Chrome's V8 engine. Express is a minimal web framework for building REST APIs. |
| **How we use it** | Express acts as our **API Gateway**. It handles JWT authentication, file uploads via Multer, all CRUD operations against MySQL, proxies requests to the Python AI Engine, and dispatches SMS/Email notifications. It also exposes webhook endpoints for n8n. |
| **Why Node.js over PHP (Laravel)?** | The team shares JavaScript across the React frontend and Express API. Asynchronous I/O and connection pooling support concurrent work, but capacity must be measured; other frameworks can also serve this workload. |
| **Why Node.js over Django (Python)?** | The chosen separation keeps OCR/model dependencies in Flask and the workflow API in Express. A separate AI service can fail or scale independently; Django could also be used with an external AI service. |
| **Why Express over Fastify or Hapi?** | Express fits the current controller/service/model structure and installed middleware. We have not benchmarked alternative frameworks; authorization, transaction correctness and measured load behavior matter more than assuming a library guarantees capacity. |

### C. Database — MySQL (v8)

| Aspect | Detail |
|:---|:---|
| **What it is** | MySQL is a relational database management system (RDBMS) that organizes data into structured tables with defined relationships. |
| **How we use it** | The four original core tables remain, with profile, college/program, fee-schedule, payment/OR, case-attachment, messaging, template and account-security tables added. Models use parameterized SQL and pooled connections; explicit migrations preserve existing data. |
| **Why MySQL over MongoDB (NoSQL)?** | Our data is highly relational — every document belongs to a student, every step log references a document and a clerk, notifications reference a user. Relational databases enforce referential integrity via foreign keys. MongoDB would require us to manually maintain data consistency, which is risky for a document tracking system where audit accuracy is critical. |
| **Why MySQL over PostgreSQL?** | MySQL 8 is the current relational store and supports the transactions, locks, constraints and JSON snapshots used here. PostgreSQL is a valid alternative; changing the store would require adapting and verifying the SQL and migrations. |
| **Why raw SQL over an ORM (Sequelize/Prisma)?** | Parameterized SQL keeps queries and transaction boundaries explicit in model files. This makes scope and lock behavior reviewable; raw SQL still needs query-performance checks and does not automatically prevent inefficient access patterns. |

### D. AI Engine — Python, Flask, EasyOCR (PyTorch), Prophet, Scikit-Learn

| Aspect | Detail |
|:---|:---|
| **What it is** | A dedicated Python microservice exposing REST endpoints for OCR text extraction, document verification, volume forecasting, and prescriptive recommendations. |
| **How we use it** | Express uses /ocr/verify for post-submission registration text checks, /ocr/extract for intake and /ocr/receipt for Finance, plus /forecast and /ai/recommend. Staff review suggestions; AI is not an identity-authenticity authority. |

Alumni with unavailable proof may apply with a reason in the production build. Their accounts
remain pending and skip OCR; Admin records checked alternative identity evidence and the decision
in an atomic audit. Current students still upload proof. Identity details are entered manually
and reviewed before the registration is confirmed.
| **Why EasyOCR over Tesseract?** | EasyOCR is the OCR dependency currently integrated into Flask. We use its pretrained text recognition with local parsing and manual review. We have not performed a comparative accuracy benchmark and do not claim that another OCR engine is inherently unsuitable. |
| **Why Prophet over ARIMA or LSTM?** | Prophet is the implemented time-series model. It fits complete Manila-day request-arrival counts and returns seven estimates. Exact type history and zero days are preserved. Model/seasonality choice and accuracy still require held-out real-history evaluation. |
| **Why descriptive rules rather than the earlier Random Forest prototype?** | The former classifier fitted four coded examples, which cannot establish real operational prediction quality. Production advice now analyzes recorded queue/report aggregates using transparent sample-based rules through the AI service. It does not claim validated staffing or causal performance analysis. |
| **Why Flask over FastAPI?** | Flask hosts the current OCR/model endpoints. The team retains the existing request/response implementation and Gunicorn deployment; no comparative overhead or cold-start benchmark is claimed. |

### E. Workflow Orchestration — n8n

| Aspect | Detail |
|:---|:---|
| **What it is** | n8n is a self-hosted, open-source workflow automation tool that connects events and actions via visual node-based workflows. |
| **How we use it** | Automatic document assignment is disabled in the approved deployment configuration. If explicitly enabled later, after intake the backend can trigger the routing webhook; the exported workflow selects a college Secretary account and calls a secret-protected assignment endpoint. Unassigned records use college filtering. Deployment activation and successful callbacks must be checked separately. |
| **Why n8n over hardcoding the logic in Node.js?** | The visual workflow makes the current assignment integration inspectable. It does not authorize arbitrary new pipeline stages: legal statuses and desk permissions remain in shared backend/frontend code and need development/testing when institutional policy changes. |
| **Why n8n over Zapier or Make?** | The existing deployment runs n8n alongside the API. Hosting it ourselves gives control over this workflow, but privacy also depends on authorization, retention, configuration and the external email/SMS channels. Self-hosting alone does not establish legal compliance. |

### F. Notifications — UniSMS + Nodemailer

| Aspect | Detail |
|:---|:---|
| **What it is** | UniSMS is an SMS gateway API. Nodemailer is a Node.js library for sending emails via SMTP. |
| **How we use it** | Committed workflow actions create authorized in-app notifications and send configured email/SMS updates. Support uses private user notifications to refresh ticket data, with bounded polling as fallback. Failed external delivery does not roll back an accepted desk action; check actual delivery separately. |
| **Why both SMS and Email?** | In-app, SMS and email provide complementary notices. External channels can fail or arrive late; a committed desk action remains committed. SMTP acceptance is not proof of inbox delivery, and neither channel guarantees that every student reads the update. |
| **Why UniSMS over Twilio or Semaphore?** | UniSMS is the configured SMS integration in this repository. Provider pricing, availability and institutional procurement require a current review; no comparative price claim is established by the code. |

### G. Security Stack — JWT + Bcrypt + RBAC

| Aspect | Detail |
|:---|:---|
| **What it is** | JWT (JSON Web Tokens) for stateless authentication, Bcrypt for password hashing, and Role-Based Access Control for authorization. |
| **How we use it** | Login checks bcrypt and the applicable factor, then issues a 24-hour JWT. Middleware rechecks current activity, role, token version and session revocation; services enforce ownership/college scope. Authenticator enrollment, hashed recovery codes, email verification, reset/change notifications and security logs supplement the role boundary. |
| **Why JWT over sessions?** | The browser carries a signed JWT, but TRACE also keeps revocation and account-version state for real logout, logout-all and deactivation. Flask and n8n do not share user-login tokens as their authorization mechanism; the machine callback uses its own secret. |
| **Why Bcrypt over SHA-256?** | SHA-256 is a fast hash, which is actually bad for passwords — attackers can brute-force billions of SHA-256 hashes per second. Bcrypt is intentionally slow and includes a salt, making it resistant to rainbow table attacks and brute-force. |

---

## 🧠 4. Defending the AI & Machine Learning Features

Your panel will heavily scrutinize the "AI" part of your title. Here is exactly how to defend each module:

### A. The OCR Intake Engine (EasyOCR)
*   **What it does:** Scans physical walk-in documents (e.g., Honorable Dismissal clearances, Student IDs) and converts the text into structured digital data.
*   **How to defend it:** "We used **EasyOCR** (built on PyTorch deep learning) as the existing pretrained text recognizer; readable text is parsed into suggested fields and checked against supplied values. Image quality affects extraction, and comparative accuracy has not been established. We didn't need to train it from scratch; we wrote Python logic to cross-reference the extracted text against the requested document type and log an `ai_verified` or `ai_flagged` status."
*   **Fallback:** "An inconclusive registration check stays pending for Admin review with a reason. Intake extraction remains editable for authorized staff. The displayed field-completeness score is not proof of authenticity or measured recognition accuracy."

### B. The 7-Day Volume Forecast (Prophet)
*   **What it does:** Estimates daily incoming document requests for the next seven days from complete Manila-day arrival counts; exact document types use their own saved history.
*   **How to defend it:** "The current **Prophet** endpoint receives up to 90 complete Manila-day counts of requested documents from Node and fits a weekly-seasonality model. Today is excluded as incomplete; it predicts tomorrow through seven days ahead. Results are nonnegative rounded counts, without exposed uncertainty bounds. Meaningful planning use requires held-out real-history evaluation; successful software tests do not establish forecasting accuracy."
*   **Data source:** "The input is the count of rows in `documents` grouped by `created_at` in Manila time. Each requested document counts once, including documents in a multi-document request. It does not count repeated workflow actions in step_logs. The exact daily model input is inspectable in the expanded Admin forecast. Demo database rows may be synthetic; no external institutional dataset is bundled or certified."

### C. The Administrative Insights (Aggregate Analysis)
*   **What it does:** Shows every active document queue with snapshot time and count-based review signals. Evaluation above 5 and pickup above 3 are advisory thresholds, not institutional capacity targets.
*   **How to defend it:** "Production advice uses measured queues, completion durations, transition samples and support-report aggregates. The existing AI service applies descriptive rules without receiving identities or chat transcripts. The four-example classifier is no longer used. Advice remains separate from saved measurements and cannot establish efficiency, causal bottlenecks or staffing gains."

---

## ✅ 5. DOs and ❌ DON'Ts for the Live Demo

### DOs
*   **DO follow a strict script for the live demo.** Unscripted clicking leads to errors. Practice this exact flow: *Student: profile/email → File request → Window 1 intake → Secretary evaluation/preparation/server pricing → Student payment proof → Finance clearance/OR → Secretary OR inspection/handoff → Window 1 release → Admin reports/insights.*
*   **DO highlight the pain point FIRST.** Start the presentation by reminding them how slow, paper-based, and frustrating the current registrar queueing system is. Show a before/after comparison. TRACE is the direct solution.
*   **DO divide and conquer questions.** If a panelist asks about the database, the backend dev should answer. If it's about the UI, let the frontend dev answer. Don't talk over each other.
*   **DO acknowledge limitations gracefully.** If they suggest a feature you don't have, say: *"That's an excellent point for scalability. For our MVP, we focused heavily on the core document routing, but that would be our very next feature in Version 2."*
*   **DO mention data privacy.** Proactively mention that files require authenticated ownership/role checks, passwords are bcrypt hashes and credentials never belong in logs or slides. Email/SMS still involve configured external providers; legal compliance must be assessed separately.

### DON'Ts
*   **DON'T get defensive.** If a panelist critiques a feature or finds a flaw, thank them. (e.g., *"That's a great observation, we didn't account for that specific edge case. We will note that down."*)
*   **DON'T panic if a bug happens.** If something errors out during the demo, stay calm. Say, *"It looks like we are hitting a slight environment snag, but the intended flow here routes the document to Finance."* Move on smoothly.
*   **DON'T read straight from the screen.** Maintain eye contact with the panelists. The screen is for *them* to look at. You should know the system by heart.
*   **DON'T make up technical answers.** If asked a highly technical question you don't know, say: *"I would need to consult our documentation on that specific library, but the general concept is..."*
*   **DON'T say "we just used it because it was easy."** Always frame your answer as a deliberate decision: *"We chose X over Y because..."*

---

## ❓ 6. Mock Panel Questions & Scripted Answers

### 🏗️ Architecture & Tech Stack Questions

**Q1: Why did you build the AI backend in Python instead of Node.js?**
> "Node.js is fantastic for handling concurrent web requests, but Python is the undisputed industry standard for Machine Learning and AI — libraries like PyTorch, EasyOCR, Scikit-Learn, and Prophet are all Python-native. By splitting them into separate microservices, each service does what it is best at. The Node.js API stays lightweight for fast CRUD operations, while the Python Flask service independently handles the compute-heavy OCR and ML tasks without blocking the main server."

**Q2: Why MySQL and not MongoDB? Wouldn't a NoSQL database be more flexible?**
> "Our data is inherently relational. Every document belongs to a student, every step log references a document and a clerk, every notification links to a user. MongoDB would require us to manually embed or reference these relationships, risking data inconsistency. MySQL enforces referential integrity through foreign keys — if we try to create a step log for a non-existent document, the database itself will reject it. For a mission-critical audit trail system, that guarantee is non-negotiable."

**Q3: What is a microservice architecture and why did you use it?**
> "A microservice architecture means splitting the system into independent services that communicate via APIs. Our system has three: the Node.js API Gateway, the Python AI Engine, and the n8n Orchestrator. This design means if the AI Engine crashes due to a heavy OCR job, the main API and all the dashboards continue running normally. It also allows us to scale them independently — for example, we could deploy the AI Engine on a GPU server while keeping the API on a cheaper instance."

**Q4: Why Vite instead of Webpack or Create React App?**
> "Vite provides the SPA development server, HMR and production builds used by this project. We chose the existing React/Vite setup for the team’s workflow, rather than claiming a measured speed advantage over another bundler."

**Q5: Why did you use n8n instead of just putting the routing logic inside your Node.js code?**
> "n8n makes the existing assignment workflow visible and configurable. It does not replace server authorization or the shared legal transition map. Adding an institutional stage still requires implementation and testing. Unassigned work uses the college queue fallback if routing is unavailable."

### 🤖 AI & Machine Learning Questions

**Q6: What happens if a student uploads a blurry image and the OCR fails?**
> "OCR may fail to read genuine evidence. Inconclusive registration remains pending for Admin review with a reason; staff inspect and correct intake fields. The score describes extracted-field completeness, not the probability that the document is genuine."

**Q7: How did you train your Prophet forecasting model? Where did the training data come from?**
> "Node groups documents.created_at by Manila day, fills observed zero-request days and passes the complete daily counts to Prophet, which is fitted per request. The system requires at least 14 complete days and uses at most 90. ai-engine/mock_data_gen.py is an optional synthetic generator, not evidence that the active database is real PLP history. Inspect the expanded forecast input counts and record provenance before describing training data. More data alone does not establish accuracy."

**Q8: How accurate is your volume forecast? Did you validate it?**
> "The current API returns seven predictions without upper/lower bounds. This guide does not establish a measured accuracy result. We must evaluate held-out real history against the same recorded request-arrival target, report errors and limitations, and avoid presenting synthetic worked examples as validation."

**Q9: Your system title says 'AI-Assisted' — is the OCR really AI or just pattern matching?**
> "EasyOCR supplies pretrained neural text recognition. TRACE then uses parsing and text-matching rules to extract and compare fields. The AI component and the application’s matching rules are different parts; neither proves document authenticity or ownership."

**Q10: What is Random Forest and why is it suitable for your recommendations engine?**
> "Random Forest combines decision trees, but the earlier four-coded-example prototype was not a validated operational model. Production no longer uses its classification. Current advice is descriptive analysis of real aggregates with explicit sample limits; a queue count or empty queue cannot confirm efficiency."

### 🔐 Security & Data Privacy Questions

**Q11: Is the system secure? What security measures did you implement?**
> "TRACE uses bcrypt passwords, applicable login MFA, session expiration/revocation, current-account checks and service-level ownership/college authorization. SQL inputs are parameterized and files require authenticated access. These are implemented controls, not a guarantee that no vulnerability exists or proof of legal compliance; deployment and negative-path tests remain necessary."

**Q12: How do you prevent SQL injection attacks?**
> "Models pass untrusted values as separate SQL parameters and keep sort/update identifiers allowlisted. This protects the covered query paths from input being interpreted as SQL. We still review every new query and test ownership/role boundaries; no technique makes all application vulnerabilities impossible."

**Q13: What if someone steals a JWT token?**
> "Bearer-token theft can permit access until expiry or revocation. Tokens expire after 24 hours, and current-session logout, logout-all/token-version invalidation and deactivation are implemented. Caddy provides HTTPS on the deployed API. Protect devices and review security activity; token expiry alone is not sufficient."

### 💳 Payment & Workflow Questions

**Q14: Why manual verification instead of an automated payment gateway like PayMongo?**
> "PLP's Finance Office requires manual human verification of all payments per their existing accounting policies — every peso has to reconcile against their own books, not a third party's dashboard. Our system digitizes that workflow rather than replacing it. A provider abstraction in `services/payment/` means a hosted gateway could be added later without touching the document pipeline; today every method resolves to the manual provider."

**Q15: What happens if the Finance Clerk rejects a payment?**
> "It returns to `PENDING_STUDENT_PAYMENT` — one step back, to the student who can fix it. They get an SMS and email explaining why, and can submit again. The rejection is permanently logged in `step_logs` with the clerk's ID and timestamp. That one-step-back rule is uniform across every desk: a rejected document always lands with whoever can actually correct it, never back at the start."

**Q16: Can you walk us through the complete lifecycle of a document request?**
> "The nine-stage path is intake, Secretary evaluation, Secretary processing, awaiting student payment, Finance verification, paid pending Secretary release, Secretary OR verification, ready for release, and completed. Secretary prices through actual-page entry and server fee calculations. Finance alone clears payment; receipt inspection and physical handoff are separate. Stage changes are recorded and the student is notified through configured channels."

**Q17: Why does the Secretary set the price rather than the system, or Finance?**
> "Admin controls rates; Secretary knows the actual printed pages and enters them. The server computes final charges from the saved applicable schedule, quantities and itemized fees. Filing shows rates only; the final breakdown appears after pricing. Finance verifies that payment arrived rather than choosing rates. Saved breakdowns, pages and clerk identity make historical charges explainable."

**Q18: A student requests three documents at once. Do they pay three times?**
> "No — once, for the whole request. Pricing is per document because page counts differ, but billing is per request group, and the system only bills when the *last* document in the group has been priced. If we billed after the first, a student with three documents would be sent to the Finance Office three times. One receipt then settles all three, and Finance clears them in a single action."

**Q19: What if a student has no internet, or does not want to pay online?**
> "Window 1 can file an authorized walk-in request through the same evaluate-first workflow. Secretary issues the payment slip after pricing. Finance logs and verifies the payment, using OCR suggestions or manual entry. Finance may defer OR issuance; acknowledgment and the issued OR remain distinct. Issued receipt inspection and document release still apply."

### 📊 Scalability & Deployment Questions

**Q20: Can this system handle multiple universities or just PLP?**
> "The implementation targets PLP. Several rates, catalogs and form fields are configurable, but desk names, routing-account conventions, school text matching and policy assumptions still exist in code/configuration. Supporting another institution requires a reviewed adaptation; this is not a multi-tenant platform."

**Q21: What would you change if you had more time or a Version 2?**
> "Password recovery, authenticator setup, profile/email gates and Docker deployment already exist. The approved Support redesign and local controlled capacity test are implemented. Remaining acceptance includes matching deployment, production-like staging load, physical devices, restore rehearsal and validated forecast/OCR evaluation. Hardware scanner integration or automated payment settlement would require separate institutional approval."

**Q22: How would you deploy this system in production?**
> "The current arrangement uses a separately deployed Vercel frontend and Docker Compose for Express, Flask/Gunicorn, MySQL and n8n behind Caddy HTTPS. We back up data/uploads/configuration privately, verify an off-server copy, build the matching image, apply reviewed explicit migrations and run schema/health/live acceptance checks. Schema presence and checksums do not replace a test restore."

**Q23: What if 100 students submit requests at the same time?**
> "Non-blocking I/O and pooling do not establish capacity. The approved messaging test uses at least 100 synthetic simultaneous users, p95 saves within two seconds and reads within one second, plus message integrity, retry and assignment-race checks. Results must identify the test environment. This requirement remains unverified until the controlled test passes; OCR capacity is a separate workload."

### 🧪 Testing & Data Questions

**Q24: How did you test the system?**
> "PROGRESS records the executed Vitest regression suites, lint/build and synthetic browser checks with their limitations. The correct desk order is intake → evaluation/preparation/pricing → payment/Finance → OR inspection/handoff → release. Local mocks and emulation do not prove external mail delivery, physical-phone behavior, model accuracy or production load capacity. We report only checks actually performed."

**Q25: Where does your mock data come from?**
> "ai-engine/mock_data_gen.py creates synthetic demonstration records, not evidence of institutional demand. Forecasting now uses recorded document-arrival aggregates, and production advice no longer uses the four-coded-example classifier. Never seed synthetic records into production to populate charts or present worked examples as validation."

---

## 🔥 7. MUST REMEMBER (Cheat Sheet)

Do not freeze up during the demo! Keep these on a sticky note next to your laptop:

*   **Demo credentials:** Prepare synthetic accounts privately. Never publish a shared password, QR enrollment secret, recovery codes or real student evidence in this guide. Complete required staff password/MFA setup before rehearsal.
*   **Test Accounts:**

| ID | Role | College |
|:---|:---|:---|
| `STU2024001` | Student | BS Information Technology |
| `FINANCE001` | Finance Clerk | — |
| `WINDOW1001` | Window 1 Clerk | — |
| `SEC-CCS001` | Secretary | College of Computer Studies |
| `SEC-CON001` | Secretary | College of Nursing |
| `SEC-CIHM001` | Secretary | College of International Hospitality Management |
| `SEC-COE001` | Secretary | College of Engineering |
| `SEC-CED001` | Secretary | College of Education |
| `SEC-CAS001` | Secretary | College of Arts and Sciences |
| `SEC-CBA001` | Secretary | College of Business and Accountancy |
| `ADMIN001` | Registrar Admin | — |

*   **Demo Flow Script:** Student profile/email → New Request → Window 1 intake → Secretary evaluate/prepare/price → Student payment proof → Finance verify/issue OR → Secretary inspect OR/handoff → Window 1 release → Admin reports/insights
*   **Services to check:** Express 3300, Flask/Gunicorn 5005, MySQL, configured n8n 5678 and Caddy HTTPS; Vite 5273 is development only. Use the matching deployed frontend and approved synthetic records.
*   **Panic Phrase:** *"We're experiencing a minor environment inconsistency, but the intended behavior here is..."*


### 🆕 Current Account, Finance & Support Notes

| Area | What to explain or demonstrate |
|:---|:---|
| **Profile & email** | Keep email at signup; Profile Verify sends a one-click link valid once for one hour. Requests/payments require verified ownership. Saved profile completion is checked by UI and API; alumni first submit the configured Graduate Application. |
| **College & Program** | Admin enters Registrar-approved programs. College and Program are linked selections; college display name, college_id and program are separate values. School graduation may predate 2002; PLP graduation starts at 2002 and is distinct from last attendance. |
| **MFA & sessions** | Security appears in each profile. Authenticator QR setup and hashed recovery codes are implemented; Admin-assisted staff enrollment is controlled. Optional Admin personal-browser trust follows successful MFA and expires at the next Manila midnight; browser privacy can prevent persistence. |
| **Fees & OR** | Admin schedules/college overrides → Secretary actual pages → server final breakdown. Extras apply once per document type; grouped payment waits for every item to be priced. Deferred OR sends acknowledgment first; 4:00 PM is outside same-day issuance, and elapsed age is not an issuance promise. |
| **Presentation & records** | Shared light/dark controls, 100–200% text, role tours and Main/More navigation are implemented. More is seventh after six page destinations. Reports show shared visible draft filters and Apply, with a header Export action for dataset/CSV options. KPIs and Records remain on the main page. Secretary exports remain college-scoped. Finance preserves whole payment groups and exports their documents using the shared 36-column contract. Screenshots, a synthetic CSV and local verification limits are in [README workflow walkthrough](../README.md#main-workflows). |
| **Support redesign** | Unified FAQ-first tickets, FCFS one-live-ticket assignment, Manila calendars/reply timers, private files, requirement replacements/history, metrics and aggregate advice are implemented locally. Demonstrate the matched deployed revision only; use SUPPORT_VALIDATION for measured scope. |

> 🧪 **Evidence reminder:** State which commit/environment was tested. Demo data, a healthy container, a passing suite and a successful live workflow are different kinds of evidence. Do not claim recognition accuracy, model accuracy, guaranteed notification delivery or legal compliance from a screenshot.

### 💬 Support demo and questions

1. Start a synthetic general ticket without a request; open a maintained FAQ and record explicit feedback. Helpful is distinct from resolved.
2. Select Talk to staff and show the same ticket in the queue. Show its position and honest unavailable/closed-hours message, not a promised countdown.
3. With two Window 1 accounts, declare availability and claim oldest tickets. Each has one live slot; reload preserves assignment.
4. Request a student reply. Explain the configurable 3/5 service-minute warning/timeout and closed-hours pause. A returning student rejoins the queue tail without losing history.
5. In an authorized open linked case, request an approved supporting document, submit it, reject with a reason, and show retained corrected/replacement history. Contrast 3 × 5 MB chat files with the 10 MB case requirement upload.
6. Show Support analytics separately from document turnaround: medians/p90, sample counts, missing values, explicit FAQ outcomes and selected period. Support AI advice uses aggregates and transparent rules; it is not a trained chat model or demand forecast.

**If asked “Can it handle 100 users?”**
> “A controlled local run kept 100 authenticated Socket.IO clients connected while saving and reading their tickets. All 100 messages persisted, 20 retries created no duplicate rows, and ten clients reconnected. Latest p95 was 558 ms for saves and 392 ms for reads. This excludes uploads, WAN, Caddy and browser rendering, so we still need matching staging results before claiming production capacity.”

**If asked “Are uploaded files guaranteed safe?”**
> “Uploads have limits, actual content parsing, random filenames and authenticated ticket ownership checks. Failed/retried temporary files are cleaned up. These controls reduce exposure but do not constitute antivirus scanning or a legal-compliance certification.”


## Revision 2 Batch 10 — Support / Messaging UI

Support now follows the main TRACE Figma two-column layout, with aligned readable ticket rows, local search of loaded authorized metadata, contextual linked-case viewing, a labeled confirmed availability switch and a primary Window 1 claim action. Success feedback uses dismissible toasts; failures and confirmations remain in context. The compact widget preserves drafts across close/reopen. Digital evaluation separates discussion into a side panel or a mobile view without discarding either draft. Existing ticket/desk/college authorization, FAQ/reply/requirement actions, service hours and queue assignment remain; no new staff chat connection or unsupported presence/read/unread data is added.

See [README workflow walkthrough](../README.md#main-workflows) for the screenshots, walkthrough and local evidence. Batch 10 adds **no migration or environment variable**; [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) tracks required earlier migrations. These are repository changes for dev, not a claim that the live site is updated.

## Revision 2 Batch 11 — explaining Support Analytics

Show the [account-free analytics walkthrough](../README.md#main-workflows) and distinguish ticket service from document turnaround. Point out imported-cohort exclusions, escalation numerator/denominator, explicit FAQ resolution, historical backlog cutoff and service versus wall minutes. Explain that missing samples are not zero and that assignment/response episodes are volume measures, not staff rankings. The interface follows the Admin Figma card hierarchy while using recorded values rather than mock trend graphics. Screenshots use synthetic responses; do not present them as real institutional outcomes or a deployed update. No new migration is required.

## Revision 2 Batch 13 — internal staff assistance

Demonstrate Finance, Secretary or Window 1 opening **Support → Internal assistance → New concern**, confirming a category and text concern, then an Admin claiming and replying. Show Await staff reply, a creator response retaining the assignment, resolution with a note, and retained history on reopening. A second staff account cannot read the creator's ticket; an unassigned Admin can monitor but cannot reply until claiming. Admin monitors student Support without intervening. This queue is asynchronous, text-only and separate from student support hours, files, queue metrics and AI insight inputs.

Use the [README screenshots and walkthrough](../README.md#internal-assistance-walkthrough) for account-free review. These are synthetic local UI examples, not proof of live notification delivery or database contention. The matching migration/API/frontend must be deployed before demonstrating the feature. The subsequent authorized staff connections are described below and in SYSTEM_WORKFLOWS.

## Additional chat connections — demonstration

On the matching deployed revision, show **Support → Staff coordination → New conversation**, the eligible recipient directory, confirmation of a first message and reuse of an existing pair thread. Show a subsequent direct Send, retained older history and draft preservation across categories. Explain that students remain in Window 1 Support tickets; Finance/Secretary case discussions keep their existing authorized context. Secretary peers are college-scoped, while Window 1/Finance coordination grants no new college record access. Admin monitors staff discussions read-only and replies only through assigned Internal Assistance concerns.

The [README screenshots/walkthrough](../README.md#staff-coordination-walkthrough) use synthetic actual-component records. Sorted account locks, unique pair/scope keys and durable message retry events are implemented; local unit/model simulations do not establish live MySQL contention or delivery. The preserving staff migration is separate from student/internal support storage and metrics. TRACE-78 connections were initially deferred and are now implemented following the user's explicit authorization.

The integration review aligns Receiving Desk with Window 1 authority, retains named processor assignments across both labels, and scopes linked case conversations by the saved routing college. Demonstrate two successive notification links on an open Support screen; changing access clears protected cached history. These are locally tested repository behaviors, with genuine account/college changes and notification delivery still requiring staging verification.


## Admin functional review walkthrough — 2026-10-12

Open **Support → Internal assistance** for staff concerns; Admin monitors operational student
conversations without replying. In **Efficiency Analytics**, switch between **Document
Efficiency** and **Support Analytics**; these use separate sources and reporting views.
**Scan Field Detection** is the average percentage of expected fields detected in scans,
not verified AI accuracy. Current-method samples and exclusions are shown; no eligible
samples means **Not measured**. The optional **Include 3 demo scans** preview labels example
data and keeps the recorded-only result visible. Explain it as a demonstration, never
as measured institutional accuracy. New eligible scans affect its weighted average on
refresh. See [the formula and examples](AI_MODEL_EVALUATION.md#ocr-metric-correction).
In **System Maintenance → Accounts**, choose Students, open a
student/alumni and review the deactivate/reactivate confirmation. History and identity
verification remain; deactivation invalidates existing sessions. In any reporting role,
edit visible **Student ID / Name** and other filters, choose **Apply Filters**, then
**Export → Export CSV**. Fee and purpose details are readable; timestamps retain exact
Manila date/time. Secretary college scope and Finance complete payment groups remain.
This follow-up adds no migration. Screenshots use synthetic records; live deployment and
actual service outcomes are verified separately. Cosmetic redesign awaits the next Figma.


## Admin insight/table repair demonstration — 2026-10-12

Show a Secretary-processing or student-payment queue with evaluation/release at zero. The
workload card still reports those outstanding documents and does not claim Optimal Performance.
Inspect the snapshot timestamp and choose Refresh insights. Explain that active document volume
counts differ from Manila-day step actions; recorded delays require duration evidence. The
experimental model only uses its three count inputs and is not trained on institutional outcomes.
Show Activity Logs at phone width: full document type, tracking number and action are separate
wrapped values inside a horizontally scrollable table. Existing approvals and desk rules remain.
No migration is added; rollout needs matching backend/frontend and an AI image rebuild.


### Finance workflow follow-up — 2026-10-12

Finance pack setup/replacement uses first and last serial bounds that imply exactly 50 consecutive numbers. The server infers the changing numeric block and preserves zero padding/literals; replacement is audited without a clerk reason input. All previous reserved serials remain unavailable. Pack activation creates no receipt. Confirmed eligible payment verification automatically issues one OR and snapshots saved student identity/cashier/payment; Later defers the copy only. An immediate copy is validated and published atomically with clearance and issuance. The 4 PM Manila cutoff remains; explicit after-cutoff issuance can be completed from Payment History on an eligible later date. Printing/reprinting never allocates. Duplicate uploads on verification retry are discarded while the original published file is retained.

Verification owns receipt settings, printer calibration and receipt/pack audits. Payment History contains shared history filters, grouped cleared payments, View OR / Upload OR and missing-copy elapsed time; the exceptional Issue pending OR action prevents after-cutoff or historical payments from being stranded. History has no export/configuration block. Finance Reports & Export uses the same shared report component/API as the other roles, including applied-scope safeguards and readable CSV. Review contains no Discussion module; Support remains available.

Additive `migrate_student_name_parts.js` adds nullable first/middle/last profile fields and does not split old names or rewrite `users.full_name`, request names or issued snapshots. Students confirm matching identity parts in Edit Profile with the existing Save confirmation; the API validates against the saved full name under the profile lock and logs confirmation. Finance takes saved parts from the identified student, ignores client payor overrides and preserves unsplit historical names. New snapshots print Last name, First name M.I. Historical receipts keep their original name. Existing print fields/order remain; exact physical alignment still requires the original receipt reference and printer calibration.

Verification in this disconnected session covers source parsing and actual service/helper execution with in-memory model fixtures. Full Vitest, build/lint, browser and MySQL checks are pending; prepared source is not evidence of cloud deployment. See the consolidated [migration ledger](DEPLOYMENT_CHECKLIST.md) and [README walkthrough](../README.md#finance-receipt-walkthrough).

New signup collects first/middle/last fields, builds Full Name automatically and saves parts with the account in the registration transaction. Existing accounts confirm their unsplit names in Edit Profile; legacy API clients that send only Full Name remain supported. Identity fields are entered manually; Full Name follows the confirmed name parts. The new form requires first/last before confirmation; middle remains optional.


## 2026-10-13 — field limits and registration review

Field limits are enforced in the UI and relevant account/profile/catalog/application services, while pricing retains server-calculated totals. Mobile numbers accept two Philippine spellings and save as 11-digit local text. CSV applies a text marker and formula escaping; spreadsheet import behavior still depends on the reader. Password creation remains 8–64 without shortening existing login credentials. The ID check validates visible field consistency, not physical authenticity. Whitespace tolerance retains all college letters; incomplete reads require Admin approval, and pending login is denied. Actual supplied-photo OCR accuracy has not been measured.


## 2026-10-13 — unclaimed pickup SMS reminders

The pickup reminder is an elapsed-calendar schedule from an actual readiness transition: three days, then weekly while unclaimed. It uses a preserving SQL attempt ledger, replica serialization, unique period keys and fresh eligibility checks. Synthetic MySQL tests establish scheduling/deduplication behavior, not live SMS acceptance or handset receipt. A configured key is reported as configured/unverified; provider acceptance and unknown/failure are distinct. Missed periods and uncertain sends are not replayed.

### Current-student enrollment information

Current students save Year Level and Section in Educational Background. Both are
required by the saved-profile request gate and visible in authorized student lookup.
College graduation/last-attendance fields are alumni-only in the profile and are
not required for current-student requests. TOR still snapshots trusted Year Started;
its years never determine printed pages or prices. Alumni education, document
availability, graduate-application checks and existing historical values remain.
The additive `migrate_current_student_details.js` migration must precede the matching
API upgrade. This change is locally tested code, not a claim of live deployment.


### October 16 review correction

Student chat is reached through Support; the dashboard launcher is removed. Support Analytics is Admin-only in Efficiency Analytics and its API denies non-Admin actors, including Window 1. Operational tickets, support settings, archive rules, and actual billing transitions retain their existing permissions. The updated payment card uses saved fee snapshots and one amount/action per request group. Payment-slip preview supports printing or browser Save as PDF. Shared Preferences, selected-file feedback, centered phone dialogs, FAQ-only scrolling and paged record tables are local UI corrections; deployment and physical-device acceptance remain separate.

## October 17 demonstration notes

Show separate browser tabs with distinct actors, reload them, and explain tab-local credentials plus unchanged server authorization. Demonstrate the three-step signup/request drafts, required current-student declaration and saved study years. Explain that Regular/Irregular reuses an existing column and does not change role. Show a confirmed mutation updating a list/count without reloading the page; refresh events contain resource names only.

Demonstrate Admin assigning a pending intake to a same-college Secretary and the Secretary completing the existing intake checks. Unassigned/cross-college work remains denied. Show split-name editing with the saved suffix retained and the audit transaction. All Support accounts expose visible guidance and role-authorized controls; resolved conversations remain archived. Use synthetic data. Local test and Figma coverage is evidence of implementation review, not measured production effectiveness or a claim of perfect pixel parity.

## Registration preflight follow-up

Demonstrate a reserved Student ID blocked before leaving signup Academic Details. Explain that the public check returns availability only, has an independent rate limit and creates no reservation. Final validation and the unique database index still prevent concurrent duplicate accounts. Rejected applicants reuse their existing account. New Request Back preserves drafts/files, while only the first-step Cancel dismisses.

### October 17 analytics correction supersedes prototype explanations

For current demonstrations, Prophet consumes complete Manila-day document-arrival counts from Node, including observed idle days and exact type history. Estimates require 14 complete days, preserve zero and use an explicit deterministic historical weekday fallback when the model is unavailable. The daily-step-log forecast target and four-coded-example classifier are superseded implementations. Production recommendations now use measured queue/report aggregates through the AI engine’s descriptive rules. Document and Support Analytics show advice for the loaded measurements separately from the authoritative charts. This does not establish validated predictive accuracy, causal bottlenecks or staffing gains. No identity or transcript is sent.

Latest Support demonstration: the i icon opens the authorized linked request; permitted ticket-action icons reveal their names on hover and retain confirmations. Guidance is below messages and the identity header has no internal scrolling. Window badges partition the loaded records into current work, completed and other statuses, with the list limit visible. Admin service failures show unavailable instead of an assumed empty queue.


## Admin PDF report demonstration

Apply a small synthetic reporting period in Reports & Export and download **Export PDF → Filtered document records**. Open the file and reconcile its scope, totals, chart and document table. In Efficiency Analytics, export Document Efficiency and Support Analytics; explain each duration sample/denominator and show available aggregate AI advice separately from measured values. Blank/missing data is not zero. The server re-reads current authorized values and includes every matching row up to the stated 1,000-row PDF limit, independent of screen pagination. Do not claim production deployment or forecasting accuracy from synthetic report fixtures.


## Forecast visibility, source evidence and accuracy — October 18

Open **Admin → Dashboard → 7-Day Volume Forecast**. The chart uses a solid line for the latest 14 complete days of recorded requests and a dashed green line for all seven future estimates. Dated numeric cards retain each day, including zero. Expand opens the same chart and **View forecast data source and daily counts**, which lists the complete aggregate model input with pagination. Snapshot time, exact type, day/sample count and method label distinguish Prophet, the historical weekday fallback and insufficient history. Current-day partial requests are excluded; predictions cover tomorrow through day seven in Manila time.

The source is `documents.created_at`, counted once per requested document (not once per student/request group or workflow action). The model sees dates/counts only, up to 90 complete days, with a 14-day minimum. Seeded/synthetic records in that database are also records; the code cannot certify their institutional provenance. `ai-engine/mock_data_gen.py` is an optional synthetic-data writer and must never be presented as a real Registrar dataset or run to manufacture validation evidence.

Defense wording: “Our prototype forecasts incoming document counts from recorded daily requests. We demonstrate the input counts, selected type, dated estimates and model/fallback label. Predictive accuracy on held-out real institutional data has not yet been established, so we do not claim an accuracy percentage.” Do not substitute scan field detection, successful software tests, forecast confidence or descriptive queue advice for measured model accuracy. OCR needs its own labeled-image/text/field evaluation; rule-based report advice has separate definitions and denominators.

For an accuracy study, freeze provenance-checked real history and use multiple chronological cutoffs, fitting only earlier data. Match the actual seven-day target and the production one-day gap: after the last complete training day, the simulated current day is excluded, and evaluate days 2–8 after that training cutoff. Compare dated actual vs predicted counts and the historical-weekday baseline over the same folds. Report MAE (documents/day), RMSE, tested dates/sample size and per-horizon errors, not an invented percent. Zero-demand days need suitable metrics rather than undefined percentage errors. This is an evaluation procedure, not an executed result. Prophet documentation: https://facebook.github.io/prophet/docs/diagnostics.html.


## Evaluate forecasting against saved history — October 18

Admin → Dashboard → 7-Day Volume Forecast → Expand → **Evaluate existing history** runs a read-only rolling-origin backtest for the selected exact document type. At least **22 complete Manila days** are required: 14 training days (the production minimum), one skipped simulated current day and seven unseen target days. More history supports up to five nonoverlapping weekly target windows. Only earlier rows enter each fit, using the same Prophet configuration/seed as the production forecast. The selected period, tested dates, training cutoffs, zero/nonzero samples, model version/settings and every actual/predicted/baseline value remain inspectable.

Report **MAE and RMSE in documents/day** and **WAPE as percent error**, alongside the historical-weekday baseline scored on exactly the same dates. WAPE is undefined when all target counts are zero. Do not convert these metrics into a generic accuracy percentage. Results can show Prophet is worse than the baseline; the interface preserves that result. Few folds/two weekly cycles or all-zero targets are limited evidence. Missing history/model failure produces no score. This validates the saved dataset only, not unseen institutional operations.

The data-origin panel identifies TRC-MOCK-prefixed generated records when present. Absence of that prefix does not certify real data: other synthetic records can exist. For defense, disclose provenance, train/test windows, tested samples and method. Forecast evaluation does not measure OCR accuracy or validate a Random Forest. Current queue recommendations are explicit workflow rules with concrete next steps for intake, evaluation, preparation/pricing, payment, OR/handoff and pickup; they require staff review and do not automatically assign staff or change requests. The earlier four-example classifier is not active.

Document-analytics advice is served from the same packaged analytics module and now includes a stage-specific suggested action when measured stage samples support a comparison. Saved measurements remain available during AI outages. Rebuild backend **and ai-engine**, then deploy the matching frontend; no migration/new dependency/environment variable is needed. Older images omitted analytics.py, which can cause both forecast fallback and unavailable document advice. Confirm both routes after deployment rather than inferring availability from an old screenshot.


### Graduate application academic selection
As a new alumnus, choose College first and Degree Program from its approved catalog, complete the configured questions, and confirm submission. Show the saved application and access refresh. Explain that the API independently checks active College/Program membership inside the save transaction; this application stores readable answer snapshots without changing the profile’s academic routing. Existing application answers remain readable. No new migration is required for this patch.

## October 18 compact demonstration follow-up

Use the scan/forecast **info icons** for methodology. The scan demo control lives in its info dialog; its label, sample counts and recorded-only result remain on the card. For forecast data and backtests, choose **Expand → info**.

During signup, show **Irregular → Are you a transfer student? → Yes → Previous School**, then review the answer before confirmed submission. These are existing saved profile fields; this addition needs no migration.

Personal-browser recognition now has a first-party authentication proxy implementation. Say “after deployment, an opted-in verified browser can reuse its proof until midnight Manila”; distinguish the successful local synthetic login/cookie test from deployed Brave/Safari acceptance. See [deployment and test scope](BROWSER_TRUST_PROXY.md).
