import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Activity, Eye, EyeOff, HeartPulse, Shield, Stethoscope, User } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [specialization, setSpecialization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName, role, specialization || undefined);
      if (error) {
        setError(error);
      } else {
        setError('Account created! Please sign in with your credentials.');
        setMode('signin');
      }
    }
    setLoading(false);
  };

  const roleIcons = {
    patient: <User className="w-5 h-5" />,
    doctor: <Stethoscope className="w-5 h-5" />,
    admin: <Shield className="w-5 h-5" />,
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-teal-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-sky-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center shadow-lg">
              <HeartPulse className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold">HealthCare Plus</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Comprehensive Healthcare Management
          </h1>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed">
            A unified platform connecting patients, doctors, and administrators.
            Book appointments, manage medical records, and deliver quality care.
          </p>
          <div className="space-y-4">
            {[
              { icon: <User className="w-5 h-5" />, text: 'Patient booking & medical history' },
              { icon: <Stethoscope className="w-5 h-5" />, text: 'Doctor schedules & patient records' },
              { icon: <Shield className="w-5 h-5" />, text: 'Admin oversight & analytics' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-200">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <span className="text-base">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">HealthCare Plus</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-slate-500 mb-8">
            {mode === 'signin' ? 'Sign in to access your dashboard' : 'Join our healthcare platform'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['patient', 'doctor', 'admin'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                          role === r
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {roleIcons[r]}
                        <span className="text-xs font-medium capitalize">{r}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {role === 'doctor' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Specialization</label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      placeholder="Cardiology"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`text-sm rounded-xl px-4 py-3 ${
                error.includes('Account created')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:from-teal-700 hover:to-teal-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Activity className="w-5 h-5 animate-spin" />
                  Please wait...
                </>
              ) : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 mt-6 text-sm">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-teal-600 font-semibold hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
