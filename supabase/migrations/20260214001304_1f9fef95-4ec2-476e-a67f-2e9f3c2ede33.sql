-- Tighten modules access: only course members and admins can view modules
DROP POLICY IF EXISTS "Professors and students view modules" ON public.modules;

CREATE POLICY "View own course modules" ON public.modules FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM course_members cm
      WHERE cm.course_id = modules.course_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.module_id = modules.id
      AND g.professor_id = auth.uid()
    )
  );