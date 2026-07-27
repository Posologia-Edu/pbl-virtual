-- Enforce max_students at the database level as a universal backstop for
-- course_members inserts, regardless of which code path performs them
-- (manage-users, public-api, or any direct client call).

CREATE OR REPLACE FUNCTION public.institution_student_count(_institution_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT cm.user_id)::integer
  FROM public.course_members cm
  JOIN public.courses c ON c.id = cm.course_id
  JOIN public.user_roles ur ON ur.user_id = cm.user_id AND ur.role = 'student'
  WHERE c.institution_id = _institution_id
$$;

CREATE OR REPLACE FUNCTION public.check_student_limit_before_course_member_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _institution_id uuid;
  _max integer;
  _is_student boolean;
  _already_member boolean;
BEGIN
  SELECT institution_id INTO _institution_id FROM public.courses WHERE id = NEW.course_id;
  IF _institution_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'student'
  ) INTO _is_student;
  IF NOT _is_student THEN
    RETURN NEW;
  END IF;

  -- Already counted as a student in this institution via another course:
  -- adding them to one more course doesn't increase headcount.
  SELECT EXISTS(
    SELECT 1 FROM public.course_members cm2
    JOIN public.courses c2 ON c2.id = cm2.course_id
    WHERE c2.institution_id = _institution_id AND cm2.user_id = NEW.user_id
  ) INTO _already_member;
  IF _already_member THEN
    RETURN NEW;
  END IF;

  SELECT max_students INTO _max
  FROM public.subscriptions
  WHERE institution_id = _institution_id AND status IN ('active', 'trialing')
  LIMIT 1;

  IF _max IS NOT NULL AND _max < 99999
     AND public.institution_student_count(_institution_id) >= _max THEN
    RAISE EXCEPTION 'Limite de % alunos do plano atingido. Faça upgrade para cadastrar mais alunos.', _max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_student_limit_before_course_member_insert ON public.course_members;
CREATE TRIGGER enforce_student_limit_before_course_member_insert
BEFORE INSERT ON public.course_members
FOR EACH ROW EXECUTE FUNCTION public.check_student_limit_before_course_member_insert();
