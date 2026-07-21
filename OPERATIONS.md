# Operations runbook

- Apply migrations as a reviewed release step and verify `/api/health` before traffic.
- Provision identities explicitly; deactivate users and increment `token_version` for immediate session revocation.
- Monitor failed FHIR calls, replay conflicts, safety escalations, unreviewed visits, credential expiry, consent expiry/revocation, overlap constraint failures, and audit verification.
- Place legal holds before investigations. Disposition is allowed only after retention expiry and hold release, and removes encrypted PHI payloads while retaining source hashes and audit metadata.
- Run `backup.sh` to an access-controlled destination. Test `restore.sh` only into an explicitly named empty non-production database, then verify migration checksums and audit chains before use.
- Provider incidents fail closed; do not bypass safety checks or mark delivery successful manually. Reconcile provider resource versions and evidence hashes after recovery.
