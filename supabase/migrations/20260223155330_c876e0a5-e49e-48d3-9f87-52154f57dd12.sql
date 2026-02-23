
-- Drop the existing ALL policy that doesn't work for INSERT
DROP POLICY "Institution admin manage courses" ON public.courses;

-- Create separate policies for institution_admin
CREATE POLICY "Institution admin insert courses"
ON public.courses FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM institutions i
    WHERE i.id = institution_id AND i.owner_id = auth.uid()
  )
);

CREATE POLICY "Institution admin select courses"
ON public.courses FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(id, auth.uid())
);

CREATE POLICY "Institution admin update courses"
ON public.courses FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(id, auth.uid())
);

CREATE POLICY "Institution admin delete courses"
ON public.courses FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(id, auth.uid())
);
