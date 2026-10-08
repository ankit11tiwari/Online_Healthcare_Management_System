import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'doctor' | 'patient';
  specialization: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
};

export type Appointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  reason: string | null;
  created_at: string;
  patient?: Profile;
  doctor?: Profile;
};

export type AvailabilitySlot = {
  id: string;
  doctor_id: string;
  slot_date: string;
  slot_time: string;
  is_booked: boolean;
  created_at: string;
};

export type MedicalRecord = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  diagnosis: string;
  treatment_plan: string | null;
  prescription: string | null;
  created_at: string;
  patient?: Profile;
  doctor?: Profile;
};

export type Feedback = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  patient?: Profile;
};

export type SystemSettings = {
  id: string;
  clinic_name: string;
  clinic_open_time: string;
  clinic_close_time: string;
  max_daily_bookings: number;
  emergency_contact: string;
  updated_at: string;
};
