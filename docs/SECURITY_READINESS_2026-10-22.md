> Follow-up: `SECURITY_ROLLOUT.md` supersedes the original no-migration rollout notes below. The first batch remains historical evidence; do not use its rebuild commands for the follow-up.

# TRACE security and operations review - October 22, 2026

Reviewed baseline: latest `main` commit `b973af7` (October 18), whose tree matches `dev` `56c466a`. This is a repository review with local regression tests and npm advisory checks. It is not a live penetration test or confirmation of cloud settings, production credentials, applied migrations, deployed versions or restore readiness.

## First batch implemented

- **Private API responses:** all `/api` responses receive `Cache-Control: private, no-store`, `nosniff` and a server-generated `X-Request-Id`, including failures before authentication. Express no longer advertises its framework header. Public build assets retain their independent cache rules.
- **Errors and logs:** common controllers and the global handler retain useful 4xx validation while masking 5xx implementation messages. Main error logs contain a bounded error code, status and correlation ID instead of serializing errors that can contain SQL, student values or secrets. Database readiness still returns 503 but exposes only `database: unavailable`. This does not establish complete centralized logging or guarantee every provider log is scrubbed.
- **Authentication availability:** invalid/expired tokens return 401; failure to read account/session storage returns 503 and denies access, rather than misclassifying an outage as a bad token.
- **Permissions:** Admin Insights has a route-level Admin check. Tracking history now verifies request ownership/Secretary college scope before reading events. Secretary student-profile lookup uses the same live college boundary as request access. Registration ID/diploma proof files require the owner or Admin verification; broad ordinary desk-upload permissions no longer grant access to another account's registration proof.
- **Production defaults:** an absent production CORS allowlist does not reflect arbitrary browser origins. The known public JWT placeholder prevents production startup. Neither CORS nor an unguessable URL replaces authentication and resource authorization.
- **Uploads:** ordinary document uploads require matching exact extension and MIME type; a `.html` filename cannot pass by claiming `image/png`. Existing image/PDF/Word types remain accepted. This is format filtering, not malware scanning or proof authenticity verification.
- **Deployment exposure:** Compose publishes backend 3300, AI 5005 and n8n 5678 on `127.0.0.1`; Caddy retains public 80/443 and Docker service-to-service names continue to work. This takes effect only after recreating the deployed services. Host firewall and Docker version still need checking.
- **Local log growth:** six Compose services use bounded JSON logs, 10 MB per file and three files. These operational logs are separate from database audit events and are not a long-term retention system.
- **Dependencies:** affected backend/runtime and frontend lockfile dependencies were updated. Nodemailer moved to 10.2.0, Multer to 2.4.0, MySQL2 to 3.24.6, sanitize-html to 2.18.1, proxy-addr to 2.0.8, Engine.IO to 6.6.11, qs to 6.16.1, Axios to 1.20.0 and React Router to 7.18.4. Vitest is 4.1.12. Node's built-in watch mode replaces the vulnerable development-only nodemon dependency chain; `npm run dev` remains the command.
- **CI:** `.github/workflows/security-ci.yml` adds isolated backend tests/audit, frontend tests/lint/build/audit and Python analytics tests. It uses read-only repository permissions and action commit SHAs resolved from upstream v6 tags. It has no production credentials or deployment steps. Branch-protection enforcement is a separate GitHub setting and is not established merely by adding the workflow.

## Area-by-area assessment

