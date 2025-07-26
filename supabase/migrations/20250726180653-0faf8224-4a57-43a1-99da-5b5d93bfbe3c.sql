-- Drop and recreate the handle_new_user function to ensure it uses the correct app_role type
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'recepcion'::app_role
  );
  
  -- Check if this is the admin user and promote them
  IF NEW.email = 'kikegallegopt@gmail.com' THEN
    UPDATE public.profiles 
    SET role = 'admin'::app_role 
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also recreate the promote_user_to_admin function to ensure proper typing
DROP FUNCTION IF EXISTS public.promote_user_to_admin(text, text);

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text, user_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;