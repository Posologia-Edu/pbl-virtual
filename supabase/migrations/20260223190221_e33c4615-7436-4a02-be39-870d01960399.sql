
-- Make the references bucket private
UPDATE storage.buckets SET public = false WHERE id = 'references';

-- Replace the open SELECT policy with one requiring authentication
DROP POLICY IF EXISTS "Anyone can view references" ON storage.objects;

CREATE POLICY "Authenticated users view references"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'references'
  AND auth.uid() IS NOT NULL
);
