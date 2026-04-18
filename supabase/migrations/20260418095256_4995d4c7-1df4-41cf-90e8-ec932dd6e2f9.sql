CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.hash_api_key(_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(_key, 'sha256'), 'hex')
$$;

CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::text[],
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_institution ON public.api_keys(institution_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manage api_keys" ON public.api_keys FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Institution admin select api_keys" ON public.api_keys FOR SELECT
USING (has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (SELECT 1 FROM institutions i WHERE i.id = api_keys.institution_id AND i.owner_id = auth.uid()));

CREATE POLICY "Institution admin insert api_keys" ON public.api_keys FOR INSERT
WITH CHECK (has_role(auth.uid(), 'institution_admin'::app_role)
  AND created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM institutions i WHERE i.id = api_keys.institution_id AND i.owner_id = auth.uid()));

CREATE POLICY "Institution admin update api_keys" ON public.api_keys FOR UPDATE
USING (has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (SELECT 1 FROM institutions i WHERE i.id = api_keys.institution_id AND i.owner_id = auth.uid()));

CREATE POLICY "Institution admin delete api_keys" ON public.api_keys FOR DELETE
USING (has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (SELECT 1 FROM institutions i WHERE i.id = api_keys.institution_id AND i.owner_id = auth.uid()));

CREATE TABLE public.api_request_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_log_institution ON public.api_request_log(institution_id, created_at DESC);
CREATE INDEX idx_api_log_key ON public.api_request_log(api_key_id, created_at DESC);

ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin view api_request_log" ON public.api_request_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Institution admin view own api_request_log" ON public.api_request_log FOR SELECT
USING (has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (SELECT 1 FROM institutions i WHERE i.id = api_request_log.institution_id AND i.owner_id = auth.uid()));