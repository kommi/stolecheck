import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '', password: '', name: '',
    role: searchParams.get('role') || 'victim',
  });

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await authAPI.login({ email: form.email, password: form.password });
        login(res.data.user, res.data.token);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        const res = await authAPI.register({
          email: form.email, password: form.password,
          name: form.name, role: form.role,
        });
        login(res.data.user, res.data.token);
        toast.success('Account created!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-background grid-lines flex items-center justify-center p-6" data-testid="auth-page">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <span className="text-xl font-black tracking-tight">StoleCheck</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {tab === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-lg p-8" data-testid="auth-card">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-white/10">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${tab === 'login' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              data-testid="login-tab"
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${tab === 'register' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              data-testid="register-tab"
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                    className="bg-background border-input focus:border-primary"
                    data-testid="name-input"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">I am a</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'victim', label: 'Theft Victim' },
                      { value: 'buyer', label: 'Buyer / Dealer' },
                      { value: 'law_enforcement', label: 'Law Enforcement' },
                      { value: 'admin', label: 'Admin' },
                    ].map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm({ ...form, role: r.value })}
                        className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors ${
                          form.role === r.value
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-background border-white/10 text-muted-foreground hover:border-white/20'
                        }`}
                        data-testid={`role-${r.value}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
                className="bg-background border-input focus:border-primary"
                data-testid="email-input"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter password"
                  required
                  className="bg-background border-input focus:border-primary pr-10"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-sm font-bold uppercase tracking-wide h-11"
              data-testid="auth-submit-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full rounded-sm border-white/10 hover:bg-white/5 h-11"
            data-testid="google-login-btn"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          {tab === 'login' && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Demo: <span className="font-mono text-foreground/60">admin@stolecheck.in / admin123</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
