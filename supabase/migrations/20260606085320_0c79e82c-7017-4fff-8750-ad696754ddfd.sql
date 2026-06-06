CREATE TABLE public.evaluation_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  session_id uuid,
  student_id uuid NOT NULL,
  criterion_id uuid NOT NULL,
  professor_id uuid NOT NULL,
  suggested_grade text NOT NULL,
  rationale text NOT NULL DEFAULT '',
  evidences jsonb NOT NULL DEFAULT '[]'::jsonb,
  accepted boolean NOT NULL DEFAULT false,
  applied_grade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_suggestions TO authenticated;
GRANT ALL ON public.evaluation_suggestions TO service_role;

ALTER TABLE public.evaluation_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor manage own suggestions"
ON public.evaluation_suggestions FOR ALL
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Superadmin manage suggestions"
ON public.evaluation_suggestions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_evaluation_suggestions_updated_at
BEFORE UPDATE ON public.evaluation_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_evaluation_suggestions_lookup
ON public.evaluation_suggestions (room_id, student_id, criterion_id, created_at DESC);