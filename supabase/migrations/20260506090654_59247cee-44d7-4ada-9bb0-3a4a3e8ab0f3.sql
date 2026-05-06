CREATE TABLE IF NOT EXISTS public.speaking_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  step integer NOT NULL DEFAULT 0,
  offset_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speaking_segments_session ON public.speaking_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_speaking_segments_room ON public.speaking_segments(room_id);
CREATE INDEX IF NOT EXISTS idx_speaking_segments_student ON public.speaking_segments(student_id);

ALTER TABLE public.speaking_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinator or professor insert speaking_segments"
  ON public.speaking_segments FOR INSERT
  WITH CHECK (
    recorded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = speaking_segments.room_id
        AND (r.coordinator_id = auth.uid() OR r.professor_id = auth.uid())
    )
  );

CREATE POLICY "Room members view speaking_segments"
  ON public.speaking_segments FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = speaking_segments.room_id
        AND (
          r.professor_id = auth.uid()
          OR r.coordinator_id = auth.uid()
          OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid())
        )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin manage speaking_segments"
  ON public.speaking_segments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.speaking_segments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speaking_segments;