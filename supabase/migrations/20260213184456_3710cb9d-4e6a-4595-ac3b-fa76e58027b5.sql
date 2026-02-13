
-- Allow admins to update rooms (needed for scenario release from admin panel)
CREATE POLICY "Admin update rooms"
ON public.rooms FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
