
-- Fix 1: Replace overly permissive profiles SELECT policy with relationship-based access
DROP POLICY "Anyone can view profiles" ON public.profiles;

CREATE POLICY "View profiles in same group or own" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.student_id = auth.uid() AND gm2.student_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE g.professor_id = auth.uid() AND gm.student_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM groups g
    WHERE g.professor_id = profiles.user_id
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = g.id AND gm.student_id = auth.uid()
    )
  )
);
