
-- Add feature flag columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS max_ai_interactions integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ai_scenario_generation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS peer_evaluation_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS badges_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS full_reports_enabled boolean DEFAULT false;

-- Update existing subscriptions based on plan_name
UPDATE public.subscriptions SET
  max_ai_interactions = 50,
  ai_scenario_generation = false,
  peer_evaluation_enabled = false,
  badges_enabled = false,
  full_reports_enabled = false
WHERE plan_name = 'starter';

UPDATE public.subscriptions SET
  max_ai_interactions = 500,
  ai_scenario_generation = true,
  peer_evaluation_enabled = true,
  badges_enabled = true,
  full_reports_enabled = true
WHERE plan_name = 'professional';

UPDATE public.subscriptions SET
  max_ai_interactions = 99999,
  ai_scenario_generation = true,
  peer_evaluation_enabled = true,
  badges_enabled = true,
  full_reports_enabled = true
WHERE plan_name = 'enterprise';

-- Create AI interaction counts table
CREATE TABLE public.ai_interaction_counts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  interaction_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(institution_id, month_year)
);

ALTER TABLE public.ai_interaction_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manage ai_interaction_counts"
  ON public.ai_interaction_counts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Institution admin view own ai_interaction_counts"
  ON public.ai_interaction_counts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM institutions i WHERE i.id = ai_interaction_counts.institution_id AND i.owner_id = auth.uid()
  ));
