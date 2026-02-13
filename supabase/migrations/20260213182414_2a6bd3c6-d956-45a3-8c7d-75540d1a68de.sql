
-- Auto-create room when a group is created
CREATE OR REPLACE FUNCTION public.auto_create_room_for_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.rooms (name, group_id, professor_id, status)
  VALUES (NEW.name, NEW.id, NEW.professor_id, 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_room_on_group_insert
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_room_for_group();

-- Create rooms for existing groups that don't have one yet
INSERT INTO public.rooms (name, group_id, professor_id, status)
SELECT g.name, g.id, g.professor_id, 'active'
FROM public.groups g
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.group_id = g.id
);
