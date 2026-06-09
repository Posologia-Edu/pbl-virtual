
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS patient_dossier text;

CREATE TABLE public.patient_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_interviews TO authenticated;
GRANT ALL ON public.patient_interviews TO service_role;

ALTER TABLE public.patient_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members read interviews"
  ON public.patient_interviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = patient_interviews.room_id
        AND (
          r.professor_id = auth.uid()
          OR public.is_group_member(r.group_id, auth.uid())
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Room members insert interviews"
  ON public.patient_interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = patient_interviews.room_id
        AND (
          r.professor_id = auth.uid()
          OR public.is_group_member(r.group_id, auth.uid())
        )
    )
  );

CREATE POLICY "Admin manage interviews"
  ON public.patient_interviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_patient_interviews_session ON public.patient_interviews(session_id, created_at);
CREATE INDEX idx_patient_interviews_room ON public.patient_interviews(room_id, created_at);
