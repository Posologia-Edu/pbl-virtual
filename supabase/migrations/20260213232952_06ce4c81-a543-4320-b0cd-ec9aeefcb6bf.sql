
-- Allow admins to update any profile (including is_hidden)
CREATE POLICY "Admin update profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
