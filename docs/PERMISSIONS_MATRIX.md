# Enforced permission boundaries

Authorization is enforced by the API/services and SQL scope; hiding UI controls is not an access check. MySQL does not provide native per-user row policies here. This matrix describes reviewed high-risk boundaries and is not a claim that a penetration test covered every endpoint.

| Resource | Student | Window 1 / Receiving Desk | College Secretary | Finance | Admin |
|---|---|---|---|---|---|
| Tracking/request details | Own requests | Counter workflow | Current college | Payment workflow | All |
| Registration proof | Own | Denied | Denied | Denied | Verification |
| Ordinary attached file | Own request | Authorized case | Current college | Payment evidence only | Authorized ordinary records |
| Orphan file | Denied | Denied | Denied | Denied | Administrative access |
| Avatar | Own | Student lookup scope | Current college | Own only | Administrative access |
| Student lookup | Own profile flow | Identity/workflow | Current college | Minimal identity/contact | Administrative |
| Graduate application | Own | Denied | Current college | Denied | Review |
| Student/Secretary/Finance KPI | Own | Counter overview | Scoped | Money queues | Global |
| Global analytics/AI/model evaluation | Denied | Denied | Denied | Denied | Allowed |
| Student roster export | Denied | Denied | Denied | Denied | Allowed |
| Maintenance/operations diagnostics | Denied | Denied | Denied | Denied | Allowed |
| Support files/archive | Ticket authorization | Ticket authorization | Ticket authorization | Ticket authorization | Ticket authorization first |
| Price/payment/release actions | Student steps only | Intake/release | Evaluation/price/OR | Payment decisions | Existing audited administrative rules |

REST and Socket.IO validate live active state, role, desk, token version and session revocation. Students whose verification is withdrawn cannot continue with an old token. Temporary-password, required OTP, graduate-onboarding and email gates remain. Production OCR matching creates pending registration, with Admin official-record verification required.

API database identity has SELECT/INSERT/UPDATE/DELETE on the application database; AI identity has SELECT on documents and step_logs. DBA operations use a separate one-off overlay. A compromised API identity can still access application rows under its database grants; application row authorization is not a substitute for preventing SQL injection or host compromise.

See [rollout and live acceptance](SECURITY_ROLLOUT.md).
