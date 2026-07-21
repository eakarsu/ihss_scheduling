# Security and regulated-data response

Do not report vulnerabilities or care data in public issues. Use the repository owner's private security channel. Treat exposed credentials as compromised: revoke/rotate first, preserve audit evidence, assess Git history/forks and provider logs, then remediate.

For suspected regulated-data exposure: stop the affected connector without destroying evidence; page the privacy/security and clinical operations owners; record systems, identities, clients, time window, data fields, and jurisdictions; preserve immutable audit/provider records; contain sessions and keys; determine contractual and legal notification clocks; notify affected providers/organizations through approved channels; restore only after validation; and complete a blameless corrective-action review. Never place PHI in logs, chat, tickets, test fixtures, or incident titles.

Production needs managed database TLS, encryption-key custody and rotation, centralized redacted logs, alerting on access/consent/provider anomalies, least privilege, backups, restore drills, dependency/image scanning, and documented offboarding. The source does not claim HIPAA or other regulatory certification by itself.
