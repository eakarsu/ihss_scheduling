# Completeness Review: ihss_scheduling

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 96 project files (86 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for healthcare/care operations. Generated gap/demo patterns are present: it contains 86 source files and visible routes/pages in `backend/`, `frontend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Integrate standards-based clinical/care data (for example FHIR where applicable) with identity matching and consent.
2. Add clinician/caseworker review boundaries, provenance, contraindication/safety checks, and escalation for uncertain output.
3. Implement field-level access control, audit history, retention, encryption, and regulated-data incident procedures.
4. Validate the intended workflow with representative users and test high-risk, missing-data, and handoff scenarios.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `backend/server.js:47`
- `backend/routes/gap_frontend_is_minimal_3_pages_vs.js:49`
- `backend/openrouter.js`
- `backend/server.js`
- `backend/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one healthcare/care operations workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-20)

- Replaced the generated retail/demo surface with one persistent governed-care workflow: standards-validated FHIR Patient ingestion, deterministic identity matching, explicit import and scheduling consent, version/provenance evidence, approved care plans, caregiver credential/availability/overlap checks, persisted high-risk escalation, and independent clinician assignment review. Identical provider replays are idempotent and altered replays fail closed; no LLM participates in care or scheduling decisions.
- Added PostgreSQL-enforced tenant relationships, role and field-scoped client grants, immediate user/access/consent revocation, AES-256-GCM PHI and FHIR payload encryption, immutable consent/FHIR/care-plan/visit-review/audit evidence, a signed hash-chained audit log, retention/legal-hold controls, and evidence-preserving payload disposition. Public registration, destructive startup seeding, generic AI routes, generated gap pages, fabricated continuity data, and old demo UI components were removed.
- Added explicit versioned/checksummed migrations, non-destructive startup, deliberate administrator provisioning, strict production configuration/TLS/CORS guards, rate limiting and security headers, a non-root/read-only container topology, backup/restore and regulated-data incident runbooks, focused Vite operations UI, and CI for repeat migrations, PostgreSQL workflow tests, syntax/lint/build, dependency audits, secret scanning, and image build.
- Verified on a fresh disposable PostgreSQL 16 database: migration plus checksum replay passed and all 12 identity, FHIR, encryption, replay, missing-data, high-risk handoff, separation-of-duties, overlap/version-conflict, field-access/revocation, consent, retention/hold/disposition, database-trigger, and audit-chain tests passed. Backend syntax, frontend lint and production build, Compose rendering, fail-closed startup, `git diff --check`, both npm audits (0 vulnerabilities), and both Git-history/current-tree Gitleaks scans passed. Local image execution remains an environment gate because the configured Colima Docker daemon is stopped; CI contains the image-build proof.
- External launch gates remain explicit rather than claimed complete: licensed FHIR/patient-matching acceptance, BAAs and jurisdiction-specific consent/retention approval, managed key custody and rotation, accessibility and representative clinician/caseworker validation, penetration/load testing, backup/restore/failover and breach-notification drills, monitoring/on-call ownership, and production caregiver-credential validation.

## Runtime verification (2026-07-20)

- Verified `start.sh` with fresh PostgreSQL on port `55661`, the care API on `6130`, and UI port `6131` reserved for this lane; all three ports were released afterward.
- The first recorded attempt failed before startup because explicit migration and provisioning commands run outside the launcher and could not see launcher-only aliases for the audit and PHI keys. Configuration loading now accepts the validator's separately supplied refresh/encryption keys while retaining the original explicit production variables.
- The final attempt applied the checksum migration, provisioned a fresh organization and administrator from environment values, logged in with a tenant-qualified request, and verified the bearer session through `/api/auth/me`: `API_VERIFIED startup_login_session_api`.
- Migration replay passed twice and all 12 PostgreSQL workflow tests passed on `55661`; backend syntax checks, frontend lint, and the Vite production build also passed. Every attempt is preserved in `_runtime_non_suite_repair_shard3r.tsv`.
