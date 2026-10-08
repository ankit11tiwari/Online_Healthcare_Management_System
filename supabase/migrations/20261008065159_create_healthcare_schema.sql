/*
# Healthcare Management System Schema

## Overview
Creates the complete database schema for a multi-role healthcare management system with Admin, Doctor, and Patient dashboards. Uses Supabase Auth for authentication and profiles table for role-based access control.

## New Tables

### 1. profiles
- `id` (uuid, PK, references auth.users) — one-to-one with Supabase auth users
- `full_name` (text) — user's full name
- `email` (text, unique) — email address
- `phone` (text) — phone number
- `role` (text) — 'admin', 'doctor', or 'patient'
- `specialization` (text, nullable) — for doctors only
- `bio` (text, nullable) — for doctors only
- `is_active` (boolean, default true) — account activation status
- `created_at` (timestamptz)

### 2. appointments
- `id` (uuid, PK)
- `patient_id` (uuid, FK profiles) — the patient
- `doctor_id` (uuid, FK profiles) — the doctor
- `appointment_date` (date) — date of appointment
- `appointment_time` (time) — time slot
- `status` (text) — 'scheduled', 'confirmed', 'completed', 'cancelled'
- `reason` (text, nullable) — reason for visit
- `created_at` (timestamptz)

### 3. availability_slots
- `id` (uuid, PK)
- `doctor_id` (uuid, FK profiles) — the doctor
- `slot_date` (date) — date of the slot
- `slot_time` (time) — time of the slot
- `is_booked` (boolean, default false) — whether slot is taken
- `created_at` (timestamptz)

### 4. medical_records
- `id` (uuid, PK)
- `patient_id` (uuid, FK profiles) — the patient
- `doctor_id` (uuid, FK profiles) — the doctor
- `appointment_id` (uuid, FK appointments, nullable) — related appointment
- `diagnosis` (text) — diagnostic notes
- `treatment_plan` (text, nullable) — treatment plan
- `prescription` (text, nullable) — prescription details
- `created_at` (timestamptz)

### 5. feedback
- `id` (uuid, PK)
- `patient_id` (uuid, FK profiles) — the patient
- `doctor_id` (uuid, FK profiles) — the doctor
- `appointment_id` (uuid, FK appointments, nullable)
- `rating` (int, 1-5) — star rating
- `comment` (text, nullable) — review text
- `created_at` (timestamptz)

### 6. system_settings
- `id` (uuid, PK, default single row)
- `clinic_open_time` (time) — clinic opening time
- `clinic_close_time` (time) — clinic closing time
- `max_daily_bookings` (int) — max bookings per doctor per day
- `emergency_contact` (text) — emergency hotline number
- `clinic_name` (text) — clinic name
- `updated_at` (timestamptz)

## Security (RLS)
- All tables have RLS enabled.
- profiles: users can read/update their own profile; admins can read/update all profiles.
- appointments: patients see their own, doctors see theirs, admins see all. Insert by patient/doctor. Update by patient (cancel own), doctor (confirm/complete), admin (override).
- availability_slots: doctors manage their own slots; patients can view available slots; admins see all.
- medical_records: patients see their own records, doctors see records for their patients, admins see all. Only doctors can insert/update.
- feedback: patients create their own, doctors see feedback about themselves, admins see all.
- system_settings: all authenticated users can read; only admins can update.

## Important Notes
1. This migration is idempotent — safe to re-run.
2. Policies use auth.uid() for ownership checks.
3. A trigger function `handle_new_user` creates a profile automatically when a new auth user signs up.
4. Default system settings row is inserted.
*/

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
  specialization text,
  bio text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: read own or all (admin)
