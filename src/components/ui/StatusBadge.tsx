type BadgeProps = {
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'active' | 'inactive';
};

export function StatusBadge({ status }: BadgeProps) {
  const styles: Record<string, string> = {
    scheduled: 'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: 'bg-sky-100 text-sky-700 border-sky-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
