
-- ===== GROUPS: Split ALL policy into granular policies =====
DROP POLICY "Institution admin manage groups" ON public.groups;

CREATE POLICY "Institution admin insert groups"
ON public.groups FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND course_id IS NOT NULL
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin select groups"
ON public.groups FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(id, auth.uid())
);

CREATE POLICY "Institution admin update groups"
ON public.groups FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(id, auth.uid())
);

CREATE POLICY "Institution admin delete groups"
ON public.groups FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(id, auth.uid())
);

-- ===== MODULES: Split ALL policy into granular policies =====
DROP POLICY "Institution admin manage modules" ON public.modules;

CREATE POLICY "Institution admin insert modules"
ON public.modules FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND course_id IS NOT NULL
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin select modules"
ON public.modules FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin update modules"
ON public.modules FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin delete modules"
ON public.modules FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

-- ===== SCENARIOS: Split ALL policy into granular policies =====
DROP POLICY "Institution admin manage scenarios" ON public.scenarios;

CREATE POLICY "Institution admin insert scenarios"
ON public.scenarios FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND course_id IS NOT NULL
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin select scenarios"
ON public.scenarios FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin update scenarios"
ON public.scenarios FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin delete scenarios"
ON public.scenarios FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

-- ===== GROUP_MEMBERS: Split ALL policy into granular policies =====
DROP POLICY "Institution admin manage group_members" ON public.group_members;

CREATE POLICY "Institution admin insert group_members"
ON public.group_members FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(group_id, auth.uid())
);

CREATE POLICY "Institution admin select group_members"
ON public.group_members FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(group_id, auth.uid())
);

CREATE POLICY "Institution admin update group_members"
ON public.group_members FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(group_id, auth.uid())
);

CREATE POLICY "Institution admin delete group_members"
ON public.group_members FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_group_in_admin_institution(group_id, auth.uid())
);

-- ===== COURSE_MEMBERS: Split ALL policy into granular policies =====
DROP POLICY "Institution admin manage course_members" ON public.course_members;

CREATE POLICY "Institution admin insert course_members"
ON public.course_members FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin select course_members"
ON public.course_members FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin update course_members"
ON public.course_members FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

CREATE POLICY "Institution admin delete course_members"
ON public.course_members FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_course_in_admin_institution(course_id, auth.uid())
);

-- ===== USER_ROLES: Split ALL policy into granular policies =====
DROP POLICY "Institution admin manage user_roles" ON public.user_roles;

CREATE POLICY "Institution admin insert user_roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_user_in_admin_institution(user_id, auth.uid())
);

CREATE POLICY "Institution admin select user_roles"
ON public.user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_user_in_admin_institution(user_id, auth.uid())
);

CREATE POLICY "Institution admin update user_roles"
ON public.user_roles FOR UPDATE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_user_in_admin_institution(user_id, auth.uid())
);

CREATE POLICY "Institution admin delete user_roles"
ON public.user_roles FOR DELETE
USING (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND is_user_in_admin_institution(user_id, auth.uid())
);
