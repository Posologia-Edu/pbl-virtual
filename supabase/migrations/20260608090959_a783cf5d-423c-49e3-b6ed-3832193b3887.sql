
CREATE TABLE public.session_concept_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('opening','closing')),
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES auth.users(id),
  is_manual_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, phase)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_concept_maps TO authenticated;
GRANT ALL ON public.session_concept_maps TO service_role;

ALTER TABLE public.session_concept_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage concept maps in their rooms"
ON public.session_concept_maps FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.professor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.professor_id = auth.uid()));

CREATE POLICY "Reporter can insert concept maps"
ON public.session_concept_maps FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.reporter_id = auth.uid()));

CREATE POLICY "Reporter can update concept maps"
ON public.session_concept_maps FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.reporter_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.reporter_id = auth.uid()));

CREATE POLICY "Group members can read concept maps"
ON public.session_concept_maps FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_id
      AND (r.professor_id = auth.uid() OR public.is_group_member(r.group_id, auth.uid()))
  )
);

CREATE POLICY "Admin full access concept maps"
ON public.session_concept_maps FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_session_concept_maps_updated_at
BEFORE UPDATE ON public.session_concept_maps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_session_concept_maps_session ON public.session_concept_maps(session_id, phase);
CREATE INDEX idx_session_concept_maps_room ON public.session_concept_maps(room_id, created_at DESC);
