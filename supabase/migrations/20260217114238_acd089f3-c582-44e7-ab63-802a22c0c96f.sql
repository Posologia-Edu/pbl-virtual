
-- Badge definitions (seeded with default badges)
CREATE TABLE public.badge_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏅',
  category TEXT NOT NULL DEFAULT 'participation',
  threshold_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badge definitions"
  ON public.badge_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admin manage badge definitions"
  ON public.badge_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- User badges (earned badges)
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_id, room_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own badges"
  ON public.user_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Professors view group badges"
  ON public.user_badges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = user_badges.room_id
    AND r.professor_id = auth.uid()
  ));

CREATE POLICY "Admin manage badges"
  ON public.user_badges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert badges (via edge function)
CREATE POLICY "Service insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true);

-- Seed default badge definitions
INSERT INTO public.badge_definitions (slug, name, description, icon, category, threshold_value) VALUES
  ('first_contribution', 'Primeira Contribuição', 'Fez sua primeira contribuição em uma sessão PBL', '🌱', 'participation', 1),
  ('active_contributor_10', 'Contribuidor Ativo', 'Fez 10 ou mais contribuições em sessões PBL', '💬', 'participation', 10),
  ('prolific_contributor_50', 'Contribuidor Prolífico', 'Fez 50 ou mais contribuições em sessões PBL', '🔥', 'participation', 50),
  ('chat_enthusiast_20', 'Entusiasta do Chat', 'Enviou 20 ou mais mensagens no chat de sessões', '💭', 'participation', 20),
  ('consistent_presence_5', 'Presença Consistente', 'Participou de 5 ou mais sessões', '📅', 'consistency', 5),
  ('dedicated_learner_10', 'Aprendiz Dedicado', 'Participou de 10 ou mais sessões', '🎓', 'consistency', 10),
  ('coordinator_star', 'Estrela Coordenadora', 'Atuou como coordenador em uma sessão', '👑', 'leadership', 1),
  ('reporter_star', 'Estrela Relatora', 'Atuou como relator em uma sessão', '📝', 'leadership', 1),
  ('peer_evaluator_5', 'Avaliador Engajado', 'Completou 5 ou mais avaliações por pares', '🤝', 'collaboration', 5),
  ('reference_sharer_3', 'Compartilhador de Conhecimento', 'Compartilhou 3 ou mais referências', '📚', 'collaboration', 3),
  ('top_performer', 'Alto Desempenho', 'Recebeu maioria de conceitos A em avaliações', '⭐', 'excellence', 1),
  ('improvement_streak', 'Evolução Notável', 'Mostrou melhoria consistente nas avaliações', '📈', 'excellence', 1);
