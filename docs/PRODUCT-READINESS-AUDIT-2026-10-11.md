# Hospital software: product and demo readiness

Assessment date: 11 October 2026. Scope: source inspection, existing automated checks, local startup, login rendering and unauthenticated HTTP smoke checks. This is NOT a completed end-to-end assessment, penetration test, compliance certification or production approval.

## Hosted demo follow-up: authenticated read-only smoke check

The user confirmed this is a hosted demo database and signed in directly. The existing built-in browser session was verified as Super Admin. Credentials are not recorded here. Hosted deployment revision has not been matched to the local source revision; local source findings must not be treated as reproduced hosted defects.

Verified by browser observation:
- Dashboard renders operational summary cards, booking-request empty state, revenue chart, staffing and calendar sections.
- `/dashboard/clinical/opd` renders a populated patient list, queue/date/search controls and pagination. No registration or booking submitted.
- `/dashboard/pharmacy/pos` renders the pharmacy queue and its no-pending-prescriptions state. This verifies rendering, not dispensing or stock reconciliation.
- `/dashboard/finance/billing` renders an invoice list, payment/status columns, summary cards and filtering/export controls. No bill created, modified, exported or paid.

These are authenticated page-load checks, not complete transactional E2E tests or successful tests of every displayed control. No patient identifiers, raw page content or credentials are included in this report. Confirmation that outbound notifications and actual payment processing are disabled is still pending before mutation tests.

Filming implication: the current empty pharmacy queue cannot demonstrate a prescription handoff. Prepare a clearly labelled synthetic scenario after mutation safety is confirmed. The populated billing screen is a candidate for proof footage, but a reconciled invoice journey still needs verification. Do not use dashboard counters alone as evidence of operational benefits.

## Executive decision

There is substantial hospital-domain implementation worth demonstrating. Do not launch a campaign claiming production readiness, proven savings or certified security yet. Complete a safe, repeatable demo and resolve the authentication concerns first. Module files establish implementation presence, not successful workflows.

## Checks actually performed

| Check | Result | Interpretation |
|---|---|---|
| Initial `git status --short` | Clean | No initial uncommitted changes reported |
| Runtime | Node v24.16.0; npm 11.13.0 | Installed versions, not a compatibility certification |
| `npm test` | 59 passed, 2 failed; 6 test files, 61 tests | Utility/auth-guard/sidebar tests, not hospital E2E coverage |
| `npx tsc --noEmit --incremental false` | Failed | Errors across forms, finance, discharge, pharmacy, WhatsApp and config |
| `npm run lint` | Failed: 1,469 errors, 981 warnings | Includes application code, scripts and generated assets; not 1,469 proven runtime defects |
| Local Next dev startup | Ready, loopback port 3000 | Next 16.1.1; existing environment loaded by app |
| Browser `/login` | Staff/patient tabs and sign-in form render | No login attempted |
| HTTP GET `/login` | 200 | Public login responds |
| HTTP HEAD `/dashboard`, `/dashboard/clinical/opd`, `/dashboard/pharmacy/pos`, `/dashboard/ipd` | 302 to hosted login | Unauthenticated access redirects, but origin is wrong for isolated local testing |
| HTTP GET `/api/patients` | 401 | Unauthenticated request rejected; does not prove authenticated route correctness or existence |
| Production build | Not run | Avoid conflating development startup with deployability; build may evaluate DB-backed pages |
| Authenticated hospital workflows | Not run | Requires isolated demo database, safe external integrations and user sign-in |

The environment unit test logs a missing DATABASE_URL while passing. Vitest's environment is not evidence of Next's loaded database configuration. No secrets were read from `.env`; no seed, migration, reset, payment, message or clinical mutation was initiated.

## Findings to address before filming or production claims

### High priority: predictable patient authentication

`auth.ts:119-130` uses a phone number as the default password for an online-booking patient. `auth.ts:149-165` accepts a phone number or patient identifier for first-time login when no password exists. These identifiers are not suitable authentication secrets. Replace with a verified activation/password setup flow and rate limiting; verify recovery and account ownership. Source finding, not a live exploit test.

### High priority: records written before password verification

`auth.ts:84-122` creates User/Patient records and links bookings before checking the supplied password. A failed login can therefore mutate records along that code path. Validate ownership before provisioning and use transactional, idempotent provisioning. Test repeated, concurrent and failed activation attempts in an isolated database.

### High priority: inactive accounts and role boundaries need verification

