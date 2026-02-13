-- Insert profile for admin user
INSERT INTO public.profiles (user_id, full_name)
VALUES ('8f4edc5a-bb0f-49f0-a369-26b485306b2e', 'Sergio Ricardo Fernandes de Araújo')
ON CONFLICT (user_id) DO NOTHING;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('8f4edc5a-bb0f-49f0-a369-26b485306b2e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
