CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','CASEWORKER','CLINICIAN','CAREGIVER','AUDITOR')),
  active BOOLEAN NOT NULL DEFAULT true,
  token_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email),
  UNIQUE (id, organization_id)
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  identity_hash TEXT NOT NULL,
  display_label TEXT NOT NULL,
  fhir_resource_id TEXT,
  identity_confidence TEXT NOT NULL CHECK (identity_confidence IN ('VERIFIED','PROVISIONAL','CONFLICT')),
  phi_ciphertext TEXT NOT NULL,
  phi_iv TEXT NOT NULL,
  phi_tag TEXT NOT NULL,
  retain_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT false,
  disposed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, identity_hash),
  UNIQUE (id, organization_id)
);

CREATE TABLE client_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  scopes TEXT[] NOT NULL,
  source_reference TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  recorded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id, organization_id) REFERENCES clients(id, organization_id),
  CHECK (scopes <@ ARRAY['FHIR_IMPORT','SCHEDULING','CARE_DELIVERY','INCIDENT_RESPONSE']::TEXT[])
);

CREATE TABLE client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  field_scopes TEXT[] NOT NULL,
  granted_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id, organization_id) REFERENCES clients(id, organization_id),
  FOREIGN KEY (user_id, organization_id) REFERENCES users(id, organization_id),
  UNIQUE (client_id, user_id),
  CHECK (field_scopes <@ ARRAY['IDENTITY','CONTACT','CARE_PLAN','SCHEDULE','INCIDENTS']::TEXT[])
);

CREATE TABLE care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  version INTEGER NOT NULL,
  required_skills TEXT[] NOT NULL,
  contraindications TEXT[] NOT NULL DEFAULT '{}',
  source_reference TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('PENDING_REVIEW','APPROVED','REJECTED','SUPERSEDED')),
  authored_by UUID NOT NULL REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  review_rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id, organization_id) REFERENCES clients(id, organization_id),
  UNIQUE (client_id, version),
  CHECK (reviewed_by IS NULL OR reviewed_by <> authored_by)
);

CREATE TABLE caregiver_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  skills TEXT[] NOT NULL,
  credential_reference TEXT NOT NULL,
  credential_expires_at TIMESTAMPTZ NOT NULL,
  max_weekly_minutes INTEGER NOT NULL CHECK (max_weekly_minutes BETWEEN 60 AND 10080),
  active BOOLEAN NOT NULL DEFAULT true,
  FOREIGN KEY (user_id, organization_id) REFERENCES users(id, organization_id)
);

CREATE TABLE caregiver_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  caregiver_user_id UUID NOT NULL REFERENCES users(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  source_reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE TABLE fhir_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_timestamp TIMESTAMPTZ NOT NULL,
  payload_hash TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  tag TEXT NOT NULL,
  imported_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id, organization_id) REFERENCES clients(id, organization_id),
  UNIQUE (organization_id, resource_type, resource_id, version_id)
);

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  caregiver_user_id UUID NOT NULL,
  proposed_by UUID NOT NULL REFERENCES users(id),
  care_plan_id UUID REFERENCES care_plans(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PROPOSED','ESCALATED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1,
  risk_flags JSONB NOT NULL,
  provenance JSONB NOT NULL,
  reviewed_by UUID REFERENCES users(id),
  review_rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id, organization_id) REFERENCES clients(id, organization_id),
  FOREIGN KEY (caregiver_user_id, organization_id) REFERENCES users(id, organization_id),
  CHECK (end_at > start_at)
);

ALTER TABLE visits ADD CONSTRAINT assigned_visit_no_overlap EXCLUDE USING gist (
  caregiver_user_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (status IN ('ASSIGNED','IN_PROGRESS'));

CREATE TABLE visit_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  visit_id UUID NOT NULL REFERENCES visits(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  rationale TEXT NOT NULL,
  risk_flags JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  visit_id UUID REFERENCES visits(id),
  severity TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN','ESCALATED','RESOLVED')),
  reported_by UUID REFERENCES users(id),
  assigned_clinician_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  FOREIGN KEY (client_id, organization_id) REFERENCES clients(id, organization_id)
);

CREATE TABLE provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  outcome TEXT NOT NULL,
  evidence JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider, event_id)
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  sequence BIGINT NOT NULL,
  actor_user_id UUID REFERENCES users(id),
  client_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL,
  prior_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sequence),
  UNIQUE (organization_id, event_hash)
);

CREATE OR REPLACE FUNCTION reject_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'governance evidence is append-only'; END; $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
CREATE TRIGGER visit_review_immutable BEFORE UPDATE OR DELETE ON visit_reviews FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();

CREATE OR REPLACE FUNCTION governed_consent_revocation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL
     AND NEW.id=OLD.id AND NEW.organization_id=OLD.organization_id AND NEW.client_id=OLD.client_id
     AND NEW.scopes=OLD.scopes AND NEW.source_reference=OLD.source_reference AND NEW.evidence_hash=OLD.evidence_hash
     AND NEW.effective_at=OLD.effective_at AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at
     AND NEW.recorded_by=OLD.recorded_by AND NEW.created_at=OLD.created_at THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'consent evidence is immutable except append-only revocation time';
END; $$;
CREATE TRIGGER consent_immutable BEFORE UPDATE OR DELETE ON client_consents FOR EACH ROW EXECUTE FUNCTION governed_consent_revocation();

CREATE OR REPLACE FUNCTION protect_reviewed_care_plan() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR OLD.status IN ('APPROVED','REJECTED','SUPERSEDED') THEN RAISE EXCEPTION 'reviewed care plan evidence is immutable'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER care_plan_reviewed_immutable BEFORE UPDATE OR DELETE ON care_plans FOR EACH ROW EXECUTE FUNCTION protect_reviewed_care_plan();

CREATE OR REPLACE FUNCTION governed_fhir_payload_disposition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE governed BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'FHIR evidence rows are retained'; END IF;
  SELECT disposed_at IS NOT NULL AND legal_hold=false AND retain_until<=now() INTO governed FROM clients WHERE id=OLD.client_id;
  IF governed AND NEW.ciphertext='' AND NEW.iv='' AND NEW.tag=''
     AND NEW.id=OLD.id AND NEW.organization_id=OLD.organization_id AND NEW.client_id=OLD.client_id
     AND NEW.resource_type=OLD.resource_type AND NEW.resource_id=OLD.resource_id AND NEW.version_id=OLD.version_id
     AND NEW.source_url=OLD.source_url AND NEW.source_timestamp=OLD.source_timestamp AND NEW.payload_hash=OLD.payload_hash
     AND NEW.imported_by=OLD.imported_by AND NEW.created_at=OLD.created_at THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'FHIR evidence is immutable except governed payload disposition';
END; $$;
CREATE TRIGGER fhir_immutable BEFORE UPDATE OR DELETE ON fhir_resources FOR EACH ROW EXECUTE FUNCTION governed_fhir_payload_disposition();

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
