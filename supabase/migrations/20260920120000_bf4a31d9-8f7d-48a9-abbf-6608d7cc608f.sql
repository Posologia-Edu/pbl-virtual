-- One-time codes used to prove e-mail ownership before student-performance
-- hands out a student's results (otherwise anyone could type a classmate's
-- e-mail and read their evaluations). RLS is enabled with NO policies, so
-- only the service-role key (used by the edge function) can touch this
-- table — anon/authenticated clients get zero access, by design.
--
-- Deliberately separate from login_otp_codes (used by supabase/functions
-- /login for the platform's own passwordless web login) — different caller
-- (an external system via a shared-secret header, not an interactive user),
-- different security domain, kept independent on purpose.
--
-- Mirrors wpagents_verification_codes from the sibling posologia-clinical-hub
-- (simulador) and prova.facil repos' student-performance functions — same
-- shape, same reasoning, kept identical across all platforms on purpose.
CREATE TABLE wpagents_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wpagents_verification_codes_email_lower
  ON wpagents_verification_codes (lower(email), created_at DESC);

ALTER TABLE wpagents_verification_codes ENABLE ROW LEVEL SECURITY;
