-- =========================================================================
-- 1) JUNCTION: objectives (P5 step_items) <-> references (session_references)
-- =========================================================================
CREATE TABLE public.session_objective_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  room_id uuid NOT NULL,
  objective_step_item_id uuid NOT NULL,
  reference_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (objective_step_item_id, reference_id)
);
CREATE INDEX idx_sor_session ON public.session_objective_references(session_id);
CREATE INDEX idx_sor_objective ON public.session_objective_references(objective_step_item_id);
CREATE INDEX idx_sor_reference ON public.session_objective_references(reference_id);

ALTER TABLE public.session_objective_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members view session_objective_references"
ON public.session_objective_references FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.id = session_objective_references.room_id
    AND (
      r.professor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid())
    )
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Room members create session_objective_references"
ON public.session_objective_references FOR INSERT
WITH CHECK (created_by = auth.uid() AND EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.id = session_objective_references.room_id
    AND (
      r.professor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid())
    )
));

CREATE POLICY "Authors or professor delete session_objective_references"
ON public.session_objective_references FOR DELETE
USING (created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.id = session_objective_references.room_id AND r.professor_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_objective_references;
ALTER TABLE public.session_objective_references REPLICA IDENTITY FULL;

-- =========================================================================
-- 2) PRESENTATION COMMENTS (pins ancorados a slides)
-- =========================================================================
CREATE TABLE public.presentation_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  room_id uuid NOT NULL,
  presentation_id uuid NOT NULL,
  slide_number integer NOT NULL DEFAULT 1,
  author_id uuid NOT NULL,
  content text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pc_session ON public.presentation_comments(session_id);
CREATE INDEX idx_pc_presentation ON public.presentation_comments(presentation_id, slide_number);

ALTER TABLE public.presentation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members view presentation_comments"
ON public.presentation_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.id = presentation_comments.room_id
    AND (
      r.professor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid())
    )
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Room members create presentation_comments"
ON public.presentation_comments FOR INSERT
WITH CHECK (author_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.id = presentation_comments.room_id
    AND (
      r.professor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid())
    )
));

CREATE POLICY "Author or professor update presentation_comments"
ON public.presentation_comments FOR UPDATE
USING (author_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.id = presentation_comments.room_id AND r.professor_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Author or professor delete presentation_comments"
ON public.presentation_comments FOR DELETE
USING (author_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.id = presentation_comments.room_id AND r.professor_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pc_updated_at
BEFORE UPDATE ON public.presentation_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_comments;
ALTER TABLE public.presentation_comments REPLICA IDENTITY FULL;

-- =========================================================================
-- 3) SESSION VERDICTS (Conduta Final / Veredito Clínico)
-- =========================================================================
CREATE TABLE public.session_verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  room_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  objectives_addressed jsonb NOT NULL DEFAULT '[]'::jsonb,
  finalized_at timestamptz,
  finalized_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_verdicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members view session_verdicts"
ON public.session_verdicts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.id = session_verdicts.room_id
    AND (
      r.professor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = r.group_id AND gm.student_id = auth.uid())
    )
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reporter or professor insert session_verdicts"
ON public.session_verdicts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.id = session_verdicts.room_id
    AND (r.professor_id = auth.uid() OR r.reporter_id = auth.uid())
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reporter or professor update session_verdicts"
ON public.session_verdicts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.id = session_verdicts.room_id
    AND (r.professor_id = auth.uid() OR r.reporter_id = auth.uid())
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_sv_updated_at
BEFORE UPDATE ON public.session_verdicts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_verdicts;
ALTER TABLE public.session_verdicts REPLICA IDENTITY FULL;

-- =========================================================================
-- 4) ARGUITION CARDS (IA, somente professor/admin)
-- =========================================================================
CREATE TABLE public.arguition_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  room_id uuid NOT NULL,
  presentation_id uuid NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  coverage_summary text,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ac_session ON public.arguition_cards(session_id);

ALTER TABLE public.arguition_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor view arguition_cards"
ON public.arguition_cards FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.id = arguition_cards.room_id AND r.professor_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professor manage arguition_cards"
ON public.arguition_cards FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.id = arguition_cards.room_id AND r.professor_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.id = arguition_cards.room_id AND r.professor_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.arguition_cards;
ALTER TABLE public.arguition_cards REPLICA IDENTITY FULL;