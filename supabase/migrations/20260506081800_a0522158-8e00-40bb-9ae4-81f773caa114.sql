-- 1) Tutorial sessions: shared whiteboard state + timer phase
ALTER TABLE public.tutorial_sessions
  ADD COLUMN IF NOT EXISTS whiteboard_state jsonb NOT NULL DEFAULT '{"objects":[],"strokes":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS timer_phase text NOT NULL DEFAULT 'opening';

-- 2) Session presentations (reporter uploads PPTX/PDF for closing phase)
CREATE TABLE IF NOT EXISTS public.session_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  session_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter insert presentation"
  ON public.session_presentations FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = session_presentations.room_id
        AND r.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Reporter delete own presentation"
  ON public.session_presentations FOR DELETE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = session_presentations.room_id
        AND r.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Room members view presentations"
  ON public.session_presentations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = session_presentations.room_id
        AND (
          r.professor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid()
          )
        )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin manage presentations"
  ON public.session_presentations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Speaking times per participant (coordinator tracks; everyone in session can read for transparency)
CREATE TABLE IF NOT EXISTS public.participant_speaking_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  total_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

ALTER TABLE public.participant_speaking_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinator or professor upsert speaking time"
  ON public.participant_speaking_times FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = participant_speaking_times.room_id
        AND (r.coordinator_id = auth.uid() OR r.professor_id = auth.uid())
    )
  );

CREATE POLICY "Coordinator or professor update speaking time"
  ON public.participant_speaking_times FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = participant_speaking_times.room_id
        AND (r.coordinator_id = auth.uid() OR r.professor_id = auth.uid())
    )
  );

CREATE POLICY "Room members view speaking times"
  ON public.participant_speaking_times FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = participant_speaking_times.room_id
        AND (
          r.professor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid())
        )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin manage speaking times"
  ON public.participant_speaking_times FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Storage bucket for presentations (public for Office Online viewer to access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentations', 'presentations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Reporter upload presentation files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'presentations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Reporter delete own presentation files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'presentations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public read presentation files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'presentations');

-- 5) Realtime for shared whiteboard + presentations + speaking times
ALTER TABLE public.session_presentations REPLICA IDENTITY FULL;
ALTER TABLE public.participant_speaking_times REPLICA IDENTITY FULL;
ALTER TABLE public.tutorial_sessions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_presentations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_speaking_times;