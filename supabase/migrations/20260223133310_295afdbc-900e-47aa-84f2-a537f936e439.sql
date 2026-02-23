
-- Create SECURITY DEFINER helper functions to break RLS recursion cycles

-- Check if a user belongs to an institution admin's institution (via course_members)
CREATE OR REPLACE FUNCTION public.is_user_in_admin_institution(_user_id uuid, _admin_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM course_members cm
    JOIN courses c ON c.id = cm.course_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE cm.user_id = _user_id
      AND i.owner_id = _admin_id
  )
$$;

-- Check if a course belongs to an institution admin's institution
CREATE OR REPLACE FUNCTION public.is_course_in_admin_institution(_course_id uuid, _admin_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM courses c
    JOIN institutions i ON i.id = c.institution_id
    WHERE c.id = _course_id
      AND i.owner_id = _admin_id
  )
$$;

-- Check if a group belongs to an institution admin's institution
CREATE OR REPLACE FUNCTION public.is_group_in_admin_institution(_group_id uuid, _admin_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM groups g
    JOIN courses c ON c.id = g.course_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE g.id = _group_id
      AND i.owner_id = _admin_id
  )
$$;

-- Check if a user is a member of a given course (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_course_member(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_members
    WHERE course_id = _course_id AND user_id = _user_id
  )
$$;

-- Check if an institution has a member user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_institution_member(_institution_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM course_members cm
    JOIN courses c ON c.id = cm.course_id
    WHERE c.institution_id = _institution_id
      AND cm.user_id = _user_id
  )
$$;

-- Now fix all recursive policies

-- 1. user_roles: "Institution admin manage user_roles"
DROP POLICY IF EXISTS "Institution admin manage user_roles" ON public.user_roles;
CREATE POLICY "Institution admin manage user_roles"
ON public.user_roles FOR ALL
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_user_in_admin_institution(user_roles.user_id, auth.uid())
);

-- 2. course_members: "Institution admin manage course_members"
DROP POLICY IF EXISTS "Institution admin manage course_members" ON public.course_members;
CREATE POLICY "Institution admin manage course_members"
ON public.course_members FOR ALL
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_members.course_id, auth.uid())
);

-- 3. course_members: "View own membership" - already safe (user_id = auth.uid()), no change needed

-- 4. courses: "Members view own courses" - uses course_members, must use function
DROP POLICY IF EXISTS "Members view own courses" ON public.courses;
CREATE POLICY "Members view own courses"
ON public.courses FOR SELECT
USING (is_course_member(courses.id, auth.uid()));

-- 5. courses: "Institution admin manage courses" - uses institutions, must use function
DROP POLICY IF EXISTS "Institution admin manage courses" ON public.courses;
CREATE POLICY "Institution admin manage courses"
ON public.courses FOR ALL
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(courses.id, auth.uid())
);

-- 6. institutions: "Members view own institutions" - uses courses+course_members
DROP POLICY IF EXISTS "Members view own institutions" ON public.institutions;
CREATE POLICY "Members view own institutions"
ON public.institutions FOR SELECT
USING (is_institution_member(institutions.id, auth.uid()));

-- 7. profiles: "Institution admin view profiles"
DROP POLICY IF EXISTS "Institution admin view profiles" ON public.profiles;
CREATE POLICY "Institution admin view profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_user_in_admin_institution(profiles.user_id, auth.uid())
);

-- 8. groups: "Institution admin manage groups"
DROP POLICY IF EXISTS "Institution admin manage groups" ON public.groups;
CREATE POLICY "Institution admin manage groups"
ON public.groups FOR ALL
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(groups.id, auth.uid())
);

-- 9. group_members: "Institution admin manage group_members"
DROP POLICY IF EXISTS "Institution admin manage group_members" ON public.group_members;
CREATE POLICY "Institution admin manage group_members"
ON public.group_members FOR ALL
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(group_members.group_id, auth.uid())
);

-- 10. modules: "Institution admin manage modules"
DROP POLICY IF EXISTS "Institution admin manage modules" ON public.modules;
CREATE POLICY "Institution admin manage modules"
ON public.modules FOR ALL
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(modules.course_id, auth.uid())
);

-- 11. scenarios: "Institution admin manage scenarios"
DROP POLICY IF EXISTS "Institution admin manage scenarios" ON public.scenarios;
CREATE POLICY "Institution admin manage scenarios"
ON public.scenarios FOR ALL
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(scenarios.course_id, auth.uid())
);

-- 12. rooms: "Institution admin view rooms"
DROP POLICY IF EXISTS "Institution admin view rooms" ON public.rooms;
CREATE POLICY "Institution admin view rooms"
ON public.rooms FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(rooms.group_id, auth.uid())
);
