import { useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthPage } from '@/pages/AuthPage';
import { AppShell } from '@/components/AppShell';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { DoctorDashboard } from '@/pages/DoctorDashboard';
import { PatientDashboard } from '@/pages/PatientDashboard';
import {
  Activity, CalendarDays, Users, Settings, Clock,
  FileText, Star, CalendarPlus, User as UserIcon,
} from 'lucide-react';

const adminNav = [
  { id: 'analytics', label: 'Analytics', icon: <Activity className="w-5 h-5" /> },
  { id: 'users', label: 'User Management', icon: <Users className="w-5 h-5" /> },
  { id: 'appointments', label: 'Appointments', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

const doctorNav = [
  { id: 'overview', label: 'Appointments', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'schedule', label: 'Schedule', icon: <Clock className="w-5 h-5" /> },
  { id: 'records', label: 'Medical Records', icon: <FileText className="w-5 h-5" /> },
  { id: 'feedback', label: 'Feedback', icon: <Star className="w-5 h-5" /> },
];

const patientNav = [
  { id: 'book', label: 'Book Appointment', icon: <CalendarPlus className="w-5 h-5" /> },
  { id: 'history', label: 'My Appointments', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'medical', label: 'Medical History', icon: <FileText className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserIcon className="w-5 h-5" /> },
];

function RoleWrapper({ role }: { role: 'admin' | 'doctor' | 'patient' }) {
  const [activeTab, setActiveTab] = useState('');

  let navItems: { id: string; label: string; icon: ReactNode }[];
  let dashboard: ReactNode;

  if (role === 'admin') {
    navItems = adminNav;
    dashboard = <AdminDashboard tab={activeTab || 'analytics'} onTabChange={setActiveTab} />;
  } else if (role === 'doctor') {
    navItems = doctorNav;
    dashboard = <DoctorDashboard tab={activeTab || 'overview'} onTabChange={setActiveTab} />;
  } else {
    navItems = patientNav;
    dashboard = <PatientDashboard tab={activeTab || 'book'} onTabChange={setActiveTab} />;
  }

  return (
    <AppShell navItems={navItems} activeTab={activeTab || navItems[0].id} onTabChange={setActiveTab}>
      {dashboard}
    </AppShell>
  );
}

function DashboardRouter() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Activity className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!profile) {
    return <AuthPage />;
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Inactive</h2>
          <p className="text-slate-500">Your account has been deactivated. Please contact the administrator to reactivate your account.</p>
        </div>
      </div>
    );
  }

  return <RoleWrapper role={profile.role} />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DashboardRouter />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
