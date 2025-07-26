-- Update the enum to use 'tecnico' instead of 'mecanico'
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('admin', 'tecnico', 'recepcion', 'auditor');

-- Drop and recreate the handle_new_user function with correct enum
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