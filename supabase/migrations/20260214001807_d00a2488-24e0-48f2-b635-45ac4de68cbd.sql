-- Add NULL validation to is_group_member
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _group_id IS NULL OR _student_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = _group_id AND student_id = _student_id
    )
  END
$$;

-- Add NULL validation to is_group_professor
CREATE OR REPLACE FUNCTION public.is_group_professor(_group_id uuid, _professor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _group_id IS NULL OR _professor_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = _group_id AND professor_id = _professor_id
    )
  END
$$;