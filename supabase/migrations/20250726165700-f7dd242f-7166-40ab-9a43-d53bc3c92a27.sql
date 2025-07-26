-- First, let's create a function to promote a user to admin after they sign up
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email text, user_full_name text)
RETURNS void AS $$
BEGIN
  -- Update or insert the profile with admin role
  INSERT INTO public.profiles (user_id, email, full_name, role, created_at, updated_at)
  SELECT 
    au.id,
    user_email,
    user_full_name,
    'admin'::app_role,
    now(),
    now()
  FROM auth.users au 
  WHERE au.email = user_email
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'admin'::app_role,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now promote the specific user if they exist
SELECT promote_user_to_admin('kikegallegopt@gmail.com', 'Kike Gallego');