# IHSS governed care scheduling

This repository supports one bounded care-operations journey: consented FHIR Patient ingestion, reviewed care plans, deterministic visit-safety evaluation, independent clinician approval, field-scoped caregiver access, incident handoff, encrypted PHI, immutable evidence, and hold-aware disposition. The former retail scheduling demos, generated gap pages, generic LLM recommendations, public registration, destructive seed, and fabricated continuity data have been removed from the supported application.

## Run explicitly

Requirements are Node.js 22, npm, and PostgreSQL 16. Copy `.env.example` to an ignored runtime environment, generate independent JWT/audit keys and exactly 32 random PHI-encryption bytes, then:

1. `npm ci --prefix backend && npm ci --prefix frontend`
2. `./migrate.sh` (explicit; startup never migrates or seeds)
3. Provision the first organization administrator with `PROVISION_NAME`, `PROVISION_EMAIL`, `PROVISION_PASSWORD`, `PROVISION_ROLE=ADMIN`, and `PROVISION_ORGANIZATION_NAME` using `npm --prefix backend run account:create`. Later identities require the returned `PROVISION_ORGANIZATION_ID`.
4. `./start.sh`; run the frontend separately with `npm --prefix frontend run dev`.

Production startup rejects weak/missing secrets, wildcard CORS, loopback databases, unverified database TLS, and non-HTTPS FHIR endpoints. `compose.yaml` is a local topology; set every required variable before rendering or launching it.

## Safety and data contracts

FHIR imports require a Patient resource with a system-qualified identifier, name, birth date, version, source URL/time, and active `FHIR_IMPORT` consent. Patient and resource bodies use AES-256-GCM at rest; the database keeps only a match hash and minimal display label outside encrypted payloads. Identical resource versions replay safely while altered replays fail. The live FHIR adapter uses runtime bearer credentials, bounded responses, an eight-second timeout, and fails closed.

Visit proposals use approved/current care-plan evidence, active scheduling consent, caregiver skills and credentials, availability, overlap, and disposed-record checks. Missing/high-risk inputs create a persisted escalation and cannot be approved. A different clinician re-evaluates current evidence before assignment; PostgreSQL independently rejects overlapping assigned visits. No LLM participates in clinical or scheduling decisions.

Administrator/caseworker/clinician roles and explicit expiring client grants control PHI fields. Caregivers receive only granted contact/schedule fields; auditors receive metadata/audit verification only. Consent revocation and access revocation take effect immediately. FHIR, consent, care-plan review, visit-review, and audit evidence is append-only, with the narrow exception of governed encrypted-payload disposition after retention expiry and hold release.

## Verification and external gates

`npm test --prefix backend` exercises the complete journey on PostgreSQL, including FHIR provenance/replay, encryption, missing-data escalation, independent review, overlap/version conflicts, field access/revocation, consent revocation, retention/hold/disposition, database triggers, and audit verification. CI applies the migration twice, runs backend checks/tests and the focused frontend lint/build, audits both dependency trees, scans secrets, and builds the image.

Source completion cannot certify real clinical use. Launch still requires a licensed FHIR endpoint and patient-matching policy, BAAs/data-processing terms, clinician/caseworker acceptance, jurisdiction-specific consent/retention policy, key custody/rotation, accessibility and representative user validation, penetration/load testing, backup/restore and failover exercises, breach notification drills, monitoring/on-call ownership, and production caregiver credential/source validation.
