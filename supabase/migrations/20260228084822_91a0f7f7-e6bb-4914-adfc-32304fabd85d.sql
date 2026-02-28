
-- Fix sergio.araujo@ufrn.br: link invite to institution, set plan, create subscription
UPDATE public.admin_invites
SET institution_id = 'd1e13090-082c-48e8-8d8f-4c42067d13f3',
    assigned_plan = 'starter'
WHERE id = '0e054fe0-2ea6-45e1-b635-4ec2d80174a9';

-- Create subscription for sergio's institution
INSERT INTO public.subscriptions (
  owner_id, institution_id, stripe_customer_id, status, plan_name,
  max_students, max_rooms, ai_enabled, max_ai_interactions,
  ai_scenario_generation, peer_evaluation_enabled, badges_enabled,
  full_reports_enabled, whitelabel_enabled
) VALUES (
  '5277d168-7f0d-43ed-a900-f07833e96114',
  'd1e13090-082c-48e8-8d8f-4c42067d13f3',
  'invited_5277d168-7f0d-43ed-a900-f07833e96114',
  'active',
  'starter',
  30, 3, true, 50,
  false, false, false, false, false
);

-- Fix posologia.tech@gmail.com: change role to institution_admin
UPDATE public.user_roles
SET role = 'institution_admin'
WHERE user_id = '54bd1e1c-e0b2-4cab-a73b-aaa706daceac';

-- Create institution for posologia.tech
INSERT INTO public.institutions (id, name, owner_id)
VALUES (gen_random_uuid(), 'Instituição - posologia.tech', '54bd1e1c-e0b2-4cab-a73b-aaa706daceac')
RETURNING id;

-- We need the institution id, so let's use a DO block instead
DO $$
DECLARE
  new_inst_id uuid;
BEGIN
  -- Create institution for posologia.tech
  INSERT INTO public.institutions (name, owner_id)
  VALUES ('Instituição - posologia.tech', '54bd1e1c-e0b2-4cab-a73b-aaa706daceac')
  RETURNING id INTO new_inst_id;

  -- Update invite to link institution
  UPDATE public.admin_invites
  SET institution_id = new_inst_id,
      assigned_plan = 'enterprise'
  WHERE id = '952b538f-2acb-4d48-8f1b-bd85f53e9c6d';

  -- Create subscription
  INSERT INTO public.subscriptions (
    owner_id, institution_id, stripe_customer_id, status, plan_name,
    max_students, max_rooms, ai_enabled, max_ai_interactions,
    ai_scenario_generation, peer_evaluation_enabled, badges_enabled,
    full_reports_enabled, whitelabel_enabled
  ) VALUES (
    '54bd1e1c-e0b2-4cab-a73b-aaa706daceac',
    new_inst_id,
    'invited_54bd1e1c-e0b2-4cab-a73b-aaa706daceac',
    'active',
    'enterprise',
    999, 999, true, 999,
    true, true, true, true, true
  );
END $$;
