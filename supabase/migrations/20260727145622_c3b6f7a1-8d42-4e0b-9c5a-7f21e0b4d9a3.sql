-- Enforce plan limits that were previously only decorative in the frontend:
-- 1) max_rooms, 2) whitelabel_enabled, 3) peer_evaluation_enabled, 4) badges_enabled

-- ============================================================
-- 1. Room limit (max_rooms)
-- ============================================================

CREATE OR REPLACE FUNCTION public.institution_room_count(_institution_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.rooms r
  JOIN public.groups g ON g.id = r.group_id
  JOIN public.courses c ON c.id = g.course_id
  WHERE c.institution_id = _institution_id AND r.status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.check_room_limit_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _institution_id uuid;
  _max integer;
BEGIN
  SELECT c.institution_id INTO _institution_id
  FROM public.groups g
  JOIN public.courses c ON c.id = g.course_id
  WHERE g.id = NEW.group_id;

  IF _institution_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT max_rooms INTO _max
  FROM public.subscriptions
  WHERE institution_id = _institution_id AND status IN ('active', 'trialing')
  LIMIT 1;

  IF _max IS NOT NULL AND _max < 99999
     AND public.institution_room_count(_institution_id) >= _max THEN
    RAISE EXCEPTION 'Limite de % salas do plano atingido. Faça upgrade para criar mais salas.', _max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_room_limit_before_insert ON public.rooms;
CREATE TRIGGER enforce_room_limit_before_insert
BEFORE INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.check_room_limit_before_insert();

-- ============================================================
-- 2. White-label / branding (whitelabel_enabled)
-- ============================================================

CREATE OR REPLACE FUNCTION public.institution_whitelabel_enabled(_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT whitelabel_enabled FROM public.subscriptions
     WHERE institution_id = _institution_id AND status IN ('active', 'trialing')
     LIMIT 1),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.check_whitelabel_before_institution_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF (NEW.brand_primary_color IS DISTINCT FROM OLD.brand_primary_color
      OR NEW.brand_secondary_color IS DISTINCT FROM OLD.brand_secondary_color
      OR NEW.brand_accent_color IS DISTINCT FROM OLD.brand_accent_color
      OR NEW.brand_logo_url IS DISTINCT FROM OLD.brand_logo_url
      OR NEW.brand_platform_name IS DISTINCT FROM OLD.brand_platform_name)
     AND NOT public.institution_whitelabel_enabled(NEW.id) THEN
    RAISE EXCEPTION 'Personalização de marca (white-label) não disponível no seu plano. Faça upgrade para o plano Enterprise.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_whitelabel_before_institution_update ON public.institutions;
CREATE TRIGGER enforce_whitelabel_before_institution_update
BEFORE UPDATE ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.check_whitelabel_before_institution_update();

-- ============================================================
-- 3. Peer evaluation (peer_evaluation_enabled)
-- ============================================================

CREATE OR REPLACE FUNCTION public.room_peer_evaluation_enabled(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.peer_evaluation_enabled
     FROM public.rooms r
     JOIN public.groups g ON g.id = r.group_id
     JOIN public.courses c ON c.id = g.course_id
     JOIN public.subscriptions s ON s.institution_id = c.institution_id AND s.status IN ('active', 'trialing')
     WHERE r.id = _room_id
     LIMIT 1),
    true
  )
$$;

DROP POLICY IF EXISTS "Students insert own peer evals" ON public.peer_evaluations;
CREATE POLICY "Students insert own peer evals"
ON public.peer_evaluations FOR INSERT
WITH CHECK (
  evaluator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM rooms r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = peer_evaluations.room_id AND gm.student_id = auth.uid()
  )
  AND public.room_peer_evaluation_enabled(peer_evaluations.room_id)
);

-- ============================================================
-- 4. Badges (badges_enabled) — tighten overly-permissive insert policy
-- ============================================================
-- The compute-badges edge function uses the service-role key, which already
-- bypasses RLS, so this policy was only ever needed to let arbitrary
-- authenticated/anon clients insert badges directly — closing that hole.

DROP POLICY IF EXISTS "Service insert badges" ON public.user_badges;
