import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api';
import { StatusBadge } from '@/components/TPSDisplay';
import { Users, Package, ScanSearch, Siren, TrendingUp, ShieldCheck, Loader2, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      toast.error('Failed to load admin data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="admin-panel">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform analytics and user management</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-primary' },
            { label: 'Total Items', value: stats.total_items, icon: Package, color: 'text-amber-400' },
            { label: 'Verifications', value: stats.total_verifications, icon: ScanSearch, color: 'text-violet-400' },
            { label: 'Alerts', value: stats.total_alerts, icon: Siren, color: 'text-red-400' },
            { label: 'Recovered', value: stats.items_recovered, icon: ShieldCheck, color: 'text-emerald-400' },
            { label: 'Active Cases', value: stats.active_cases, icon: TrendingUp, color: 'text-cyan-400' },
          ].map((s, i) => (
            <div key={i} className="glass-panel rounded-lg p-4" data-testid={`admin-stat-${i}`}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} strokeWidth={1.5} />
              <p className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {['overview', 'users'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
              activeTab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`admin-tab-${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && <OverviewTab stats={stats} />}
      {activeTab === 'users' && <UsersTab users={users} onRefresh={fetchData} />}
    </div>
  );
}


function OverviewTab({ stats }) {
  const categoryData = Object.entries(stats.items_by_category).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const roleData = Object.entries(stats.users_by_role).map(([name, value]) => ({
    name: name === 'law_enforcement' ? 'Law Enf.' : name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#64748B'];
  const ROLE_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Items by Category */}
      <div className="glass-panel rounded-lg p-5" data-testid="category-chart">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Items by Category</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
            <YAxis stroke="#64748B" fontSize={12} />
            <Tooltip contentStyle={{ background: '#0B0D12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }} />
            <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Users by Role */}
      <div className="glass-panel rounded-lg p-5" data-testid="role-chart">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Users by Role</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
              {roleData.map((entry, i) => (
                <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#0B0D12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="lg:col-span-2 glass-panel rounded-lg p-5" data-testid="recent-activity">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {stats.recent_activity?.slice(0, 10).map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-background/50 rounded-md p-3 border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  a.type === 'item_registered' ? 'bg-amber-400' :
                  a.type === 'verification' ? 'bg-primary' :
                  a.type === 'case_created' ? 'bg-emerald-400' : 'bg-slate-400'
                }`} />
                <span className="text-sm">{a.description}</span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function UsersTab({ users, onRefresh }) {
  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminAPI.updateRole(userId, newRole);
      toast.success('User role updated');
      onRefresh();
    } catch {
      toast.error('Failed to update role');
    }
  };

  return (
    <div data-testid="users-table">
      <div className="glass-panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`user-row-${u.user_id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{u.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                      <SelectTrigger className="w-36 h-8 bg-background text-xs" data-testid={`role-select-${u.user_id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="victim">Victim</SelectItem>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="law_enforcement">Law Enforcement</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] text-muted-foreground">{u.user_id}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
