
-- Table: multiple scenarios assigned to a room by admin
CREATE TABLE public.room_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  scenario_id uuid REFERENCES public.scenarios(id) ON DELETE SET NULL,
  label text, -- P1, P2, P3 (set by professor)
  scenario_content text NOT NULL DEFAULT '',
  tutor_glossary jsonb,
  tutor_questions jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.room_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage room_scenarios" ON public.room_scenarios FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professor view room_scenarios" ON public.room_scenarios FOR SELECT
  USING (EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_scenarios.room_id AND r.professor_id = auth.uid()));

CREATE POLICY "Professor update room_scenarios" ON public.room_scenarios FOR UPDATE
  USING (EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_scenarios.room_id AND r.professor_id = auth.uid()));

CREATE POLICY "Students view active room_scenarios" ON public.room_scenarios FOR SELECT
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM rooms r JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = room_scenarios.room_id AND gm.student_id = auth.uid()
  ));

-- Table: tutorial sessions (one per activated scenario)
CREATE TABLE public.tutorial_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  room_scenario_id uuid REFERENCES public.room_scenarios(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL DEFAULT 'P1',
  current_step integer DEFAULT 0,
  timer_running boolean DEFAULT false,
  timer_end_at timestamptz,
  coordinator_id uuid,
  reporter_id uuid,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  UNIQUE(room_id, room_scenario_id)
);

ALTER TABLE public.tutorial_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage tutorial_sessions" ON public.tutorial_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professor manage tutorial_sessions" ON public.tutorial_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM rooms r WHERE r.id = tutorial_sessions.room_id AND r.professor_id = auth.uid()));

CREATE POLICY "Students view tutorial_sessions" ON public.tutorial_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rooms r JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = tutorial_sessions.room_id AND gm.student_id = auth.uid()
  ));

-- Add session_id to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN session_id uuid REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE;

-- Add session_id to step_items
ALTER TABLE public.step_items ADD COLUMN session_id uuid REFERENCES public.tutorial_sessions(id) ON DELETE CASCADE;

-- Add session_id to evaluations
ALTER TABLE public.evaluations ADD COLUMN session_id uuid REFERENCES public.tutorial_sessions(id) ON DELETE SET NULL;
