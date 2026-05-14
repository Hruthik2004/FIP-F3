import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Activity, Mail, Lock, ArrowRight, Eye, EyeOff, User, Building } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (mode === 'register' && !name) { setError('Full name is required'); return; }
    setLoading(true);
    try {
      let result;
      if (mode === 'register') {
        result = await register({ email, password, name, organization: org });
      } else {
        result = await login(email, password);
      }
      if (result.success) navigate('/app/dashboard');
      else setError(result.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await loginWithGoogle();
      if (result.success) navigate('/app/dashboard');
      else setError(result.error || 'Google sign-in failed');
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* Left panel */}
        <div className="hidden md:flex flex-col w-80 flex-shrink-0 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] p-8 text-white">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Activity size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base">Funeral Intel</span>
          </div>

          <h2 className="text-2xl font-bold mb-2 leading-tight">Market Intelligence</h2>
          <h3 className="text-lg font-medium text-blue-200 mb-8">for Funeral Professionals</h3>

          <div className="space-y-5 flex-1">
            {[
              { icon: '🔍', text: 'AI-powered web scraping for funeral home data' },
              { icon: '📊', text: 'Real-time analytics and market insights' },
              { icon: '🤖', text: 'Intelligent enrichment pipeline' },
              { icon: '🔒', text: 'Enterprise-grade security & compliance' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg">{item.icon}</span>
                <p className="text-sm text-blue-100 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-white/10 rounded-xl border border-white/20">
            <p className="text-sm text-blue-100 italic leading-relaxed">
              "Transformed how we analyze the funeral market — saves hours every week."
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">M</div>
              <div>
                <div className="text-xs font-semibold">Mark Robertson</div>
                <div className="text-[10px] text-blue-300">Senior Analyst</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 p-8 flex flex-col justify-center">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-[#1e40af] flex items-center justify-center">
              <Activity size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-slate-900">Funeral Intelligence Platform</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mb-7">
            {mode === 'login' ? 'Sign in to access your dashboard.' : 'Start your free trial today.'}
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all mb-5 disabled:opacity-60"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-slate-200" /></div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">or continue with email</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Organization</label>
                  <div className="relative">
                    <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Company"
                      value={org}
                      onChange={e => setOrg(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">Password *</label>
                {mode === 'login' && (
                  <button type="button" className="text-xs text-blue-600 hover:underline">Forgot password?</button>
                )}
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-sm font-medium rounded-xl transition-all disabled:opacity-60 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-blue-600 font-medium hover:underline"
            >
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </p>

          <div className="flex justify-center gap-5 mt-6 text-xs text-slate-400">
            <a href="https://docs.funeralintel.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Documentation</a>
            <a href="https://status.funeralintel.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">System Status</a>
            <a href="mailto:support@funeralintel.com" className="hover:text-slate-600 transition-colors">Support</a>
          </div>
        </div>
      </div>
      {/* Hidden div for Google button fallback */}
      <div id="google-btn-hidden" style={{ display: 'none' }} />
    </div>
  );
}
