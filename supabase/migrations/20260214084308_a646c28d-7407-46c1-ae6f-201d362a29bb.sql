-- Allow the coordinator student to update timer fields on rooms
CREATE POLICY "Coordinator update timer"
ON public.rooms
FOR UPDATE
USING (coordinator_id = auth.uid())
WITH CHECK (coordinator_id = auth.uid());