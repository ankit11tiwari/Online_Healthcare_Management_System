/*
# Seed demo data — doctors, patients, appointments, slots, records, feedback

## Overview
Creates demo auth users with profiles for 4 doctors and 3 patients, plus availability slots, appointments, medical records, and feedback. All demo accounts use password: Demo1234!

## Demo Accounts (password: Demo1234!)
### Doctors
- dr.sarah.johnson@demo.health — Cardiology
- dr.michael.chen@demo.health — Neurology
- dr.emily.rodriguez@demo.health — Pediatrics
- dr.james.wilson@demo.health — Orthopedics

### Patients
- john.davis@demo.health
- maria.garcia@demo.health
- robert.brown@demo.health
*/

-- ============================================================================
-- DEMO USERS
-- ============================================================================
DO $$
DECLARE
  pw text := crypt('Demo1234!', gen_salt('bf'));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dr.sarah.johnson@demo.health') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id)
    VALUES ('a1111111-1111-1111-1111-111111111111'::uuid, 'dr.sarah.johnson@demo.health', pw, now(), now(), now(), '{"full_name":"Dr. Sarah Johnson","role":"doctor","specialization":"Cardiology"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dr.michael.chen@demo.health') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id)
    VALUES ('a2222222-2222-2222-2222-222222222222'::uuid, 'dr.michael.chen@demo.health', pw, now(), now(), now(), '{"full_name":"Dr. Michael Chen","role":"doctor","specialization":"Neurology"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dr.emily.rodriguez@demo.health') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id)
    VALUES ('a3333333-3333-3333-3333-333333333333'::uuid, 'dr.emily.rodriguez@demo.health', pw, now(), now(), now(), '{"full_name":"Dr. Emily Rodriguez","role":"doctor","specialization":"Pediatrics"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dr.james.wilson@demo.health') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id)
    VALUES ('a4444444-4444-4444-4444-444444444444'::uuid, 'dr.james.wilson@demo.health', pw, now(), now(), now(), '{"full_name":"Dr. James Wilson","role":"doctor","specialization":"Orthopedics"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'john.davis@demo.health') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id)
    VALUES ('b1111111-1111-1111-1111-111111111111'::uuid, 'john.davis@demo.health', pw, now(), now(), now(), '{"full_name":"John Davis","role":"patient"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'maria.garcia@demo.health') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id)
    VALUES ('b2222222-2222-2222-2222-222222222222'::uuid, 'maria.garcia@demo.health', pw, now(), now(), now(), '{"full_name":"Maria Garcia","role":"patient"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'robert.brown@demo.health') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id)
    VALUES ('b3333333-3333-3333-3333-333333333333'::uuid, 'robert.brown@demo.health', pw, now(), now(), now(), '{"full_name":"Robert Brown","role":"patient"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  END IF;
END $$;

-- ============================================================================
-- DEMO PROFILES
-- ============================================================================
INSERT INTO profiles (id, full_name, email, phone, role, specialization, is_active)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, 'Dr. Sarah Johnson', 'dr.sarah.johnson@demo.health', '555-0101', 'doctor', 'Cardiology', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'a1111111-1111-1111-1111-111111111111'::uuid)
ON CONFLICT (id) DO UPDATE SET specialization = EXCLUDED.specialization, phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

INSERT INTO profiles (id, full_name, email, phone, role, specialization, is_active)
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, 'Dr. Michael Chen', 'dr.michael.chen@demo.health', '555-0102', 'doctor', 'Neurology', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'a2222222-2222-2222-2222-222222222222'::uuid)
ON CONFLICT (id) DO UPDATE SET specialization = EXCLUDED.specialization, phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

INSERT INTO profiles (id, full_name, email, phone, role, specialization, is_active)
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, 'Dr. Emily Rodriguez', 'dr.emily.rodriguez@demo.health', '555-0103', 'doctor', 'Pediatrics', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'a3333333-3333-3333-3333-333333333333'::uuid)
ON CONFLICT (id) DO UPDATE SET specialization = EXCLUDED.specialization, phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

INSERT INTO profiles (id, full_name, email, phone, role, specialization, is_active)
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, 'Dr. James Wilson', 'dr.james.wilson@demo.health', '555-0104', 'doctor', 'Orthopedics', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'a4444444-4444-4444-4444-444444444444'::uuid)
ON CONFLICT (id) DO UPDATE SET specialization = EXCLUDED.specialization, phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

INSERT INTO profiles (id, full_name, email, phone, role, is_active)
SELECT 'b1111111-1111-1111-1111-111111111111'::uuid, 'John Davis', 'john.davis@demo.health', '555-0201', 'patient', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'b1111111-1111-1111-1111-111111111111'::uuid)
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

