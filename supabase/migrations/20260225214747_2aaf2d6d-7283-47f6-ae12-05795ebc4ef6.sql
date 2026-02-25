
-- Table to store AI provider API keys per institution
CREATE TABLE public.ai_provider_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'groq', 'anthropic', 'openrouter', 'google'
  api_key TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(institution_id, provider)
);

-- Enable RLS
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- Only institution admins (owner) can manage their own keys
CREATE POLICY "Institution admin manage own ai keys"
  ON public.ai_provider_keys FOR ALL
  USING (EXISTS (
    SELECT 1 FROM institutions i
    WHERE i.id = ai_provider_keys.institution_id AND i.owner_id = auth.uid()
  ));

-- Superadmin can manage all keys
CREATE POLICY "Admin manage all ai keys"
  ON public.ai_provider_keys FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Professors can read keys for their institution (needed for AI calls)
CREATE POLICY "Professors read ai keys"
  ON public.ai_provider_keys FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM groups g
    JOIN courses c ON c.id = g.course_id
    WHERE g.professor_id = auth.uid()
      AND c.institution_id = ai_provider_keys.institution_id
  ));

-- Trigger for updated_at
CREATE TRIGGER update_ai_provider_keys_updated_at
  BEFORE UPDATE ON public.ai_provider_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
