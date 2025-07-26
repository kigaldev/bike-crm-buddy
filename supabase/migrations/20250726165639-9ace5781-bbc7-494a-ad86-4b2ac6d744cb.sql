-- Create admin user with encrypted password
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'kikegallegopt@gmail.com',
  crypt('admin%$', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Kike Gallego"}',
  false,
  'authenticated'
) 
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Insert corresponding profile for the admin user
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  'kikegallegopt@gmail.com',
  'Kike Gallego',
  'admin'::app_role,
  now(),
  now()
FROM auth.users au 
WHERE au.email = 'kikegallegopt@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = now();