import { useState, useEffect, useCallback } from 'react';
import { supabase, type Profile, type Appointment, type MedicalRecord, type Feedback, type AvailabilitySlot } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StarRating } from '@/components/ui/StarRating';
import {
  CalendarDays, Users, Clock, Star, Activity, Search,
  Stethoscope, CheckCircle2, CalendarPlus, FileText, Save, Plus,
} from 'lucide-react';

type Tab = 'overview' | 'schedule' | 'records' | 'feedback';

export function DoctorDashboard({ tab, onTabChange }: { tab: string; onTabChange: (t: string) => void }) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [recordForm, setRecordForm] = useState({ diagnosis: '', treatment_plan: '', prescription: '' });
  const [apptFilter, setApptFilter] = useState<'upcoming' | 'past'>('upcoming');

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [
      { data: a },
      { data: s },
      { data: r },
      { data: f },
    ] = await Promise.all([
      supabase.from('appointments').select('*, patient:profiles!patient_id(*), doctor:profiles!doctor_id(*)').eq('doctor_id', profile.id).order('appointment_date', { ascending: true }),
      supabase.from('availability_slots').select('*').eq('doctor_id', profile.id).order('slot_date', { ascending: true }),
      supabase.from('medical_records').select('*, patient:profiles!patient_id(*), doctor:profiles!doctor_id(*)').eq('doctor_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('feedback').select('*, patient:profiles!patient_id(*)').eq('doctor_id', profile.id).order('created_at', { ascending: false }),
    ]);
    setAppointments(a as Appointment[] ?? []);
    setSlots(s as AvailabilitySlot[] ?? []);
    setRecords(r as MedicalRecord[] ?? []);
    setFeedback(f as Feedback[] ?? []);

    const patientIds = [...new Set((a as Appointment[] ?? []).map(appt => appt.patient_id))];
    if (patientIds.length) {
      const { data: p } = await supabase.from('profiles').select('*').in('id', patientIds);
      setPatients(p as Profile[] ?? []);
    } else {
      setPatients([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = appointments.filter((a) => a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'completed');
  const past = appointments.filter((a) => a.appointment_date < today || a.status === 'completed' || a.status === 'cancelled');
  const displayAppts = apptFilter === 'upcoming' ? upcoming : past;

  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : 'N/A';

  const handleAddSlot = async () => {
    if (!profile || !slotDate || !slotTime) { showToast('Please select date and time', 'error'); return; }
    const { error } = await supabase.from('availability_slots').insert({
      doctor_id: profile.id,
      slot_date: slotDate,
      slot_time: slotTime,
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Time slot added successfully');
    setSlotDate('');
    setSlotTime('');
    loadData();
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase.from('availability_slots').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Time slot removed');
    loadData();
  };

  const handleApptStatus = async (appt: Appointment, status: Appointment['status']) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', appt.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`Appointment ${status}`);
    loadData();
  };

  const openPatientRecords = async (patient: Profile) => {
    setSelectedPatient(patient);
    const { data } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('doctor_id', profile?.id)
      .order('created_at', { ascending: false });
    setPatientRecords(data as MedicalRecord[] ?? []);
    setRecordForm({ diagnosis: '', treatment_plan: '', prescription: '' });
  };

  const handleSaveRecord = async () => {
    if (!profile || !selectedPatient || !recordForm.diagnosis) { showToast('Diagnosis is required', 'error'); return; }
    const { error } = await supabase.from('medical_records').insert({
      patient_id: selectedPatient.id,
      doctor_id: profile.id,
      diagnosis: recordForm.diagnosis,
      treatment_plan: recordForm.treatment_plan || null,
      prescription: recordForm.prescription || null,
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Medical record added');
    setRecordForm({ diagnosis: '', treatment_plan: '', prescription: '' });
    openPatientRecords(selectedPatient);
    loadData();
  };

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  const navItems = [
    { id: 'overview', label: 'Appointments', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'schedule', label: 'Schedule', icon: <Clock className="w-5 h-5" /> },
    { id: 'records', label: 'Medical Records', icon: <FileText className="w-5 h-5" /> },
    { id: 'feedback', label: 'Feedback', icon: <Star className="w-5 h-5" /> },
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
              tab === item.id ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Upcoming" value={upcoming.length} icon={<CalendarDays className="w-6 h-6" />} color="blue" />
            <StatCard label="Completed" value={past.filter(a => a.status === 'completed').length} icon={<CheckCircle2 className="w-6 h-6" />} color="emerald" />
            <StatCard label="My Patients" value={patients.length} icon={<Users className="w-6 h-6" />} color="sky" />
            <StatCard label="Avg Rating" value={avgRating} icon={<Star className="w-6 h-6" />} color="amber" />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setApptFilter('upcoming')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${apptFilter === 'upcoming' ? 'bg-sky-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              onClick={() => setApptFilter('past')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${apptFilter === 'past' ? 'bg-sky-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              Past ({past.length})
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Patient</th>
                    <th className="text-left px-6 py-3 font-semibold">Date</th>
                    <th className="text-left px-6 py-3 font-semibold">Time</th>
                    <th className="text-left px-6 py-3 font-semibold">Reason</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-right px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayAppts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{a.patient?.full_name ?? 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-500">{a.appointment_date}</td>
                      <td className="px-6 py-4 text-slate-500">{a.appointment_time.slice(0, 5)}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{a.reason || '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {a.status === 'scheduled' && (
                            <button onClick={() => handleApptStatus(a, 'confirmed')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors">
                              Confirm
                            </button>
                          )}
                          {a.status === 'confirmed' && (
                            <button onClick={() => handleApptStatus(a, 'completed')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                              Complete
                            </button>
                          )}
                          {a.status !== 'cancelled' && a.status !== 'completed' && (
                            <button onClick={() => handleApptStatus(a, 'cancelled')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayAppts.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">No {apptFilter} appointments</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {tab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-sky-600" />
              Add Available Time Slot
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={slotDate}
                  min={today}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Time</label>
                <input
                  type="time"
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
                />
              </div>
              <button
                onClick={handleAddSlot}
                className="px-5 py-3 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Slot
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">My Available Slots</h3>
            {slots.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No time slots added yet. Add slots for patients to book.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {slots.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                      s.is_booked ? 'bg-slate-50 border-slate-200' : 'bg-sky-50 border-sky-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{s.slot_date}</p>
                      <p className="text-xs text-slate-500">{s.slot_time.slice(0, 5)} {s.is_booked && '· Booked'}</p>
                    </div>
                    {!s.is_booked && (
                      <button
                        onClick={() => handleDeleteSlot(s.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Stethoscope className="w-4 h-4 hidden" />
                        <span className="text-xs">Remove</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECORDS TAB */}
      {tab === 'records' && (
        <div>
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none text-sm"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Patient</th>
                    <th className="text-left px-6 py-3 font-semibold">Email</th>
                    <th className="text-left px-6 py-3 font-semibold">Phone</th>
                    <th className="text-right px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{p.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{p.email}</td>
                      <td className="px-6 py-4 text-slate-500">{p.phone || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openPatientRecords(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                        >
                          View Records
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-400">No patients found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK TAB */}
      {tab === 'feedback' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Star className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800">{avgRating}</p>
              <p className="text-sm text-slate-500">{feedback.length} review{feedback.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="space-y-3">
            {feedback.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-semibold">
                      {f.patient?.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">{f.patient?.full_name ?? 'Anonymous'}</p>
                      <p className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <StarRating value={f.rating} />
                </div>
                {f.comment && <p className="text-sm text-slate-600 leading-relaxed">{f.comment}</p>}
              </div>
            ))}
            {feedback.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <Star className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">No feedback received yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patient Records Modal */}
      <Modal
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title={`Medical Records — ${selectedPatient?.full_name}`}
        size="lg"
      >
        {selectedPatient && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">Email:</span> <span className="font-medium text-slate-700">{selectedPatient.email}</span></div>
              <div><span className="text-slate-400">Phone:</span> <span className="font-medium text-slate-700">{selectedPatient.phone || '—'}</span></div>
            </div>

            {/* Existing records */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {patientRecords.map((r) => (
                <div key={r.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Diagnosis: {r.diagnosis}</p>
                  {r.treatment_plan && <p className="text-sm text-slate-500">Treatment: {r.treatment_plan}</p>}
                  {r.prescription && <p className="text-sm text-slate-500">Prescription: {r.prescription}</p>}
                </div>
              ))}
              {patientRecords.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No records yet</p>}
            </div>

            {/* Add new record */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="font-semibold text-slate-700 text-sm">Add New Record</h4>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Diagnosis *</label>
                <textarea
                  value={recordForm.diagnosis}
                  onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Treatment Plan</label>
                <textarea
                  value={recordForm.treatment_plan}
                  onChange={(e) => setRecordForm({ ...recordForm, treatment_plan: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Prescription</label>
                <textarea
                  value={recordForm.prescription}
                  onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none text-sm resize-none"
                />
              </div>
              <button
                onClick={handleSaveRecord}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Record
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
