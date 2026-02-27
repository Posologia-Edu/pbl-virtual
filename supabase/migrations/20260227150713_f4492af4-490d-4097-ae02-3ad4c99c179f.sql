-- Allow institution_admin to insert room_scenarios for rooms in their institution
CREATE POLICY "Institution admin insert room_scenarios"
ON public.room_scenarios
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM rooms r
    JOIN groups g ON g.id = r.group_id
    JOIN courses c ON c.id = g.course_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE r.id = room_id
      AND i.owner_id = auth.uid()
  )
);

-- Allow institution_admin to read room_scenarios for rooms in their institution
CREATE POLICY "Institution admin view room_scenarios"
ON public.room_scenarios
FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM rooms r
    JOIN groups g ON g.id = r.group_id
    JOIN courses c ON c.id = g.course_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE r.id = room_id
      AND i.owner_id = auth.uid()
  )
);

-- Allow institution_admin to update room_scenarios for rooms in their institution
CREATE POLICY "Institution admin update room_scenarios"
ON public.room_scenarios
FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM rooms r
    JOIN groups g ON g.id = r.group_id
    JOIN courses c ON c.id = g.course_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE r.id = room_id
      AND i.owner_id = auth.uid()
  )
);

-- Allow institution_admin to delete room_scenarios for rooms in their institution
CREATE POLICY "Institution admin delete room_scenarios"
ON public.room_scenarios
FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM rooms r
    JOIN groups g ON g.id = r.group_id
    JOIN courses c ON c.id = g.course_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE r.id = room_id
      AND i.owner_id = auth.uid()
  )
);