-- Make institution_id nullable to allow global AI keys (managed by superadmin)
ALTER TABLE public.ai_provider_keys ALTER COLUMN institution_id DROP NOT NULL;

-- Drop existing unique constraint and recreate allowing null institution_id
ALTER TABLE public.ai_provider_keys DROP CONSTRAINT IF EXISTS ai_provider_keys_institution_id_provider_key;

-- Create unique index that handles null institution_id (global keys)
CREATE UNIQUE INDEX ai_provider_keys_global_provider_key ON public.ai_provider_keys (provider) WHERE institution_id IS NULL;
CREATE UNIQUE INDEX ai_provider_keys_institution_provider_key ON public.ai_provider_keys (institution_id, provider) WHERE institution_id IS NOT NULL;

-- Update RLS: only superadmin can manage
DROP POLICY IF EXISTS "Admin manage all ai keys" ON public.ai_provider_keys;
DROP POLICY IF EXISTS "Institution admin manage own ai keys" ON public.ai_provider_keys;
DROP POLICY IF EXISTS "Professors read ai keys" ON public.ai_provider_keys;

CREATE POLICY "Superadmin manage ai keys"
ON public.ai_provider_keys FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));