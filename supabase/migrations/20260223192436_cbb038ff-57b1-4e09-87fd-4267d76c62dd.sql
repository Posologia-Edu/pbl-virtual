
-- Restrict badge definitions to authenticated users only
DROP POLICY IF EXISTS "Anyone can view badge definitions" ON public.badge_definitions;
CREATE POLICY "Authenticated view badge definitions"
  ON public.badge_definitions FOR SELECT
  USING (auth.uid() IS NOT NULL);
