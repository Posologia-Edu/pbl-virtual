DELETE FROM user_roles WHERE user_id IN ('4f17948a-8d70-45d0-ab18-8ab707bcfd95', '5c743e91-bb9b-4cce-9b01-ae6125557bf2') AND role = 'student';

-- Add unique constraint to prevent multiple roles per user
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);