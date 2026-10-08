import { useState, useEffect, useCallback } from 'react';
import { supabase, type Profile, type Appointment, type MedicalRecord, type AvailabilitySlot } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  CalendarDays, CalendarPlus, Activity, FileText, User as UserIcon,
  Stethoscope, Check, Clock, Save, X, HeartPulse, Pill, Star,
} from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { type Feedback } from '@/lib/supabase';

type Tab = 'book' | 'history' | 'medical' | 'profile';

export function PatientDashboard({ tab, onTabChange }: { tab: string; onTabChange: (t: string) => void }) {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking flow state
  const [bookSpecialization, setBookSpecialization] = useState('');
  const [bookDoctor, setBookDoctor] = useState<Profile | null>(null);
  const [bookDate, setBookDate] = useState('');
  const [bookSlot, setBookSlot] = useState<AvailabilitySlot | null>(null);
  const [bookReason, setBookReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState<Appointment | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [feedbackAppt, setFeedbackAppt] = useState<Appointment | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState<Set<string>>(new Set());

  // Profile form
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [
      { data: a },
      { data: r },
      { data: d },
    ] = await Promise.all([
      supabase.from('appointments').select('*, patient:profiles!patient_id(*), doctor:profiles!doctor_id(*)').eq('patient_id', profile.id).order('appointment_date', { ascending: true }),
      supabase.from('medical_records').select('*, doctor:profiles!doctor_id(*)').eq('patient_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'doctor').eq('is_active', true),
    ]);
    setAppointments(a as Appointment[] ?? []);
    setRecords(r as MedicalRecord[] ?? []);
    setDoctors(d as Profile[] ?? []);
    setProfileForm({ full_name: profile.full_name, email: profile.email, phone: profile.phone });

    const apptIds = (a as Appointment[] ?? []).map(ap => ap.id);
    if (apptIds.length) {
      const { data: fb } = await supabase.from('feedback').select('appointment_id').in('appointment_id', apptIds);
      setSubmittedFeedback(new Set((fb ?? []).map((f: { appointment_id: string }) => f.appointment_id)));
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load slots when doctor/date changes
  useEffect(() => {
    if (!bookDoctor || !bookDate) { setSlots([]); return; }
    supabase
      .from('availability_slots')
      .select('*')
      .eq('doctor_id', bookDoctor.id)
      .eq('slot_date', bookDate)
      .eq('is_booked', false)
      .order('slot_time', { ascending: true })
      .then(({ data }) => setSlots(data as AvailabilitySlot[] ?? []));
  }, [bookDoctor, bookDate]);

  const specializations = [...new Set(doctors.map((d) => d.specialization).filter(Boolean))] as string[];
  const filteredDoctors = bookSpecialization
    ? doctors.filter((d) => d.specialization === bookSpecialization)
    : doctors;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = appointments.filter((a) => a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'completed');
  const past = appointments.filter((a) => a.appointment_date < today || a.status === 'completed' || a.status === 'cancelled');
  const displayHistory = historyFilter === 'upcoming' ? upcoming : past;

  const handleConfirmBooking = async () => {
    if (!profile || !bookDoctor || !bookSlot) return;
    const { data, error } = await supabase.from('appointments').insert({
      patient_id: profile.id,
      doctor_id: bookDoctor.id,
      appointment_date: bookSlot.slot_date,
      appointment_time: bookSlot.slot_time,
      reason: bookReason || null,
      status: 'scheduled',
    }).select('*, patient:profiles!patient_id(*), doctor:profiles!doctor_id(*)').single();

    if (error) { showToast(error.message, 'error'); return; }

    await supabase.from('availability_slots').update({ is_booked: true }).eq('id', bookSlot.id);

    showToast('Appointment booked successfully!');
    setConfirmedAppt(data as Appointment);
    setConfirmOpen(true);

    // Reset booking
    setBookSpecialization('');
    setBookDoctor(null);
    setBookDate('');
    setBookSlot(null);
    setBookReason('');
    setSlots([]);

    loadData();
  };

  const handleSubmitFeedback = async () => {
    if (!profile || !feedbackAppt || feedbackRating === 0) { showToast('Please select a rating', 'error'); return; }
    const { error } = await supabase.from('feedback').insert({
      patient_id: profile.id,
      doctor_id: feedbackAppt.doctor_id,
      appointment_id: feedbackAppt.id,
      rating: feedbackRating,
      comment: feedbackComment || null,
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Feedback submitted successfully');
    setSubmittedFeedback((prev) => new Set(prev).add(feedbackAppt.id));
    setFeedbackAppt(null);
    setFeedbackRating(0);
    setFeedbackComment('');
  };

  const handleCancelAppt = async (appt: Appointment) => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Appointment cancelled');
    loadData();
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
    }).eq('id', profile.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Profile updated successfully');
    refreshProfile();
  };

  const handleChangePassword = async () => {
    if (passwordForm.password !== passwordForm.confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (passwordForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Password updated successfully');
    setPasswordForm({ password: '', confirm: '' });
  };

  const navItems = [
    { id: 'book', label: 'Book Appointment', icon: <CalendarPlus className="w-5 h-5" /> },
    { id: 'history', label: 'My Appointments', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'medical', label: 'Medical History', icon: <FileText className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Activity className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-slate-100 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === item.id ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* BOOKING TAB */}
      {tab === 'book' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Book an Appointment</h3>

            {/* Step 1: Specialization */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">1</span>
                  Select Specialization
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {specializations.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setBookSpecialization(s); setBookDoctor(null); setBookDate(''); setBookSlot(null); }}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        bookSpecialization === s ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {specializations.length === 0 && <p className="text-sm text-slate-400 col-span-full">No specializations available yet.</p>}
                </div>
              </div>

              {/* Step 2: Doctor */}
              {bookSpecialization && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">2</span>
                    Select Doctor
                  </label>
                  <div className="space-y-2">
                    {filteredDoctors.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => { setBookDoctor(d); setBookDate(''); setBookSlot(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                          bookDoctor?.id === d.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-200 to-sky-300 flex items-center justify-center text-sky-700 font-semibold">
                          {d.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{d.full_name}</p>
                          <p className="text-xs text-slate-400">{d.specialization}</p>
                        </div>
                        {bookDoctor?.id === d.id && <Check className="w-5 h-5 text-teal-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Date */}
              {bookDoctor && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">3</span>
                    Select Date
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={bookDate}
                    onChange={(e) => { setBookDate(e.target.value); setBookSlot(null); }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
              )}

              {/* Step 4: Time slot */}
              {bookDate && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">4</span>
                    Select Time Slot
                  </label>
                  {slots.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No available slots for this date. Please try another date.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setBookSlot(s)}
                          className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            bookSlot?.id === s.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {s.slot_time.slice(0, 5)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Reason */}
              {bookSlot && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">5</span>
                    Reason for Visit (optional)
                  </label>
                  <textarea
                    value={bookReason}
                    onChange={(e) => setBookReason(e.target.value)}
                    rows={3}
                    placeholder="Describe your symptoms or reason for the appointment..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm resize-none"
                  />
                </div>
              )}

              {/* Booking summary & confirm */}
              {bookSlot && bookDoctor && (
                <div className="bg-teal-50 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-teal-800 text-sm mb-2">Booking Summary</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><span className="text-slate-400">Doctor:</span> {bookDoctor.full_name} ({bookDoctor.specialization})</p>
                    <p><span className="text-slate-400">Date:</span> {bookSlot.slot_date}</p>
                    <p><span className="text-slate-400">Time:</span> {bookSlot.slot_time.slice(0, 5)}</p>
                  </div>
                  <button
                    onClick={handleConfirmBooking}
                    className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors mt-2"
                  >
                    Confirm Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard label="Total Appointments" value={appointments.length} icon={<CalendarDays className="w-6 h-6" />} color="blue" />
            <StatCard label="Upcoming" value={upcoming.length} icon={<Clock className="w-6 h-6" />} color="emerald" />
            <StatCard label="Completed" value={past.filter(a => a.status === 'completed').length} icon={<Check className="w-6 h-6" />} color="amber" />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setHistoryFilter('upcoming')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${historyFilter === 'upcoming' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              onClick={() => setHistoryFilter('past')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${historyFilter === 'past' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              Past ({past.length})
            </button>
          </div>

          <div className="space-y-3">
            {displayHistory.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-200 to-sky-300 flex items-center justify-center text-sky-700">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">{a.doctor?.full_name}</p>
                    <p className="text-sm text-slate-400">{a.doctor?.specialization}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{a.appointment_date} at {a.appointment_time.slice(0, 5)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.status} />
                  {a.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancelAppt(a)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                  {a.status === 'completed' && !submittedFeedback.has(a.id) && (
                    <button
                      onClick={() => { setFeedbackAppt(a); setFeedbackRating(0); setFeedbackComment(''); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Rate Visit
                    </button>
                  )}
                  {a.status === 'completed' && submittedFeedback.has(a.id) && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <Check className="w-3.5 h-3.5" />
                      Rated
                    </span>
                  )}
                </div>
              </div>
            ))}
            {displayHistory.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">No {historyFilter} appointments</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEDICAL HISTORY TAB */}
      {tab === 'medical' && (
        <div>
          <div className="space-y-4">
            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center text-white flex-shrink-0">
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-700">{r.doctor?.full_name}</p>
                      <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Diagnosis</p>
                        <p className="text-sm text-slate-700">{r.diagnosis}</p>
                      </div>
                      {r.treatment_plan && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Treatment Plan</p>
                          <p className="text-sm text-slate-600">{r.treatment_plan}</p>
                        </div>
                      )}
                      {r.prescription && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1">
                            <Pill className="w-3 h-3" /> Prescription
                          </p>
                          <p className="text-sm text-slate-600">{r.prescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">No medical records yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-5">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-5">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                onClick={handleChangePassword}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <Modal
        open={!!feedbackAppt}
        onClose={() => setFeedbackAppt(null)}
        title="Rate Your Visit"
        size="sm"
      >
        {feedbackAppt && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              <p className="text-slate-500">Doctor: <span className="font-medium text-slate-700">{feedbackAppt.doctor?.full_name}</span></p>
              <p className="text-slate-500">Date: <span className="font-medium text-slate-700">{feedbackAppt.appointment_date}</span></p>
            </div>
            <div className="text-center">
              <label className="block text-sm font-medium text-slate-600 mb-3">How would you rate your experience?</label>
              <div className="flex justify-center">
                <StarRating value={feedbackRating} onChange={setFeedbackRating} size="lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Comments (optional)</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder="Share your experience..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm resize-none"
              />
            </div>
            <button
              onClick={handleSubmitFeedback}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              Submit Feedback
            </button>
          </div>
        )}
      </Modal>

      {/* Booking Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Booking Confirmed!"
        size="sm"
      >
        {confirmedAppt && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-slate-800">Your appointment is booked!</p>
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Doctor:</span><span className="font-medium text-slate-700">{confirmedAppt.doctor?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Specialization:</span><span className="font-medium text-slate-700">{confirmedAppt.doctor?.specialization}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Date:</span><span className="font-medium text-slate-700">{confirmedAppt.appointment_date}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Time:</span><span className="font-medium text-slate-700">{confirmedAppt.appointment_time.slice(0, 5)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400">Status:</span><StatusBadge status={confirmedAppt.status} /></div>
            </div>
            <button
              onClick={() => setConfirmOpen(false)}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