| Area | Evidence in current source | Remaining work / acceptance evidence |
| --- | --- | --- |
| Authentication and permissions | bcrypt password hashes; staff MFA; token expiry/version checks; persistent revocation; account deactivation/password-change gates; owner/desk/college checks; new tracking/profile/proof restrictions | Complete an endpoint-by-endpoint role/resource matrix, including Finance field minimization and ordinary desk-upload access. Exercise same-role users with different ownership/college. Verify seeded accounts and real secrets on the deployed system. |
| Data isolation and RLS | MySQL accessed through the backend; service/model predicates enforce student and college scope. No native database row-policy layer is implemented here. | Use a dedicated least-privilege runtime DB account and separate migration credentials. Review table grants and SQL scope. If database-enforced row policies become a requirement, evaluate a deliberate database/architecture change rather than describing these application checks as native RLS. |
| Rate limiting and abuse control | Per-IP login/registration/reset/ID-check limits; broad API limiter; database-backed failed-login lockouts. Limit counters use process memory. | Check actual client IP through both direct Caddy and Vercel-auth proxy paths. Avoid shared-campus/proxy IPs becoming a single user bucket. Add per-account/cost/concurrency limits for OCR, uploads and exports. Introduce shared counters before multiple API replicas; test restart and parallel-replica behavior. Health/readiness endpoints also need an abuse policy that preserves internal probes. |
| Caching and CDN | Vercel frontend deployment configuration; immutable hashed assets in optional nginx; PWA precaches build assets. No API runtime service-worker caching configured. New private API policy covers records/files/errors. | Verify real CDN/proxy headers, signed-in downloads, logout/back navigation and cross-account requests. Cache public versioned assets; exclude private student/profile/payment/support responses. Any future object storage must use private access and authorization or short-lived scoped delivery. |
| Load balancing and scaling | One API instance, local upload volume, default in-memory Socket.IO adapter, bounded MySQL pool. AI uses Gunicorn; model cache is process-local. Support/pickup timers already have database locking/reservation safeguards. | Measure load first. Multiple API instances need shared upload storage, shared rate-limit counters and cross-instance Socket.IO delivery; polling additionally needs affinity. Validate cross-instance revocation/notifications and timer locks, DB connection totals and AI memory/concurrency. Current fixed host-port mappings are not a scale-out configuration. |
| Error tracking and logs | Database security events, per-account/Admin log access, console/Caddy logs; new correlated sanitized error logs and local log rotation | Add protected centralized collection, redaction, retention, alert routing and exception monitoring. Keep tokens, cookies, passwords, proofs and full message bodies out of telemetry. Verify who can read/export logs and test that an alert actually arrives. |
| Availability and recovery | API readiness checks the DB; container health checks/restart policies; persistent MySQL/uploads/n8n volumes; documented backup and earlier local restore procedures | A single VM/DB is a failure point. Verify current off-host database and upload backups, protected MFA/n8n encryption keys and restore instructions. Restore into an isolated environment and record actual data loss/recovery time against agreed RPO/RTO. Add external uptime and capacity alerts, graceful shutdown and rehearsed rollback. A volume, snapshot instruction or historical local restore is not proof of today's recovery ability. |
| CI/CD and version control | Public GitHub repository, `main`/`dev` history, successful Vercel status on reviewed main; new pinned quality/security workflow | Require appropriate CI checks and review on protected branches; check actual rules rather than infer them from source. Separate staging/production configuration, record immutable backend/AI image versions, coordinate migrations and retain a tested rollback release. Existing backend rollout remains manual. Secret scanning and container/Python vulnerability checks remain to add. |
| Cloud and compute | Compose stack can run on a VM; docs mention GCP and Oracle; AI/OCR and database workloads share the stack | Verify actual provider/region, VM resources, OS/Docker patching, IAM/service-account roles, network exposure, private DB access/TLS, disk encryption and billing alerts. Confirm performance under OCR/load and set resource limits with evidence. No cloud configuration or paid service was provisioned by this review. |
| Hosting and deployment | Vercel frontend, Caddy API TLS configuration, Docker services and persistent volumes; frontend auth proxy rewrite | Confirm live DNS/certificate expiry, exact deployed SHA, frontend/API origin settings and trusted proxy paths. Route external API traffic through the intended TLS proxy. Protect n8n management with localhost/SSH access or a separately secured HTTPS management endpoint. Verify environment/migrations and run role/notification checks on staging before release. |

## RLS explanation for this stack

TRACE currently has **application-enforced row authorization**. The backend decides which student, desk or college may read/change each record and supplies parameterized SQL filters. A login alone does not authorize every row. A UI hiding a tab is not an access-control boundary.

MySQL privileges, restricted accounts and views can add database-side controls, but this repository does not implement an end-user `CREATE POLICY`-style row-security layer. Do not claim native RLS or that every endpoint is fully audited. The remaining role/resource matrix should include profiles, ID proofs, receipt copies, attachments, chat/tickets, histories and every export.

## Priorities after this batch

1. **Verify and release the first batch:** review changes, deploy matching frontend/backend, recreate the affected Compose services and check private headers, role denials, TLS and port exposure. No new database migration or secret value is introduced. A real unique JWT key and explicit production `FRONTEND_URL` are required.
2. **Complete identity/data isolation:** finish the role/resource/field matrix and negative access tests; narrow remaining broad desk access where the Registrar policy requires it; audit DB runtime grants and real seeded accounts. Plan session/XSS/CSP hardening together: browser sessionStorage is still accessible to JavaScript, while trusted-browser cookies are HttpOnly. A future cookie-based session design also needs CSRF and cross-origin considerations.
3. **Prove recovery and observability:** establish verified off-host backups and an isolated restore, production uptime/capacity/error alerts, log protection/retention and a tested rollback. Agree what data loss and outage duration are acceptable.
4. **Enforce delivery controls:** confirm protected-branch checks, staging acceptance, immutable images, secret scanning and Python/container scans. The new CI checks are quality gates, not an automatic production deployment.
5. **Scale from measurements:** verify client-IP handling and shared counters; introduce shared storage and socket coordination before replicas. Load test normal and expensive workflows while watching CPU/RAM/disk/DB connections and notification/timer behavior.

## Read-only live checks to collect next

From `~/Project-TRACE` on the existing server:

