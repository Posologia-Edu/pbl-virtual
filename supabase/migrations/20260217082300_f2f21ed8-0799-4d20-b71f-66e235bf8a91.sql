
-- Table for self and peer evaluations
CREATE TABLE public.peer_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL,
  target_id uuid NOT NULL,
  criterion_id uuid NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  grade text,
  is_self boolean NOT NULL DEFAULT false,
  problem_number integer,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.peer_evaluations ENABLE ROW LEVEL SECURITY;

-- Students can insert their own evaluations
CREATE POLICY "Students insert own peer evals"
ON public.peer_evaluations FOR INSERT
WITH CHECK (
  evaluator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM rooms r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = peer_evaluations.room_id AND gm.student_id = auth.uid()
  )
);

-- Students can update their own non-archived evaluations
CREATE POLICY "Students update own peer evals"
ON public.peer_evaluations FOR UPDATE
USING (evaluator_id = auth.uid() AND archived = false);

-- Students can view their own evaluations (as evaluator)
CREATE POLICY "Students view own submitted evals"
ON public.peer_evaluations FOR SELECT
USING (evaluator_id = auth.uid());

-- Students can view evaluations where they are the target (to see feedback)
CREATE POLICY "Students view evals targeting them"
ON public.peer_evaluations FOR SELECT
USING (target_id = auth.uid());

-- Professors can view all evaluations in their rooms
CREATE POLICY "Professors view room peer evals"
ON public.peer_evaluations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = peer_evaluations.room_id AND r.professor_id = auth.uid()
  )
);

-- Professors can manage (archive) peer evals in their rooms
CREATE POLICY "Professors update room peer evals"
ON public.peer_evaluations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = peer_evaluations.room_id AND r.professor_id = auth.uid()
  )
);

-- Admin full access
CREATE POLICY "Admin manage peer evals"
ON public.peer_evaluations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_peer_evaluations_room_session ON public.peer_evaluations(room_id, session_id);
CREATE INDEX idx_peer_evaluations_evaluator ON public.peer_evaluations(evaluator_id);
CREATE INDEX idx_peer_evaluations_target ON public.peer_evaluations(target_id);
