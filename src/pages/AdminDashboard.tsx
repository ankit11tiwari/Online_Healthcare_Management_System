import { useState, useEffect, useCallback } from 'react';
import { supabase, type Profile, type Appointment, type SystemSettings } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Users, CalendarDays, Stethoscope, Activity, Settings, Search,
  UserPlus, Pencil, Trash2, Calendar, Save, Ban, CheckCircle2, Phone, Clock,
} from 'lucide-react';

type Tab = 'analytics' | 'users' | 'appointments' | 'settings';

export function AdminDashboard({ tab, onTabChange }: { tab: string; onTabChange: (t: string) => void }) {
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);

  // Form state for create/edit user
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'patient' as Profile['role'],
    specialization: '',
    is_active: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: a }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*, patient:profiles!patient_id(*), doctor:profiles!doctor_id(*)').order('appointment_date', { ascending: false }),
      supabase.from('system_settings').select('*').maybeSingle(),
    ]);
    setProfiles(p as Profile[] ?? []);
    setAppointments(a as Appointment[] ?? []);
    setSettings(s as SystemSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProfiles = profiles.filter((p) => {
    const matchSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  const filteredAppointments = appointments.filter((a) => {
    return statusFilter === 'all' || a.status === statusFilter;
  });

  const openCreate = () => {
    setFormData({ full_name: '', email: '', phone: '', role: 'patient', specialization: '', is_active: true });
    setEditUser(null);
    setCreateOpen(true);
  };

  const openEdit = (user: Profile) => {
    setFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      specialization: user.specialization ?? '',
      is_active: user.is_active,
    });
    setEditUser(user);
    setCreateOpen(true);
  };

  const handleSaveUser = async () => {
    if (editUser) {
      const updates: Partial<Profile> = {
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
        specialization: formData.role === 'doctor' ? formData.specialization : null,
        is_active: formData.is_active,
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', editUser.id);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('User updated successfully');
      setCreateOpen(false);
      loadData();
    } else {
      if (!formData.email || !formData.full_name) {
        showToast('Name and email are required', 'error');
        return;
      }
      const tempPassword = `Health${Date.now().toString().slice(-6)}!`;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: tempPassword,
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone,
          specialization: formData.specialization || null,
        }),
      });
      if (!response.ok) {
        const errBody = await response.json();
        showToast(errBody.error || 'Failed to create user', 'error');
        return;
      }
      showToast(`User created. Temporary password: ${tempPassword}`);
      setCreateOpen(false);
      loadData();
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('User deleted successfully');
    loadData();
  };

  const handleToggleActive = async (user: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`User ${!user.is_active ? 'activated' : 'deactivated'}`);
    loadData();
  };

  const handleApptAction = async (appt: Appointment, action: 'confirmed' | 'cancelled' | 'completed') => {
    const { error } = await supabase.from('appointments').update({ status: action }).eq('id', appt.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`Appointment marked as ${action}`);
    setEditAppt(null);
    loadData();
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase.from('system_settings').update({
      clinic_name: settings.clinic_name,
      clinic_open_time: settings.clinic_open_time,
      clinic_close_time: settings.clinic_close_time,
      max_daily_bookings: settings.max_daily_bookings,
      emergency_contact: settings.emergency_contact,
      updated_at: new Date().toISOString(),
    }).eq('id', settings.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Settings saved successfully');
    loadData();
  };

  const today = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter((a) => a.appointment_date === today);
  const activeDoctors = profiles.filter((p) => p.role === 'doctor' && p.is_active);
  const activePatients = profiles.filter((p) => p.role === 'patient' && p.is_active);

  const navItems = [
    { id: 'analytics', label: 'Analytics', icon: <Activity className="w-5 h-5" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-5 h-5" /> },
    { id: 'appointments', label: 'Appointments', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
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
      {/* Tab navigation */}
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

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Total Users" value={profiles.length} icon={<Users className="w-6 h-6" />} color="blue" trend={`${activePatients.length} active patients`} />
            <StatCard label="Today's Appointments" value={todaysAppointments.length} icon={<CalendarDays className="w-6 h-6" />} color="emerald" trend={`${appointments.length} total appointments`} />
            <StatCard label="Active Doctors" value={activeDoctors.length} icon={<Stethoscope className="w-6 h-6" />} color="sky" trend={`${activeDoctors.filter(d => d.specialization).length} specializations`} />
            <StatCard label="Completed Visits" value={appointments.filter(a => a.status === 'completed').length} icon={<CheckCircle2 className="w-6 h-6" />} color="amber" trend={`${appointments.filter(a => a.status === 'cancelled').length} cancellations`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appointment status breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-800 mb-5">Appointment Status Breakdown</h3>
              <div className="space-y-4">
                {['scheduled', 'confirmed', 'completed', 'cancelled'].map((status) => {
                  const count = appointments.filter((a) => a.status === status).length;
                  const pct = appointments.length ? (count / appointments.length) * 100 : 0;
                  const colors: Record<string, string> = {
                    scheduled: 'bg-amber-400',
                    confirmed: 'bg-sky-400',
                    completed: 'bg-emerald-400',
                    cancelled: 'bg-rose-400',
                  };
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-slate-600 capitalize">{status}</span>
                        <span className="text-slate-400">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[status]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent appointments */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-800 mb-5">Recent Appointments</h3>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {appointments.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{a.patient?.full_name} → {a.doctor?.full_name}</p>
                      <p className="text-xs text-slate-400">{a.appointment_date} at {a.appointment_time.slice(0, 5)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
                {appointments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No appointments yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-sm bg-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Name</th>
                    <th className="text-left px-6 py-3 font-semibold">Email</th>
                    <th className="text-left px-6 py-3 font-semibold">Role</th>
                    <th className="text-left px-6 py-3 font-semibold">Phone</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-right px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs">
                            {p.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-700">{p.full_name}</p>
                            {p.specialization && <p className="text-xs text-slate-400">{p.specialization}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{p.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                          p.role === 'admin' ? 'bg-rose-100 text-rose-600' :
                          p.role === 'doctor' ? 'bg-sky-100 text-sky-600' :
                          'bg-teal-100 text-teal-600'
                        }`}>{p.role}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{p.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleActive(p)} className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title={p.is_active ? 'Deactivate' : 'Activate'}>
                            <Ban className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteUser(p.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENTS TAB */}
      {tab === 'appointments' && (
        <div>
          <div className="flex gap-3 mb-5 overflow-x-auto">
            {['all', 'scheduled', 'confirmed', 'completed', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                  statusFilter === s ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Patient</th>
                    <th className="text-left px-6 py-3 font-semibold">Doctor</th>
                    <th className="text-left px-6 py-3 font-semibold">Date</th>
                    <th className="text-left px-6 py-3 font-semibold">Time</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-right px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAppointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{a.patient?.full_name ?? 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-500">{a.doctor?.full_name ?? 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-500">{a.appointment_date}</td>
                      <td className="px-6 py-4 text-slate-500">{a.appointment_time.slice(0, 5)}</td>
                      <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setEditAppt(a)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-teal-600 hover:bg-teal-50 transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAppointments.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">No appointments found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === 'settings' && settings && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Clinic Name</label>
              <input
                type="text"
                value={settings.clinic_name}
                onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Opening Time
                </label>
                <input
                  type="time"
                  value={settings.clinic_open_time}
                  onChange={(e) => setSettings({ ...settings, clinic_open_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Closing Time
                </label>
                <input
                  type="time"
                  value={settings.clinic_close_time}
                  onChange={(e) => setSettings({ ...settings, clinic_close_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Max Daily Bookings per Doctor</label>
              <input
                type="number"
                value={settings.max_daily_bookings}
                onChange={(e) => setSettings({ ...settings, max_daily_bookings: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Emergency Contact
              </label>
              <input
                type="text"
                value={settings.emergency_contact}
                onChange={(e) => setSettings({ ...settings, emergency_contact: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editUser ? 'Edit User' : 'Add New User'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              disabled={!!editUser}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Profile['role'] })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {formData.role === 'doctor' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Specialization</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
          )}
          {editUser && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded accent-teal-600"
              />
              Active Account
            </label>
          )}
          <button
            onClick={handleSaveUser}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
          >
            {editUser ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </Modal>

      {/* Manage Appointment Modal */}
      <Modal
        open={!!editAppt}
        onClose={() => setEditAppt(null)}
        title="Manage Appointment"
        size="sm"
      >
        {editAppt && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Patient:</span>
                <span className="text-sm font-medium text-slate-700">{editAppt.patient?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Doctor:</span>
                <span className="text-sm font-medium text-slate-700">{editAppt.doctor?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Date:</span>
                <span className="text-sm font-medium text-slate-700">{editAppt.appointment_date} at {editAppt.appointment_time.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status:</span>
                <StatusBadge status={editAppt.status} />
              </div>
              {editAppt.reason && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Reason:</span>
                  <span className="text-sm font-medium text-slate-700">{editAppt.reason}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleApptAction(editAppt, 'confirmed')}
                disabled={editAppt.status === 'confirmed' || editAppt.status === 'completed' || editAppt.status === 'cancelled'}
                className="py-2.5 rounded-xl bg-sky-50 text-sky-600 font-medium text-sm hover:bg-sky-100 transition-colors disabled:opacity-40"
              >
                Confirm
              </button>
              <button
                onClick={() => handleApptAction(editAppt, 'completed')}
                disabled={editAppt.status === 'completed' || editAppt.status === 'cancelled'}
                className="py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-medium text-sm hover:bg-emerald-100 transition-colors disabled:opacity-40"
              >
                Complete
              </button>
              <button
                onClick={() => handleApptAction(editAppt, 'cancelled')}
                disabled={editAppt.status === 'cancelled' || editAppt.status === 'completed'}
                className="py-2.5 rounded-xl bg-rose-50 text-rose-600 font-medium text-sm hover:bg-rose-100 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
