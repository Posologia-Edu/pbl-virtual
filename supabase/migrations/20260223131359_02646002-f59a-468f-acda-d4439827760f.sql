
-- Table to track admin invites sent by superadmin
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

-- Enable RLS
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Only superadmin can manage invites
CREATE POLICY "Superadmin manage invites"
ON public.admin_invites
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
