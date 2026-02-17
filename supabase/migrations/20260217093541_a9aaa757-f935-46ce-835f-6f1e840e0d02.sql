
-- Bank of reusable learning objectives linked to a module
CREATE TABLE public.learning_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_essential BOOLEAN NOT NULL DEFAULT false,
  source_session_id UUID REFERENCES public.tutorial_sessions(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tracks which sessions covered which objectives
CREATE TABLE public.objective_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE,
  confirmed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(objective_id, session_id)
);

-- Enable RLS
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_sessions ENABLE ROW LEVEL SECURITY;

-- Professors who have groups in the module can manage objectives
CREATE POLICY "Professor manage objectives"
ON public.learning_objectives
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.module_id = learning_objectives.module_id
    AND g.professor_id = auth.uid()
  )
);

-- Students can view objectives for modules they belong to
CREATE POLICY "Students view objectives"
ON public.learning_objectives
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE g.module_id = learning_objectives.module_id
    AND gm.student_id = auth.uid()
  )
);

-- Admin manage
CREATE POLICY "Admin manage objectives"
ON public.learning_objectives
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Objective sessions: professors manage
CREATE POLICY "Professor manage objective_sessions"
ON public.objective_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM learning_objectives lo
    JOIN groups g ON g.module_id = lo.module_id
    WHERE lo.id = objective_sessions.objective_id
    AND g.professor_id = auth.uid()
  )
);

-- Students view coverage
CREATE POLICY "Students view objective_sessions"
ON public.objective_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM learning_objectives lo
    JOIN groups g ON g.module_id = lo.module_id
    JOIN group_members gm ON gm.group_id = g.id
    WHERE lo.id = objective_sessions.objective_id
    AND gm.student_id = auth.uid()
  )
);

-- Admin manage
CREATE POLICY "Admin manage objective_sessions"
ON public.objective_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_learning_objectives_module ON public.learning_objectives(module_id);
CREATE INDEX idx_objective_sessions_objective ON public.objective_sessions(objective_id);
CREATE INDEX idx_objective_sessions_session ON public.objective_sessions(session_id);
