CREATE POLICY "Reporter update tutorial_sessions whiteboard"
ON public.tutorial_sessions
FOR UPDATE
USING (EXISTS (SELECT 1 FROM rooms r WHERE r.id = tutorial_sessions.room_id AND r.reporter_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM rooms r WHERE r.id = tutorial_sessions.room_id AND r.reporter_id = auth.uid()));