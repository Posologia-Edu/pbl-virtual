
-- Add problem_number to track which "Problem" (P1, P2, ...) each archived evaluation belongs to
ALTER TABLE public.evaluations ADD COLUMN problem_number integer DEFAULT NULL;