INSERT INTO profiles (id, full_name, email, phone, role, is_active)
SELECT 'b2222222-2222-2222-2222-222222222222'::uuid, 'Maria Garcia', 'maria.garcia@demo.health', '555-0202', 'patient', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'b2222222-2222-2222-2222-222222222222'::uuid)
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

INSERT INTO profiles (id, full_name, email, phone, role, is_active)
SELECT 'b3333333-3333-3333-3333-333333333333'::uuid, 'Robert Brown', 'robert.brown@demo.health', '555-0203', 'patient', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'b3333333-3333-3333-3333-333333333333'::uuid)
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

-- ============================================================================
-- AVAILABILITY SLOTS
-- ============================================================================
INSERT INTO availability_slots (doctor_id, slot_date, slot_time, is_booked)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, (CURRENT_DATE + 2), '09:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a1111111-1111-1111-1111-111111111111'::uuid AND slot_date = (CURRENT_DATE + 2) AND slot_time = '09:00'::time)
UNION ALL
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, (CURRENT_DATE + 2), '10:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a1111111-1111-1111-1111-111111111111'::uuid AND slot_date = (CURRENT_DATE + 2) AND slot_time = '10:00'::time)
UNION ALL
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, (CURRENT_DATE + 2), '11:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a1111111-1111-1111-1111-111111111111'::uuid AND slot_date = (CURRENT_DATE + 2) AND slot_time = '11:00'::time)
UNION ALL
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, (CURRENT_DATE + 5), '14:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a1111111-1111-1111-1111-111111111111'::uuid AND slot_date = (CURRENT_DATE + 5) AND slot_time = '14:00'::time)
UNION ALL
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, (CURRENT_DATE + 1), '09:30'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a2222222-2222-2222-2222-222222222222'::uuid AND slot_date = (CURRENT_DATE + 1) AND slot_time = '09:30'::time)
UNION ALL
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, (CURRENT_DATE + 1), '10:30'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a2222222-2222-2222-2222-222222222222'::uuid AND slot_date = (CURRENT_DATE + 1) AND slot_time = '10:30'::time)
UNION ALL
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, (CURRENT_DATE + 3), '13:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a2222222-2222-2222-2222-222222222222'::uuid AND slot_date = (CURRENT_DATE + 3) AND slot_time = '13:00'::time)
UNION ALL
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, (CURRENT_DATE + 1), '08:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a3333333-3333-3333-3333-333333333333'::uuid AND slot_date = (CURRENT_DATE + 1) AND slot_time = '08:00'::time)
UNION ALL
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, (CURRENT_DATE + 1), '09:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a3333333-3333-3333-3333-333333333333'::uuid AND slot_date = (CURRENT_DATE + 1) AND slot_time = '09:00'::time)
UNION ALL
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, (CURRENT_DATE + 4), '15:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a3333333-3333-3333-3333-333333333333'::uuid AND slot_date = (CURRENT_DATE + 4) AND slot_time = '15:00'::time)
UNION ALL
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, (CURRENT_DATE + 2), '10:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid AND slot_date = (CURRENT_DATE + 2) AND slot_time = '10:00'::time)
UNION ALL
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, (CURRENT_DATE + 3), '11:00'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid AND slot_date = (CURRENT_DATE + 3) AND slot_time = '11:00'::time)
UNION ALL
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, (CURRENT_DATE + 6), '14:30'::time, false
WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid AND slot_date = (CURRENT_DATE + 6) AND slot_time = '14:30'::time);

-- ============================================================================
-- APPOINTMENTS
-- ============================================================================
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
SELECT 'b1111111-1111-1111-1111-111111111111'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid, (CURRENT_DATE + 3), '09:00'::time, 'confirmed', 'Routine cardiac checkup'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = 'b1111111-1111-1111-1111-111111111111'::uuid AND doctor_id = 'a1111111-1111-1111-1111-111111111111'::uuid AND appointment_date = (CURRENT_DATE + 3) AND appointment_time = '09:00'::time);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
SELECT 'b2222222-2222-2222-2222-222222222222'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, (CURRENT_DATE + 1), '09:30'::time, 'scheduled', 'Frequent headaches and migraines'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = 'b2222222-2222-2222-2222-222222222222'::uuid AND doctor_id = 'a2222222-2222-2222-2222-222222222222'::uuid AND appointment_date = (CURRENT_DATE + 1) AND appointment_time = '09:30'::time);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
SELECT 'b3333333-3333-3333-3333-333333333333'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, (CURRENT_DATE - 5), '08:00'::time, 'completed', 'Child annual checkup'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = 'b3333333-3333-3333-3333-333333333333'::uuid AND doctor_id = 'a3333333-3333-3333-3333-333333333333'::uuid AND appointment_date = (CURRENT_DATE - 5) AND appointment_time = '08:00'::time);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
SELECT 'b1111111-1111-1111-1111-111111111111'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid, (CURRENT_DATE - 10), '10:00'::time, 'completed', 'Knee pain evaluation'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = 'b1111111-1111-1111-1111-111111111111'::uuid AND doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid AND appointment_date = (CURRENT_DATE - 10) AND appointment_time = '10:00'::time);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
SELECT 'b2222222-2222-2222-2222-222222222222'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid, (CURRENT_DATE - 3), '14:00'::time, 'cancelled', 'Chest pain consultation (cancelled by patient)'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = 'b2222222-2222-2222-2222-222222222222'::uuid AND doctor_id = 'a1111111-1111-1111-1111-111111111111'::uuid AND appointment_date = (CURRENT_DATE - 3) AND appointment_time = '14:00'::time);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
SELECT 'b3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid, (CURRENT_DATE + 2), '10:00'::time, 'scheduled', 'Sports injury follow-up'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = 'b3333333-3333-3333-3333-333333333333'::uuid AND doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid AND appointment_date = (CURRENT_DATE + 2) AND appointment_time = '10:00'::time);

