
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS is_adaptive boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.adaptive_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('variation','subscenario')),
  target_type text NOT NULL CHECK (target_type IN ('group','student')),
  target_id uuid NOT NULL,
  base_scenario_id uuid,
  gaps_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adaptive_scenarios_scenario ON public.adaptive_scenarios(scenario_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_scenarios_target ON public.adaptive_scenarios(target_type, target_id);

ALTER TABLE public.adaptive_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manage adaptive_scenarios"
ON public.adaptive_scenarios FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creator view own adaptive_scenarios"
ON public.adaptive_scenarios FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Creator insert adaptive_scenarios"
ON public.adaptive_scenarios FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Institution admin view adaptive_scenarios"
ON public.adaptive_scenarios FOR SELECT
USING (
  public.has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = adaptive_scenarios.scenario_id
      AND public.is_course_in_admin_institution(s.course_id, auth.uid())
  )
);
