
-- 1. Add owner_id to institutions
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  stripe_product_id text,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'incomplete',
  plan_name text,
  max_students integer DEFAULT 30,
  max_rooms integer DEFAULT 3,
  ai_enabled boolean DEFAULT false,
  whitelabel_enabled boolean DEFAULT false,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(institution_id),
  UNIQUE(stripe_subscription_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage subscriptions"
ON public.subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Institution admin view own subscription"
ON public.subscriptions FOR SELECT
USING (owner_id = auth.uid());

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Security definer function
CREATE OR REPLACE FUNCTION public.is_institution_admin(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.institutions i ON i.owner_id = _user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'institution_admin'
      AND i.id = _institution_id
  )
$$;

-- 4. Institution admin policies for institutions
CREATE POLICY "Institution admin view own institution"
ON public.institutions FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Institution admin update own institution"
ON public.institutions FOR UPDATE USING (owner_id = auth.uid());

-- 5. Institution admin manage courses
CREATE POLICY "Institution admin manage courses"
ON public.courses FOR ALL
USING (EXISTS (
  SELECT 1 FROM institutions i
  WHERE i.id = courses.institution_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 6. Institution admin manage modules
CREATE POLICY "Institution admin manage modules"
ON public.modules FOR ALL
USING (EXISTS (
  SELECT 1 FROM courses c JOIN institutions i ON i.id = c.institution_id
  WHERE c.id = modules.course_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 7. Institution admin manage groups
CREATE POLICY "Institution admin manage groups"
ON public.groups FOR ALL
USING (EXISTS (
  SELECT 1 FROM courses c JOIN institutions i ON i.id = c.institution_id
  WHERE c.id = groups.course_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 8. Institution admin manage group_members
CREATE POLICY "Institution admin manage group_members"
ON public.group_members FOR ALL
USING (EXISTS (
  SELECT 1 FROM groups g JOIN courses c ON c.id = g.course_id
  JOIN institutions i ON i.id = c.institution_id
  WHERE g.id = group_members.group_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 9. Institution admin manage scenarios
CREATE POLICY "Institution admin manage scenarios"
ON public.scenarios FOR ALL
USING (EXISTS (
  SELECT 1 FROM courses c JOIN institutions i ON i.id = c.institution_id
  WHERE c.id = scenarios.course_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 10. Institution admin manage course_members
CREATE POLICY "Institution admin manage course_members"
ON public.course_members FOR ALL
USING (EXISTS (
  SELECT 1 FROM courses c JOIN institutions i ON i.id = c.institution_id
  WHERE c.id = course_members.course_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 11. Institution admin view profiles in their institution
CREATE POLICY "Institution admin view profiles"
ON public.profiles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM course_members cm JOIN courses c ON c.id = cm.course_id
  JOIN institutions i ON i.id = c.institution_id
  WHERE cm.user_id = profiles.user_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 12. Institution admin manage user_roles in their institution
CREATE POLICY "Institution admin manage user_roles"
ON public.user_roles FOR ALL
USING (EXISTS (
  SELECT 1 FROM course_members cm JOIN courses c ON c.id = cm.course_id
  JOIN institutions i ON i.id = c.institution_id
  WHERE cm.user_id = user_roles.user_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));

-- 13. Institution admin view rooms
CREATE POLICY "Institution admin view rooms"
ON public.rooms FOR SELECT
USING (EXISTS (
  SELECT 1 FROM groups g JOIN courses c ON c.id = g.course_id
  JOIN institutions i ON i.id = c.institution_id
  WHERE g.id = rooms.group_id AND i.owner_id = auth.uid()
    AND has_role(auth.uid(), 'institution_admin'::app_role)
));
