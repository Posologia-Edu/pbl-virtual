
-- Tutor Ears: audio recordings with transcription and participation analytics
CREATE TABLE public.session_audio_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  started_by UUID NOT NULL,
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | ready | failed
  error_message TEXT,
  transcript JSONB,        -- { full_text, segments:[{speaker,start,end,text}], glossary_hits:[] }
  participation JSONB,     -- { by_speaker:[{speaker,speaking_seconds,turns}] }
  speaker_labels JSONB,    -- optional { "Speaker A": student_uuid, ... }
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_audio_recordings TO authenticated;
GRANT ALL ON public.session_audio_recordings TO service_role;

ALTER TABLE public.session_audio_recordings ENABLE ROW LEVEL SECURITY;

-- Professor of the room: full control
CREATE POLICY "Professor manages audio recordings"
ON public.session_audio_recordings
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.professor_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.professor_id = auth.uid())
);

-- Coordinator of the room: can insert / read own recordings
CREATE POLICY "Coordinator can insert audio recordings"
ON public.session_audio_recordings
FOR INSERT
TO authenticated
WITH CHECK (
  started_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.coordinator_id = auth.uid())
);

CREATE POLICY "Coordinator can read audio recordings of their room"
ON public.session_audio_recordings
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.coordinator_id = auth.uid())
);

-- Group members can read once ready (so students see transcript afterward)
CREATE POLICY "Group members read ready transcripts"
ON public.session_audio_recordings
FOR SELECT
TO authenticated
USING (
  status = 'ready'
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_id
      AND public.is_group_member(r.group_id, auth.uid())
  )
);

-- Superadmin
CREATE POLICY "Superadmin manages all audio recordings"
ON public.session_audio_recordings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_session_audio_room_session ON public.session_audio_recordings(room_id, session_id, created_at DESC);

CREATE TRIGGER trg_session_audio_updated_at
BEFORE UPDATE ON public.session_audio_recordings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for audio under "references" bucket, prefix "audio/"
CREATE POLICY "Coordinator/professor upload session audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'references'
  AND (storage.foldername(name))[1] = 'audio'
);

CREATE POLICY "Coordinator/professor read session audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'references'
  AND (storage.foldername(name))[1] = 'audio'
);
