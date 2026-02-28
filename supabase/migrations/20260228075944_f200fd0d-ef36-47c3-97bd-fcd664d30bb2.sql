
-- 1. Change default role for new users from 'student' to 'professor'
CREATE OR REPLACE FUNCTION public.handle_new_user_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'professor');
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Add is_demo_user flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo_user boolean NOT NULL DEFAULT true;

-- 3. Mark all existing users as non-demo
UPDATE public.profiles SET is_demo_user = false WHERE is_demo_user = true;

-- 4. Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Mark all existing users as having completed onboarding
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed = false;
