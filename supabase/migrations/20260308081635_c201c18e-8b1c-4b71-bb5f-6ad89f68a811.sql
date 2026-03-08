
CREATE TABLE public.visitor_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT NULL,
  session_fingerprint text NOT NULL,
  pages_visited jsonb NOT NULL DEFAULT '[]'::jsonb,
  utm_source text DEFAULT NULL,
  utm_medium text DEFAULT NULL,
  utm_campaign text DEFAULT NULL,
  preferred_language text DEFAULT NULL,
  plan_interest text DEFAULT NULL,
  cta_clicks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous visitors)
CREATE POLICY "Anyone can insert visitor_analytics"
  ON public.visitor_analytics FOR INSERT
  WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins read visitor_analytics"
  ON public.visitor_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update
CREATE POLICY "Admins update visitor_analytics"
  ON public.visitor_analytics FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
