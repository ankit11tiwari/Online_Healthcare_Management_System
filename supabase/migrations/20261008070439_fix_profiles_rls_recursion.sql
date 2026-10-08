/*
# Fix infinite recursion in profiles RLS policies

## Problem
The profiles table policies reference the profiles table itself (e.g., `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')`) to check if a user is an admin. Under RLS, this creates an infinite recursion: to read profiles, Postgres checks the policy, which tries to read profiles, which checks the policy, etc.

## Fix
1. Create a SECURITY DEFINER function `get_user_role()` that reads the role from profiles BYPASSING RLS. This function is owned by the postgres user and runs with elevated privileges, so it can read the profiles table without triggering RLS recursion.
2. Replace all policy predicates that subquery profiles with calls to `get_user_role()`.
3. This affects policies on: profiles, appointments, availability_slots, medical_records, feedback, and system_settings.

## Security
- The function only returns the calling user's role — it does not expose any other data.
- The function is SECURITY DEFINER but only does a single SELECT by ID.
- All existing RLS policies are preserved in spirit, just with the recursion-safe function.
*/

-- ============================================================================
-- SECURITY DEFINER function to get user role without RLS recursion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- ============================================================================
-- PROFILES: replace recursive policies
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_or_all_profiles" ON profiles;
CREATE POLICY "select_own_or_all_profiles"
ON profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "update_own_or_all_profiles" ON profiles;
CREATE POLICY "update_own_or_all_profiles"
ON profiles FOR UPDATE TO authenticated
USING (
  auth.uid() = id OR public.get_user_role() = 'admin'
)
WITH CHECK (
  auth.uid() = id OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "insert_profiles_admin" ON profiles;
CREATE POLICY "insert_profiles_admin"
ON profiles FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "delete_profiles_admin" ON profiles;
CREATE POLICY "delete_profiles_admin"
ON profiles FOR DELETE TO authenticated
USING (
  public.get_user_role() = 'admin'
);

-- ============================================================================
-- APPOINTMENTS: replace recursive policies
-- ============================================================================
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_appointments_role" ON appointments;
CREATE POLICY "select_appointments_role"
ON appointments FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "insert_appointments_role" ON appointments;
CREATE POLICY "insert_appointments_role"
ON appointments FOR INSERT TO authenticated
WITH CHECK (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "update_appointments_role" ON appointments;
CREATE POLICY "update_appointments_role"
ON appointments FOR UPDATE TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
)
WITH CHECK (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "delete_appointments_admin" ON appointments;
CREATE POLICY "delete_appointments_admin"
ON appointments FOR DELETE TO authenticated
USING (
  public.get_user_role() = 'admin'
);

-- ============================================================================
-- AVAILABILITY_SLOTS: replace recursive policies
-- ============================================================================
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_slots_all" ON availability_slots;
CREATE POLICY "select_slots_all"
ON availability_slots FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert_slots_doctor_or_admin" ON availability_slots;
CREATE POLICY "insert_slots_doctor_or_admin"
ON availability_slots FOR INSERT TO authenticated
WITH CHECK (
  doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "update_slots_doctor_or_admin" ON availability_slots;
CREATE POLICY "update_slots_doctor_or_admin"
ON availability_slots FOR UPDATE TO authenticated
USING (
  doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
)
WITH CHECK (
  doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "delete_slots_doctor_or_admin" ON availability_slots;
CREATE POLICY "delete_slots_doctor_or_admin"
ON availability_slots FOR DELETE TO authenticated
USING (
  doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

-- ============================================================================
-- MEDICAL_RECORDS: replace recursive policies
-- ============================================================================
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_medical_records_role" ON medical_records;
CREATE POLICY "select_medical_records_role"
ON medical_records FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "insert_medical_records_doctor" ON medical_records;
CREATE POLICY "insert_medical_records_doctor"
ON medical_records FOR INSERT TO authenticated
WITH CHECK (
  doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "update_medical_records_doctor" ON medical_records;
CREATE POLICY "update_medical_records_doctor"
ON medical_records FOR UPDATE TO authenticated
USING (
  doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
)
WITH CHECK (
  doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "delete_medical_records_admin" ON medical_records;
CREATE POLICY "delete_medical_records_admin"
ON medical_records FOR DELETE TO authenticated
USING (
  public.get_user_role() = 'admin'
);

-- ============================================================================
-- FEEDBACK: replace recursive policies
-- ============================================================================
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_feedback_role" ON feedback;
CREATE POLICY "select_feedback_role"
ON feedback FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "insert_feedback_patient" ON feedback;
CREATE POLICY "insert_feedback_patient"
ON feedback FOR INSERT TO authenticated
WITH CHECK (
  patient_id = auth.uid()
);

DROP POLICY IF EXISTS "delete_feedback_admin" ON feedback;
CREATE POLICY "delete_feedback_admin"
ON feedback FOR DELETE TO authenticated
USING (
  public.get_user_role() = 'admin'
);

-- ============================================================================
-- SYSTEM_SETTINGS: replace recursive policies
-- ============================================================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_settings_all" ON system_settings;
CREATE POLICY "select_settings_all"
ON system_settings FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "update_settings_admin" ON system_settings;
CREATE POLICY "update_settings_admin"
ON system_settings FOR UPDATE TO authenticated
USING (
  public.get_user_role() = 'admin'
)
WITH CHECK (
  public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "insert_settings_admin" ON system_settings;
CREATE POLICY "insert_settings_admin"
ON system_settings FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() = 'admin'
);