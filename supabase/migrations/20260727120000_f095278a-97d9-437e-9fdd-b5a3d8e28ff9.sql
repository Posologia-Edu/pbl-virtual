
-- One-time codes for passwordless student/professor login.
-- Replaces trusting a client-supplied {email, role} pair with proof of email ownership.
CREATE TABLE public.login_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_otp_codes_email_role ON public.login_otp_codes(email, role);

-- Enable RLS with no policies: this table is only ever read/written by the
-- `login` edge function using the service role key, before the caller has a session.
ALTER TABLE public.login_otp_codes ENABLE ROW LEVEL SECURITY;