```bash
git status --short
git log -1 --oneline
docker compose ps
docker compose config --quiet
docker version --format '{{.Server.Version}}'
sudo ss -lntp
```

Inspect the container's non-secret configuration without dumping its environment:

```bash
docker compose exec backend node -e 'const e=require("./src/config/env"); console.log(JSON.stringify({mode:e.NODE_ENV,frontendOriginsConfigured:Boolean(e.FRONTEND_URL.trim()),trustProxy:e.TRUST_PROXY,dbUsesRoot:e.DB_USER==="root",dbTLS:e.DB_SSL,dbPoolLimit:e.DB_POOL_LIMIT,mfaKeyConfigured:Boolean(e.MFA_ENCRYPTION_KEY)}))'
```

These checks do not establish cloud firewall, IAM, active backup schedules, restore results or branch protection. Do not paste `.env`, signing/MFA keys, cookies or raw database records. Use the cloud console to inspect those settings without changing them. Backend/AI/n8n host ports should show loopback binding after this batch is deployed; Caddy remains reachable on intended HTTP/HTTPS ingress.

## Rollout notes

- Changes are for review on `dev`; production/main promotion and the SSH rollout are separate actions.
- No migration is added. Preserve MySQL/uploads/n8n volumes and existing valid JWT/MFA/n8n encryption keys. Do not reseed or delete volumes.
- Deploy the matching frontend build and rebuild/recreate backend, AI and n8n with the reviewed Compose configuration. If a host-level reverse proxy outside Compose currently depends on a non-loopback backend address, review that mapping before rollout.
- Set explicit production frontend origins. A blank production CORS allowlist now refuses credentialed cross-origin browser access. The publicly documented JWT placeholder now prevents startup; supply a unique existing valid key rather than printing it.
- n8n management is no longer reachable on the VM's public port 5678. Use an existing SSH connection with local forwarding, for example `ssh -L 5678:127.0.0.1:5678 user@server`, then open `http://127.0.0.1:5678` locally. This does not change backend-to-n8n routing inside Docker.
- Restart/recreate is required for port bindings and logging options; rebuilding the backend alone does not update every container's host bindings.

## Validation record

- Backend: **1,924 tests / 146 files** pass on Node 22.23.4, matching the production major version. This includes actual local HTTP checks for private responses/files, error masking, tracking denial and Admin-only Insights, plus college/proof permission regressions.
- Frontend: **1,250 tests / 135 files**, ESLint and production/PWA build pass after the dependency updates. The production build also passes under Node 22.
- Python: **30 isolated tests** pass in a fresh Python 3.12 environment using the CI/production-compatible NumPy/pandas/scikit-learn/SciPy pins. OCR/Prophet full-image integration and Python vulnerability scanning were not run.
- Browser: **65 checks** pass at 320/375/768/1440 px, light/dark themes and 100/200% text, including keyboard score-table scrolling. Network responses are synthetic fixtures; this is not a live user/DB test.
- Fresh `npm ci` succeeds for both packages. Explicit full npm audits report **zero known advisories** for both current lockfiles, including development dependencies. Baseline production-only audits reported nine backend and four frontend affected packages. Counts describe this registry snapshot and are not a security guarantee.
- Nodemailer 10.2.0 creates a synthetic stream-transport message and correct envelope without external delivery. Real SMTP/SMS delivery is unverified.
- Compose and CI YAML parse successfully; internal port bindings, six log-retention configurations and pinned/read-only CI actions are checked structurally. Docker is unavailable here, so container image builds and live network acceptance were not run.
- Live SSH/cloud acceptance and new CI execution are not inferred from local tests.

## Primary references

- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): least privilege, every-request resource checks and authorization tests.
- [OWASP error handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html): safe client errors and protected diagnostics.
- [MySQL view security](https://dev.mysql.com/doc/refman/8.0/en/create-view.html): account privileges, view security context and check options.
- [Express rate-limit stores](https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/overview.mdx): memory counters do not coordinate multiple processes or survive restart.
- [Socket.IO adapters](https://socket.io/docs/v4/adapter/) and [Redis adapter](https://socket.io/docs/v4/redis-adapter/): cross-server events and polling affinity.
- [Docker published ports](https://docs.docker.com/engine/network/port-publishing/): default public bindings, loopback scope and older Docker caveats.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): checks and review enforcement are repository settings.
- [GCP snapshot schedules](https://docs.cloud.google.com/compute/docs/disks/scheduled-snapshots): scheduled backups require configured policies; verify actual policy/restore evidence.
- Reviewed npm advisories included [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Multer](https://github.com/advisories/GHSA-3pph-fpjx-jg34) and [Nodemailer](https://github.com/advisories/GHSA-v53p-9fqp-m79j). Advisory presence is not proof of a reachable exploit; zero reported advisories is not proof of a secure system.
