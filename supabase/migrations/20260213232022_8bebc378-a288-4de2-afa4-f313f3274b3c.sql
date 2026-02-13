
CREATE OR REPLACE FUNCTION public.is_user_effectively_hidden(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    -- Profile directly hidden
    EXISTS (SELECT 1 FROM profiles WHERE user_id = _user_id AND is_hidden = true)
    OR (
      -- Student: has course memberships but ALL are in hidden courses or hidden institutions
      EXISTS (SELECT 1 FROM course_members WHERE user_id = _user_id)
      AND NOT EXISTS (
        SELECT 1
        FROM course_members cm
        JOIN courses c ON c.id = cm.course_id
        JOIN institutions i ON i.id = c.institution_id
        WHERE cm.user_id = _user_id
          AND c.is_hidden = false
          AND i.is_hidden = false
      )
    )
    OR (
      -- Professor: has groups but ALL groups are hidden or belong to hidden courses/modules/institutions
      EXISTS (SELECT 1 FROM groups WHERE professor_id = _user_id)
      AND NOT EXISTS (
        SELECT 1
        FROM groups g
        LEFT JOIN courses c ON c.id = g.course_id
        LEFT JOIN institutions i ON i.id = c.institution_id
        LEFT JOIN modules m ON m.id = g.module_id
        WHERE g.professor_id = _user_id
          AND g.is_hidden = false
          AND (g.course_id IS NULL OR c.is_hidden = false)
          AND (c.institution_id IS NULL OR i.is_hidden = false)
          AND (g.module_id IS NULL OR m.is_hidden = false)
      )
    )
$$;
