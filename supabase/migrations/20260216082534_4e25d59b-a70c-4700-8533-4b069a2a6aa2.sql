
-- Create the updated_at function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table for professor notes about students per session
CREATE TABLE public.professor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  professor_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id, professor_id)
);

ALTER TABLE public.professor_notes ENABLE ROW LEVEL SECURITY;

-- Only the professor who wrote the note can see/manage it
CREATE POLICY "Professor manage own notes"
  ON public.professor_notes FOR ALL
  USING (professor_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_professor_notes_updated_at
  BEFORE UPDATE ON public.professor_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
