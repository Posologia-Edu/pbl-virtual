
-- Create security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND student_id = _student_id
  )
$$;

-- Create security definer function to check if user is professor of a group
CREATE OR REPLACE FUNCTION public.is_group_professor(_group_id uuid, _professor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND professor_id = _professor_id
  )
$$;

-- Fix groups SELECT policy: use security definer to avoid cross-recursion
DROP POLICY IF EXISTS "View groups" ON public.groups;
CREATE POLICY "View groups" ON public.groups
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR professor_id = auth.uid()
  OR is_group_member(id, auth.uid())
);

-- Fix group_members SELECT policy: use security definer to avoid cross-recursion  
DROP POLICY IF EXISTS "View members" ON public.group_members;
CREATE POLICY "View members" ON public.group_members
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR student_id = auth.uid()
  OR is_group_professor(group_id, auth.uid())
);