-- ============================================================================
-- MEDICAL RECORDS
-- ============================================================================
INSERT INTO medical_records (patient_id, doctor_id, diagnosis, treatment_plan, prescription)
SELECT 'b3333333-3333-3333-3333-333333333333'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'Healthy child — normal development milestones met', 'Continue routine annual checkups. Maintain balanced diet and regular physical activity.', 'Children''s multivitamin daily'
WHERE NOT EXISTS (SELECT 1 FROM medical_records WHERE patient_id = 'b3333333-3333-3333-3333-333333333333'::uuid AND doctor_id = 'a3333333-3333-3333-3333-333333333333'::uuid);

INSERT INTO medical_records (patient_id, doctor_id, diagnosis, treatment_plan, prescription)
SELECT 'b1111111-1111-1111-1111-111111111111'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid, 'Mild patellar tendinitis (jumper''s knee)', 'Physical therapy 2x/week for 6 weeks. Avoid high-impact activities. Ice after exercise.', 'Ibuprofen 400mg as needed for pain. Naproxen 500mg twice daily with food.'
WHERE NOT EXISTS (SELECT 1 FROM medical_records WHERE patient_id = 'b1111111-1111-1111-1111-111111111111'::uuid AND doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid);

INSERT INTO medical_records (patient_id, doctor_id, diagnosis, treatment_plan, prescription)
SELECT 'b1111111-1111-1111-1111-111111111111'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid, 'Stage 1 hypertension — well controlled', 'Continue current medication. Monitor blood pressure daily. Follow up in 3 months. Reduce sodium intake.', 'Lisinopril 10mg once daily. Hydrochlorothiazide 12.5mg once daily.'
WHERE NOT EXISTS (SELECT 1 FROM medical_records WHERE patient_id = 'b1111111-1111-1111-1111-111111111111'::uuid AND doctor_id = 'a1111111-1111-1111-1111-111111111111'::uuid AND diagnosis = 'Stage 1 hypertension — well controlled');

-- ============================================================================
-- FEEDBACK
-- ============================================================================
INSERT INTO feedback (patient_id, doctor_id, rating, comment)
SELECT 'b3333333-3333-3333-3333-333333333333'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 5, 'Dr. Rodriguez was amazing with my son! Very patient and kind. The office was clean and wait time was minimal.'
WHERE NOT EXISTS (SELECT 1 FROM feedback WHERE patient_id = 'b3333333-3333-3333-3333-333333333333'::uuid AND doctor_id = 'a3333333-3333-3333-3333-333333333333'::uuid);

INSERT INTO feedback (patient_id, doctor_id, rating, comment)
SELECT 'b1111111-1111-1111-1111-111111111111'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid, 4, 'Dr. Wilson was thorough and explained everything clearly. The treatment plan is working well. Would recommend!'
WHERE NOT EXISTS (SELECT 1 FROM feedback WHERE patient_id = 'b1111111-1111-1111-1111-111111111111'::uuid AND doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid);

-- ============================================================================
-- MARK BOOKED SLOTS
-- ============================================================================
UPDATE availability_slots
SET is_booked = true
WHERE doctor_id = 'a3333333-3333-3333-3333-333333333333'::uuid AND slot_date = (CURRENT_DATE + 1) AND slot_time = '08:00'::time;

UPDATE availability_slots
SET is_booked = true
WHERE doctor_id = 'a2222222-2222-2222-2222-222222222222'::uuid AND slot_date = (CURRENT_DATE + 1) AND slot_time = '09:30'::time;

UPDATE availability_slots
SET is_booked = true
WHERE doctor_id = 'a4444444-4444-4444-4444-444444444444'::uuid AND slot_date = (CURRENT_DATE + 2) AND slot_time = '10:00'::time;