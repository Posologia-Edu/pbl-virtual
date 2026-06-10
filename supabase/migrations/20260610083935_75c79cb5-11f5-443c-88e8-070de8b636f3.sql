
-- Fix 1: ai_usage_log - restrict SELECT to authenticated owner or admins
DROP POLICY IF EXISTS "Service role can read" ON public.ai_usage_log;
CREATE POLICY "Users read own ai usage"
ON public.ai_usage_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: admin_invites - allow institution admins to view invites they created
CREATE POLICY "Inviter views own invites"
ON public.admin_invites
FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

-- Fix 3: references bucket - restrict broad authenticated SELECT to owners only
DROP POLICY IF EXISTS "Authenticated users view references" ON storage.objects;
CREATE POLICY "Users view own reference files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'references'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 4: Audio storage - tighten SELECT/INSERT to require room membership
-- Path layout: audio/<room_id>/...
DROP POLICY IF EXISTS "Coordinator/professor read session audio" ON storage.objects;
CREATE POLICY "Room members read session audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'references'
  AND (storage.foldername(name))[1] = 'audio'
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id::text = (storage.foldername(name))[2]
      AND (
        r.professor_id = auth.uid()
        OR r.coordinator_id = auth.uid()
        OR public.is_group_member(r.group_id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

DROP POLICY IF EXISTS "Coordinator/professor upload session audio" ON storage.objects;
CREATE POLICY "Coordinator/professor upload session audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'references'
  AND (storage.foldername(name))[1] = 'audio'
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id::text = (storage.foldername(name))[2]
      AND (
        r.professor_id = auth.uid()
        OR r.coordinator_id = auth.uid()
      )
  )
);
