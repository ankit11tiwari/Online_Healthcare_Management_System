/*
# Fix trigger to save specialization and bio on signup

## Problem
The handle_new_user trigger only saved full_name, email, and role from raw_user_meta_data, but not specialization. When doctors sign up with a specialization, it was lost.

## Fix
Update the trigger function to also insert specialization from raw_user_meta_data.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, specialization)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    NULLIF(NEW.raw_user_meta_data->>'specialization', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();