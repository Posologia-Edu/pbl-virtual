
-- Table for session references (links and files)
CREATE TABLE public.session_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  ref_type text NOT NULL DEFAULT 'link', -- 'link' or 'file'
  url text NOT NULL,
  title text NOT NULL DEFAULT '',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.session_references ENABLE ROW LEVEL SECURITY;

-- Students can insert their own references
CREATE POLICY "Students insert own references"
ON public.session_references FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM rooms r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = session_references.room_id AND gm.student_id = auth.uid()
  )
);

-- Students can delete their own references
CREATE POLICY "Students delete own references"
ON public.session_references FOR DELETE
USING (author_id = auth.uid());

-- View references (professor or group member)
CREATE POLICY "View references"
ON public.session_references FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = session_references.room_id
    AND (
      r.professor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid()
      )
    )
  )
);

-- Storage bucket for reference files (PDFs)
INSERT INTO storage.buckets (id, name, public) VALUES ('references', 'references', true);

-- Storage policies
CREATE POLICY "Students upload references"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view references"
ON storage.objects FOR SELECT
USING (bucket_id = 'references');

CREATE POLICY "Students delete own reference files"
ON storage.objects FOR DELETE
USING (bucket_id = 'references' AND auth.uid()::text = (storage.foldername(name))[1]);