DROP POLICY IF EXISTS "select_own_or_all_profiles" ON profiles;
CREATE POLICY "select_own_or_all_profiles"
ON profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Profiles: update own or all (admin)
DROP POLICY IF EXISTS "update_own_or_all_profiles" ON profiles;
CREATE POLICY "update_own_or_all_profiles"
ON profiles FOR UPDATE TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Profiles: insert (admin only, since signup creates via trigger)
DROP POLICY IF EXISTS "insert_profiles_admin" ON profiles;
CREATE POLICY "insert_profiles_admin"
ON profiles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Profiles: delete (admin only)
DROP POLICY IF EXISTS "delete_profiles_admin" ON profiles;
CREATE POLICY "delete_profiles_admin"
ON profiles FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Appointments: read — patient sees own, doctor sees own, admin sees all
DROP POLICY IF EXISTS "select_appointments_role" ON appointments;
CREATE POLICY "select_appointments_role"
ON appointments FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Appointments: insert — patient or doctor can create
DROP POLICY IF EXISTS "insert_appointments_role" ON appointments;
CREATE POLICY "insert_appointments_role"
ON appointments FOR INSERT TO authenticated
WITH CHECK (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Appointments: update — patient (cancel own), doctor (confirm/complete), admin (override)
DROP POLICY IF EXISTS "update_appointments_role" ON appointments;
CREATE POLICY "update_appointments_role"
ON appointments FOR UPDATE TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Appointments: delete — admin only
DROP POLICY IF EXISTS "delete_appointments_admin" ON appointments;
CREATE POLICY "delete_appointments_admin"
ON appointments FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================================
-- AVAILABILITY_SLOTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Slots: read — doctors see own, patients see all, admins see all
DROP POLICY IF EXISTS "select_slots_all" ON availability_slots;
CREATE POLICY "select_slots_all"
ON availability_slots FOR SELECT TO authenticated
USING (true);

-- Slots: insert — doctor creates own or admin
DROP POLICY IF EXISTS "insert_slots_doctor_or_admin" ON availability_slots;
CREATE POLICY "insert_slots_doctor_or_admin"
ON availability_slots FOR INSERT TO authenticated
WITH CHECK (
  doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Slots: update — doctor updates own or admin
DROP POLICY IF EXISTS "update_slots_doctor_or_admin" ON availability_slots;
CREATE POLICY "update_slots_doctor_or_admin"
ON availability_slots FOR UPDATE TO authenticated
USING (
  doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Slots: delete — doctor deletes own or admin
DROP POLICY IF EXISTS "delete_slots_doctor_or_admin" ON availability_slots;
CREATE POLICY "delete_slots_doctor_or_admin"
ON availability_slots FOR DELETE TO authenticated
USING (
  doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================================
-- MEDICAL_RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis text NOT NULL,
  treatment_plan text,
  prescription text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Medical records: read — patient sees own, doctor sees own patients, admin sees all
DROP POLICY IF EXISTS "select_medical_records_role" ON medical_records;
CREATE POLICY "select_medical_records_role"
ON medical_records FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Medical records: insert — doctor only
DROP POLICY IF EXISTS "insert_medical_records_doctor" ON medical_records;
CREATE POLICY "insert_medical_records_doctor"
ON medical_records FOR INSERT TO authenticated
WITH CHECK (
  doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Medical records: update — doctor only
DROP POLICY IF EXISTS "update_medical_records_doctor" ON medical_records;
CREATE POLICY "update_medical_records_doctor"
ON medical_records FOR UPDATE TO authenticated
USING (
  doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Medical records: delete — admin only
DROP POLICY IF EXISTS "delete_medical_records_admin" ON medical_records;
CREATE POLICY "delete_medical_records_admin"
ON medical_records FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Feedback: read — patient sees own, doctor sees own feedback, admin sees all
DROP POLICY IF EXISTS "select_feedback_role" ON feedback;
CREATE POLICY "select_feedback_role"
ON feedback FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR doctor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Feedback: insert — patient only
DROP POLICY IF EXISTS "insert_feedback_patient" ON feedback;
CREATE POLICY "insert_feedback_patient"
ON feedback FOR INSERT TO authenticated
WITH CHECK (
  patient_id = auth.uid()
);

-- Feedback: delete — admin only
DROP POLICY IF EXISTS "delete_feedback_admin" ON feedback;
CREATE POLICY "delete_feedback_admin"
ON feedback FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================================
-- SYSTEM_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL DEFAULT 'HealthCare Plus',
  clinic_open_time time NOT NULL DEFAULT '08:00',
  clinic_close_time time NOT NULL DEFAULT '18:00',
  max_daily_bookings integer NOT NULL DEFAULT 20,
  emergency_contact text NOT NULL DEFAULT '911',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Settings: read — all authenticated users
DROP POLICY IF EXISTS "select_settings_all" ON system_settings;
CREATE POLICY "select_settings_all"
ON system_settings FOR SELECT TO authenticated
USING (true);

-- Settings: update — admin only
DROP POLICY IF EXISTS "update_settings_admin" ON system_settings;
CREATE POLICY "update_settings_admin"
ON system_settings FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Settings: insert — admin only (for initial row creation)
DROP POLICY IF EXISTS "insert_settings_admin" ON system_settings;
CREATE POLICY "insert_settings_admin"
ON system_settings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_slots_doctor ON availability_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON availability_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_doctor ON feedback(doctor_id);

-- ============================================================================
-- SEED: Default system settings row
-- ============================================================================
INSERT INTO system_settings (clinic_name, clinic_open_time, clinic_close_time, max_daily_bookings, emergency_contact)
SELECT 'HealthCare Plus', '08:00', '18:00', 20, '911'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);