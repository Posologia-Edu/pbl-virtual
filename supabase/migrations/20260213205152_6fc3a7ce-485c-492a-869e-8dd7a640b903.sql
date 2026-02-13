
-- 1. Institutions table
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage institutions" ON public.institutions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage courses" ON public.courses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Course members
CREATE TABLE public.course_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
ALTER TABLE public.course_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage course members" ON public.course_members FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "View own membership" ON public.course_members FOR SELECT USING (user_id = auth.uid());

-- 4. Now add cross-reference policies
CREATE POLICY "Members view own institutions" ON public.institutions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.course_members cm ON cm.course_id = c.id
    WHERE c.institution_id = institutions.id AND cm.user_id = auth.uid()
  )
);
CREATE POLICY "Members view own courses" ON public.courses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.course_members cm
    WHERE cm.course_id = courses.id AND cm.user_id = auth.uid()
  )
);

-- 5. Add course_id to existing tables
ALTER TABLE public.modules ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.groups ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.scenarios ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
