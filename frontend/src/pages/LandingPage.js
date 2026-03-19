import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { publicAPI } from '@/lib/api';
import { Shield, ScanSearch, ShieldAlert, Users, ArrowRight, Check, Eye, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ total_items_registered: 0, items_recovered: 0, total_verifications: 0, registered_users: 0 });

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }
    publicAPI.stats().then(r => setStats(r.data)).catch(() => {});
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass-panel" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-primary" strokeWidth={1.5} />
            <span className="text-lg font-black tracking-tight">StoleCheck</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="text-sm text-muted-foreground hover:text-foreground" data-testid="login-btn">
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth?tab=register')} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-sm text-sm font-bold uppercase tracking-wide" data-testid="get-started-btn">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 grid-lines opacity-50" />
        <div className="absolute inset-0 hero-glow" />
        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-primary/10 border border-primary/20 animate-fade-in-up">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary tracking-wide">AI-POWERED STOLEN GOODS DETECTION</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Protecting Buyers.<br />
              <span className="text-primary">Catching Thieves.</span><br />
              Restoring Justice.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              India's first AI-powered platform connecting theft victims, buyers, and law enforcement through a centralized stolen goods database with real-time verification.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Button onClick={() => navigate('/auth?tab=register')} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.5)] rounded-sm font-bold uppercase tracking-wide h-12 px-8" data-testid="hero-cta-btn">
                Report Stolen Item <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => navigate('/auth?tab=register&role=buyer')} size="lg" variant="outline" className="rounded-sm border-white/10 hover:bg-white/5 font-bold uppercase tracking-wide h-12 px-8" data-testid="hero-verify-btn">
                <ScanSearch className="w-4 h-4 mr-2" /> Verify Before You Buy
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-t border-white/5" data-testid="stats-section">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: stats.total_items_registered, label: 'Items Registered', icon: PackageIcon },
            { value: stats.items_recovered, label: 'Items Recovered', icon: Check },
            { value: stats.total_verifications, label: 'Verifications Done', icon: ScanSearch },
            { value: stats.registered_users, label: 'Registered Users', icon: Users },
          ].map((s, i) => (
            <div key={i} className="text-center animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-3">
                <s.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-3xl md:text-4xl font-mono font-bold text-foreground" data-testid={`stat-${i}`}>{s.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6" data-testid="how-it-works">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-center">How StoleCheck Works</h2>
          <p className="text-center text-muted-foreground text-lg mb-16 max-w-2xl mx-auto">Three-sided platform connecting victims, buyers, and law enforcement</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldAlert,
                title: 'Victims Report',
                desc: 'Register stolen items with photos, descriptions, and unique identifiers. Get a StoleCheck ID (SCID) for tracking.',
                color: 'text-red-400',
                bg: 'bg-red-500/10',
              },
              {
                icon: ScanSearch,
                title: 'Buyers Verify',
                desc: 'Scan or photograph items before purchase. Get instant Theft Probability Score (TPS) with AI-powered matching.',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: Zap,
                title: 'Police Act',
                desc: 'Real-time alerts when stolen items are detected. Case management and evidence tracking for swift action.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
            ].map((item, i) => (
              <div key={i} className="glass-panel rounded-lg p-8 hover:border-primary/30 transition-colors duration-300 group" data-testid={`feature-card-${i}`}>
                <div className={`w-12 h-12 rounded-lg ${item.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-6 border-t border-white/5" data-testid="categories-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16 text-center">What We Protect</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Gold & Jewellery', emoji: null, color: 'from-amber-500/20 to-amber-600/5', icon: '💎' },
              { label: 'Vehicles', emoji: null, color: 'from-blue-500/20 to-blue-600/5', icon: '🚗' },
              { label: 'Electronics', emoji: null, color: 'from-violet-500/20 to-violet-600/5', icon: '📱' },
              { label: 'Luxury Items', emoji: null, color: 'from-emerald-500/20 to-emerald-600/5', icon: '⌚' },
            ].map((cat, i) => (
              <div key={i} className={`rounded-lg bg-gradient-to-b ${cat.color} border border-white/5 p-6 text-center hover:border-white/10 transition-colors duration-300`}>
                <div className="text-4xl mb-3">{cat.icon}</div>
                <p className="font-semibold">{cat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="py-20 px-6" data-testid="trust-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Built for Trust & Security</h2>
              <div className="space-y-5">
                {[
                  { icon: Lock, title: 'AES-256 Encryption', desc: 'Data encrypted at rest and in transit with TLS 1.3' },
                  { icon: Eye, title: 'Privacy First', desc: 'Victim identity masked from public — only SCID visible' },
                  { icon: ShieldAlert, title: 'DPDPA Compliant', desc: 'Full compliance with India\'s Digital Personal Data Protection Act' },
                ].map((f, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">{f.title}</h4>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-lg overflow-hidden border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1662638600476-d563fffbb072?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                  alt="Security Operations"
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5" data-testid="cta-section">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Join the Fight Against Theft</h2>
          <p className="text-lg text-muted-foreground mb-10">Whether you're a victim, buyer, dealer, or law enforcement — StoleCheck empowers you to act.</p>
          <Button onClick={() => navigate('/auth?tab=register')} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_25px_rgba(59,130,246,0.5)] rounded-sm font-bold uppercase tracking-wide h-14 px-10 text-lg" data-testid="cta-btn">
            Create Free Account <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6" data-testid="footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <span className="font-bold">StoleCheck</span>
            <span className="text-sm text-muted-foreground ml-2">v1.0</span>
          </div>
          <p className="text-sm text-muted-foreground">Protecting Buyers. Catching Thieves. Restoring Justice.</p>
        </div>
      </footer>
    </div>
  );
}

function PackageIcon(props) {
  return <ScanSearch {...props} />;
}
