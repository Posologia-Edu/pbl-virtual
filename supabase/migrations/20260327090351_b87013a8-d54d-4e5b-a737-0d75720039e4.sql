-- Semester planning: scheduled sessions
CREATE TABLE public.semester_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  scheduled_time time,
  duration_minutes integer DEFAULT 120,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.semester_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage own semester sessions"
  ON public.semester_sessions FOR ALL TO authenticated
  USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Students view semester sessions for their rooms"
  ON public.semester_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      JOIN public.group_members gm ON gm.group_id = r.group_id
      WHERE r.id = room_id AND gm.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all semester sessions"
  ON public.semester_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));