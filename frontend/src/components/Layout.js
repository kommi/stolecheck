import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, ScanSearch, ShieldAlert, UserCircle2, Settings,
  PackageSearch, Siren, Activity, LogOut, Menu, X, Shield
} from 'lucide-react';
import { useState } from 'react';

const navItems = {
  victim: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Items' },
    { to: '/verify', icon: ScanSearch, label: 'Verify Item' },
  ],
  buyer: [
    { to: '/verify', icon: ScanSearch, label: 'Verify Item' },
    { to: '/dashboard', icon: PackageSearch, label: 'Scan History' },
  ],
  law_enforcement: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { to: '/law/alerts', icon: Siren, label: 'Alerts' },
    { to: '/law/cases', icon: ShieldAlert, label: 'Cases' },
    { to: '/law/items', icon: PackageSearch, label: 'All Items' },
    { to: '/verify', icon: ScanSearch, label: 'Verify' },
  ],
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/users', icon: UserCircle2, label: 'Users' },
    { to: '/admin/analytics', icon: Activity, label: 'Analytics' },
    { to: '/law/alerts', icon: Siren, label: 'Alerts' },
    { to: '/law/cases', icon: ShieldAlert, label: 'Cases' },
    { to: '/verify', icon: ScanSearch, label: 'Verify' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role || 'victim';
  const items = navItems[role] || navItems.victim;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const roleLabel = {
    victim: 'Victim Portal',
    buyer: 'Buyer Portal',
    law_enforcement: 'Law Enforcement',
    admin: 'Admin Panel',
  };

  return (
    <div className="min-h-screen bg-background flex" data-testid="app-layout">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B0D12] border-r border-white/5 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="w-7 h-7 text-primary" strokeWidth={1.5} />
            <span className="text-lg font-black tracking-tight text-foreground">StoleCheck</span>
          </div>
          <button className="lg:hidden ml-auto text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{roleLabel[role]}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1" data-testid="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon className="w-4.5 h-4.5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/5 glass-panel sticky top-0 z-40 flex items-center px-5 gap-4" data-testid="top-bar">
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)} data-testid="menu-toggle">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-primary">SYSTEM OPERATIONAL</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-5 md:p-8" data-testid="main-content">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
