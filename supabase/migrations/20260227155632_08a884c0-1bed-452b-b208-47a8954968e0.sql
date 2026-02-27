-- Clean up orphaned user_roles for user 4f17948a-8d70-45d0-ab18-8ab707bcfd95 (Ricardo)
-- This user was supposed to be deleted but the role persisted
DELETE FROM public.user_roles WHERE user_id = '4f17948a-8d70-45d0-ab18-8ab707bcfd95';
DELETE FROM public.course_members WHERE user_id = '4f17948a-8d70-45d0-ab18-8ab707bcfd95';
DELETE FROM public.group_members WHERE student_id = '4f17948a-8d70-45d0-ab18-8ab707bcfd95';
DELETE FROM public.profiles WHERE user_id = '4f17948a-8d70-45d0-ab18-8ab707bcfd95';