
-- Link the existing Stripe subscription to the local user
INSERT INTO public.subscriptions (
  owner_id, institution_id, stripe_customer_id, stripe_subscription_id,
  stripe_product_id, stripe_price_id, status, plan_name,
  current_period_start, current_period_end,
  max_students, max_rooms, max_ai_interactions,
  ai_enabled, ai_scenario_generation, peer_evaluation_enabled,
  badges_enabled, full_reports_enabled, whitelabel_enabled
) VALUES (
  'c36b4754-5a70-463e-af9a-ceb1c0582d52',
  '9aaf3519-c65c-4211-bfa3-5ce511e5b8a1',
  'cus_U3rM456OfmIxKB',
  'sub_1T5jdkHRnDD6dn6iKWePhtIh',
  'prod_U22MNDlQOLbcmr',
  'price_1T3yHIHRnDD6dn6iLSvmwfFh',
  'trialing',
  'starter',
  to_timestamp(1772270206),
  to_timestamp(1773479806),
  30, 3, 50,
  true, false, false,
  false, false, false
)
ON CONFLICT DO NOTHING;

-- Ensure user has institution_admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('c36b4754-5a70-463e-af9a-ceb1c0582d52', 'institution_admin')
ON CONFLICT DO NOTHING;
