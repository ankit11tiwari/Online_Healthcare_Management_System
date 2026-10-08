import { type ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'sky';
};

export function StatCard({ label, value, icon, trend, color }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    sky: 'from-sky-500 to-sky-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
          {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
