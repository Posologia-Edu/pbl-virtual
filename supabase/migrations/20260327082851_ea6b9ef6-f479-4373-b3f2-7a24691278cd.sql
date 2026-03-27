
CREATE TABLE public.pipeline_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baixa')),
  status text NOT NULL DEFAULT 'roadmap' CHECK (status IN ('roadmap', 'changelog')),
  is_auto_generated boolean NOT NULL DEFAULT false,
  batch_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

ALTER TABLE public.pipeline_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manage pipeline_updates"
  ON public.pipeline_updates FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read pipeline_updates"
  ON public.pipeline_updates FOR SELECT
  TO authenticated
  USING (true);