The staff login path in `auth.ts:178-217` checks password and leave status but does not check `user.isActive`. The existing-patient path also lacks that check. Verify inactive accounts cannot authenticate and active sessions can be revoked as required.

`proxy.ts:127-131` defaults unrecognized roles to allowed navigation; several staff roles use blocklists. `lib/auth-guard.ts:25` gives ADMIN and SUPER_ADMIN a bypass. This is not proof of a data leak, but the policy needs an explicit role/action/record-ownership matrix and negative tests. Route hiding is not server-side authorization.

### Local environment: cross-origin login redirect

Local protected-route requests redirect to an Amplify-hosted origin. Do not enter demo credentials until local auth base URL/cookies and database isolation are confirmed. Change only approved local configuration; never copy real environment values into documentation.

### Quality gate: type errors are bypassed during build

`next.config.ts:22` sets `typescript.ignoreBuildErrors: true`. A future successful build would not imply type safety. Current typecheck includes an unresolved `getDoctorRevenueShare` name, form resolver incompatibilities, missing discharge properties and a pharmacy `totalUnits` mismatch. Resolve errors, then restore the typecheck gate.

### Existing tests: two error-contract mismatches

`auth-guard.test.ts` and `auth-guard-safe.test.ts` expect "Forbidden" for disallowed roles, while implementation returns "Unauthorized". Rejection still occurs in these tests. Decide the contract deliberately; do not weaken role checks or describe these failures as proven authorization bypasses.

### Evidence and documentation drift

README names Next 14; package.json and running server use Next 16.1.1. README mixes implemented and planned security/features. Replace sales claims with a feature evidence register. Review PWA caching of authenticated clinical content before claiming offline support or safe shared-device use.

## Candidate demonstration features

| Story | Source evidence | Remaining proof |
|---|---|---|
| OPD and consultation | `app/dashboard/clinical`, `app/actions/prescription.ts` | Registration through consultation/prescription with persisted demo records |
| Consolidated IPD billing | `app/actions/billing.ts`, especially `calculateFinalBill` | Itemized charges, advances, discounts, totals and read-back reconcile |
| Pharmacy workflow | `lib/actions/pharmacy.ts`, inventory service and pharmacy routes | Dispense, batch allocation, insufficient stock, return and reconciliation |
| Clinical notes and investigations | `app/actions/clinical.ts`, `app/actions/lab.ts` | Authorized creation, lab result visibility, inactive-admission rejection |
| Configurable hospital deployment | Settings, print settings and role modules | Document what is configurable versus paid custom engineering |

## End-to-end acceptance matrix — all pending

Use synthetic patients and separate test accounts. Disable real SMS/WhatsApp, payments and production object storage. Never use a real Aadhaar/phone number in footage.

1. Authentication: correct/incorrect password; inactive account; leave restrictions; logout; expiration; patient record isolation; prohibited role/action attempts.
2. OPD: register synthetic patient, reject duplicate/invalid data, book appointment, queue/vitals, consultation, prescription, lab order, bill, persist after reload, print.
3. Lab: order -> sample/status -> result -> authorized clinician view; reject missing results or unauthorized edits; reconcile charge exactly once.
4. Pharmacy: prescription -> batch/expiry allocation -> dispense -> invoice -> stock decrement; insufficient-stock rejection; duplicate submission; return/stock/ledger reconciliation.
5. IPD: admit -> allocate/transfer bed -> clinical/lab/pharmacy charges -> advance -> discharge -> final bill; reconcile balance and bed release; reject further inactive-admission orders.
6. OT: schedule -> staff assignment -> pre-anaesthesia checks -> procedure/status -> charges; verify conflicts and permissions.
7. Finance: partial/full payment, discounts with authorization, refund/cancellation, day-end reconciliation and export; no actual money movement.
8. Administration: configurable branding/print templates, user permissions, audit attribution, backup/restore evidence and shared-device logout behavior.

Record expected/actual results, role, synthetic record identifier, timestamp, browser/viewport and defect reference for each. Test denied operations for absence of side effects. Separate transaction success from screenshot appearance.

## Release gate

Before paid ads: safe demo environment, corrected local login routing, authentication risk remediation, green relevant checks, successful recorded workflows, approved brand/contact details and a functioning lead form.
Before customer go-live: deployment/security review, backups and restore drill, migration reconciliation, staff UAT, support scope and response commitments, access policy, applicable privacy/legal review and signed acceptance criteria.
