-- Allow students to see all members in groups they belong to
CREATE POLICY "Students view same group members"
ON public.group_members
FOR SELECT
USING (
  is_group_member(group_id, auth.uid())
);
