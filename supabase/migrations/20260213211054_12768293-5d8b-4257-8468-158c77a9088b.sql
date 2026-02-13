
-- Add is_hidden to all relevant tables
ALTER TABLE public.institutions ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.modules ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.groups ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.scenarios ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

-- Function to check if a user is effectively hidden (directly or via hierarchy)
-- A user is effectively hidden if:
-- 1. Their profile is_hidden = true, OR
-- 2. ALL their course memberships belong to hidden courses or hidden institutions
CREATE OR REPLACE FUNCTION public.is_user_effectively_hidden(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Profile directly hidden
    EXISTS (SELECT 1 FROM profiles WHERE user_id = _user_id AND is_hidden = true)
    OR (
      -- User has course memberships but ALL are in hidden courses or hidden institutions
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
$$;
