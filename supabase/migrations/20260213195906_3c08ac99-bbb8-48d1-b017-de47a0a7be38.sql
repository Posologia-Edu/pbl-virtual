
-- Create modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage modules" ON public.modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors and students view modules" ON public.modules FOR SELECT
  USING (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'student'::app_role));

-- Create scenarios table (library of reusable scenarios)
CREATE TABLE public.scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  tutor_glossary JSONB DEFAULT NULL,
  tutor_questions JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage scenarios" ON public.scenarios FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors view scenarios" ON public.scenarios FOR SELECT
  USING (has_role(auth.uid(), 'professor'::app_role));

-- Add module_id to groups
ALTER TABLE public.groups ADD COLUMN module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
