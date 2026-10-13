# Student/alumni request catalog — October 13, 2026

This catalog replaces the selectable options for new online requests. Every listed option is available to both students and alumni, subject to the existing account/profile and Honorable Dismissal checks. Existing requests, amounts, fee snapshots and issued receipts retain their history. Admin can edit live rates after migration; running the migration again preserves those edits.

Each of the first five options is one requested set with separately calculated fees. The Secretary records each included page-based document's own actual printed pages per copy. A set follows one desk workflow; distinct selected options share the existing request group and are billed together after all are priced. Only one Honorable Dismissal set can be selected; its existing nonrepeatable policy applies across every set and historical Honorable Dismissal requests.

| Request option | Charge |
| --- | --- |
| For Second Course (Bachelor Degree) | Honorable Dismissal set ₱100 + enrolled-university TOR ₱100/page |
| For Graduate School | Honorable Dismissal set ₱100 + enrolled-university TOR ₱100/page |
| For Masters | Honorable Dismissal set ₱100/page + enrolled-university TOR ₱100/page |
| For CTP | Honorable Dismissal set ₱100 + enrolled-university TOR ₱100/page |
| Transfer Credentials | Honorable Dismissal set ₱100 + Copy of Grade ₱50/page + TOR ₱100/page |
| Transcript of Records for Employment | ₱100/page |
| Transcript of Records for Evaluation | ₱100/page |
| Transcript of Records for Promotion | ₱100/page |
| Transcript of Records for Travel | ₱100/page |
| Transcript of Records for Board Exam | ₱100/page |
| Copy of Grades | ₱100/page |
| Permanent Records | ₱50/copy |
| Authentication of Documents (CTC) | ₱100/page |
| CHED-CAV | ₱80/copy + CTC attachment ₱100/page/copy |
| Certificate of Enrollment | ₱50/copy |
| Certificate of Enrolled Subject | ₱50/copy |
| Certificate of Non-Record | ₱50/copy |
| Certificate of Year-Level | ₱50/copy |
| Certificate of English as a Medium of Instruction | ₱50/page |
| Certificate of Non-Credited Courses | ₱50/copy |
| Certificate of Remaining Units | ₱50/copy |
| Certificate of Units Earned | ₱50/copy |
| Certificate of Completion of Cross-Enrolled Subject | ₱50/copy |
| Certificate of Completion of Academic Requirements | ₱50/copy |
| Certificate of Specialization-Units Earned | ₱50/copy |
| Certificate of Graduation | ₱50/copy |
| Certificate of Honor | ₱50/copy |
| Certificate of General Weighted Average (GWA) | ₱50/copy |
| Certificate of College Ranking | ₱50/copy |
| Certificate of Issuance Deferral | ₱50/copy |
| Second Copy of Application for Graduation | ₱100/copy |
| Second Copy of Claim Stub/Receiving Copy | ₱100/copy |
| Second Copy of Certificate of Registration (COR) | ₱100/copy |
| Second Copy of Report of Official Grade (ROG) | ₱100/copy |
| NSTP Serial Number | ₱50/copy |
| Diploma 2nd Copy | ₱250/copy |
| Course Description | ₱50/page |
| Certificate of Underload Units | |

The two supplied Certificate of Registration entries are combined into one COR option. BSN RLE, Nursing Hours, BSN Course Description, BSN Course Syllabus, BSN International Form and BSN Accreditation are deactivated if they already exist. They are not added as new request options.

Underload Units remains requestable with a blank displayed fee. Its stored provisional zero is explicitly marked as a pending fee, never a free confirmed charge. Admin sets a rate in Maintenance; after refreshing, the Secretary reviews and explicitly confirms that current rate before billing. Originally confirmed schedules continue to use their saved rates. New page-based fees do not derive prices from semesters: only actual printed pages are used at final pricing. Estimates use one page per component until printing.

## Deployment

Use the existing backup and writer-stop procedure in [MIGRATION_ROLLOUT.md](MIGRATION_ROLLOUT.md). This migration changes the live catalog and removes old default/college overrides for its replacement options to install the supplied rates. It deactivates old options rather than deleting or renaming their rows. Review any separately pending migrations first; do not reseed or import the fresh schema into an existing database.

From the reviewed `dev` checkout, after backing up and pausing backend/n8n writers:

```bash
git pull --ff-only origin dev
docker compose build backend
docker compose run --rm --no-deps -T backend node database/migrate_request_catalog.js
docker compose run --rm --no-deps -T backend node database/check_schema.js
docker compose up -d --no-deps --force-recreate backend
docker compose start n8n
```

Stop at any failed command. Deploy the matching frontend after the API/schema update. This catalog change does not alter the AI engine. A fresh installation also applies `migrate_request_catalog.js` after its existing schema/seed/prerequisite setup.

Check the 38 selectable options, combined COR, blank Underload fee, disabled alternative dismissal sets, and actual component pricing. Examples: Transfer Credentials with two Copy of Grade pages and three TOR pages totals ₱500; Masters with two dismissal pages and four TOR pages totals ₱600; one CHED-CAV with three CTC attachment pages totals ₱380. Issued receipts and already saved fee schedules must retain their prior values.
