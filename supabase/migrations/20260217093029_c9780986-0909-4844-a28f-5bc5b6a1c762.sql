
-- Table to store generated session minutes/reports
CREATE TABLE public.session_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_minutes ENABLE ROW LEVEL SECURITY;

-- Professor who owns the room can manage minutes
CREATE POLICY "Professor manage minutes"
ON public.session_minutes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = session_minutes.room_id
    AND r.professor_id = auth.uid()
  )
);

-- Students in the group can view minutes
CREATE POLICY "Students view minutes"
ON public.session_minutes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = session_minutes.room_id
    AND gm.student_id = auth.uid()
  )
);

-- Admin manage
CREATE POLICY "Admin manage minutes"
ON public.session_minutes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_session_minutes_updated_at
BEFORE UPDATE ON public.session_minutes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint: one minutes per session
CREATE UNIQUE INDEX idx_session_minutes_session ON public.session_minutes(session_id);
