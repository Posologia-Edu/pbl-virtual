
-- Remove overly permissive insert policy (service role bypasses RLS anyway)
DROP POLICY "Service insert badges" ON public.user_badges;
