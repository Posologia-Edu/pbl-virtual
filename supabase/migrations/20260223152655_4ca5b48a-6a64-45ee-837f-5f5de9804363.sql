
-- Allow institution_admin to create ONE institution (they set themselves as owner)
CREATE POLICY "Institution admin create own institution"
ON public.institutions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'institution_admin'::app_role)
  AND owner_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.institutions WHERE owner_id = auth.uid()
  )
);
