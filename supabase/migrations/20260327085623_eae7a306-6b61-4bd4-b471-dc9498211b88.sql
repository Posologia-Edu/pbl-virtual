-- Attendance records for session check-in
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  method text NOT NULL DEFAULT 'manual' CHECK (method IN ('geolocation', 'qrcode', 'manual')),
  latitude double precision,
  longitude double precision,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Professors and admins can view attendance for their rooms
CREATE POLICY "Professors can view attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.professor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Students can view their own attendance
CREATE POLICY "Students can view own attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Students can insert their own attendance
CREATE POLICY "Students can check in"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Professors can insert attendance (manual)
CREATE POLICY "Professors can insert attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.professor_id = auth.uid())
  );

-- Geolocation settings per room
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS geo_latitude double precision;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS geo_longitude double precision;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS geo_radius_meters integer DEFAULT 100;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS attendance_qr_code text;