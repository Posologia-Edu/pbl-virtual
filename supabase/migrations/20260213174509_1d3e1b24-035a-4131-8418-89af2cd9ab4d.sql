
-- Fix: groups RLS has infinite recursion bug (gm.group_id = gm.id should be gm.group_id = groups.id)
DROP POLICY IF EXISTS "View groups" ON public.groups;
CREATE POLICY "View groups" ON public.groups
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR professor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id AND gm.student_id = auth.uid()
  )
);

-- Add FK: user_roles.user_id -> auth.users(id) (needed for data integrity)
-- Note: Can't add FK to auth.users for PostgREST joins with profiles
-- Instead we add explicit FKs between our public tables

-- Add FK: profiles.user_id -> auth.users is implicit, but we need 
-- user_roles to join with profiles via user_id matching
-- PostgREST needs explicit FKs, so we'll query separately in code instead

-- Add FK: groups.professor_id -> profiles.user_id (for PostgREST join)
ALTER TABLE public.groups
ADD CONSTRAINT groups_professor_id_profiles_fkey
FOREIGN KEY (professor_id) REFERENCES public.profiles(user_id);

-- Add FK: group_members.student_id -> profiles.user_id (for PostgREST join)
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_student_id_profiles_fkey
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id);
