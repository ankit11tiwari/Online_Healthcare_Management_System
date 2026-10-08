import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { HeartPulse, LogOut, Menu, X, Stethoscope, Shield, User } from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

type AppShellProps = {
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
};

export function AppShell({ navItems, activeTab, onTabChange, children }: AppShellProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleIcons = {
    admin: <Shield className="w-4 h-4" />,
    doctor: <Stethoscope className="w-4 h-4" />,
    patient: <User className="w-4 h-4" />,
  };

  const roleColors = {
    admin: 'bg-rose-100 text-rose-600',
    doctor: 'bg-sky-100 text-sky-600',
    patient: 'bg-teal-100 text-teal-600',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-md">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-800 block leading-tight">HealthCare+</span>
            <span className="text-xs text-slate-400">Management System</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-teal-50 text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-semibold text-sm">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{profile?.full_name}</p>
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[profile?.role ?? 'patient']}`}
              >
                {roleIcons[profile?.role ?? 'patient']}
                {profile?.role}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-800 capitalize">
            {navItems.find((n) => n.id === activeTab)?.label ?? 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2">
            {sidebarOpen && (
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
