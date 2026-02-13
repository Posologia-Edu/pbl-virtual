
-- Add column to track if admin has released scenario to professors (separate from professor releasing to students)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_scenario_visible_to_professor boolean NOT NULL DEFAULT false;
