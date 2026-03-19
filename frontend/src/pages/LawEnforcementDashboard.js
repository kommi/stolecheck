import { useState, useEffect, useCallback } from 'react';
import { lawAPI } from '@/lib/api';
import { TPSBadge, CategoryBadge, StatusBadge } from '@/components/TPSDisplay';
import { Siren, ShieldAlert, Package, TrendingUp, Loader2, Eye, FolderOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LawEnforcementDashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, alertsRes, casesRes] = await Promise.all([
        lawAPI.getStats(),
        lawAPI.getAlerts({}),
        lawAPI.getCases({}),
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setCases(casesRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
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
    <div data-testid="law-enforcement-dashboard">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time stolen goods intelligence and case management</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'New Alerts', value: stats.new_alerts, icon: Siren, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Investigating', value: stats.investigating, icon: Eye, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Open Cases', value: stats.open_cases, icon: FolderOpen, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Items Recovered', value: stats.recovered, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((s, i) => (
            <div key={i} className="glass-panel rounded-lg p-5" data-testid={`leo-stat-${i}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4.5 h-4.5 ${s.color}`} strokeWidth={1.5} />
                </div>
              </div>
              <p className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {['overview', 'alerts', 'cases'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
              activeTab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`leo-tab-${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab stats={stats} alerts={alerts} cases={cases} />}
      {activeTab === 'alerts' && <AlertsTab alerts={alerts} onRefresh={fetchData} />}
      {activeTab === 'cases' && <CasesTab cases={cases} onRefresh={fetchData} />}
    </div>
  );
}


function OverviewTab({ stats, alerts, cases }) {
  const recentAlerts = alerts.slice(0, 5);
  const recentCases = cases.slice(0, 5);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Recent Alerts */}
      <div className="glass-panel rounded-lg p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Siren className="w-4 h-4 text-red-400" strokeWidth={1.5} /> Recent Alerts
        </h3>
        <div className="space-y-3">
          {recentAlerts.map((a) => (
            <div key={a.alert_id} className="bg-background/50 rounded-md p-3 border border-white/5" data-testid={`overview-alert-${a.alert_id}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-primary/70">{a.scid}</span>
                <TPSBadge score={a.tps_score} />
              </div>
              <p className="text-sm font-medium">{a.item_title}</p>
              <div className="flex items-center gap-2 mt-1">
                <CategoryBadge category={a.category} />
                <StatusBadge status={a.status} />
              </div>
              {a.scan_location && <p className="text-xs text-muted-foreground mt-1">{a.scan_location}</p>}
            </div>
          ))}
          {recentAlerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No alerts yet</p>}
        </div>
      </div>

      {/* Recent Cases */}
      <div className="glass-panel rounded-lg p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" strokeWidth={1.5} /> Active Cases
        </h3>
        <div className="space-y-3">
          {recentCases.map((c) => (
            <div key={c.case_id} className="bg-background/50 rounded-md p-3 border border-white/5" data-testid={`overview-case-${c.case_id}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-primary/70">{c.scid}</span>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm font-medium">Case: {c.case_id}</p>
              <p className="text-xs text-muted-foreground mt-1">Officer: {c.assigned_officer}</p>
              {c.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.notes}</p>}
            </div>
          ))}
          {recentCases.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active cases</p>}
        </div>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="lg:col-span-2 glass-panel rounded-lg p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} /> Database Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-mono font-bold text-foreground">{stats.total_items}</p>
              <p className="text-xs text-muted-foreground">Total Items in DB</p>
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-foreground">{stats.total_alerts}</p>
              <p className="text-xs text-muted-foreground">Total Alerts</p>
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-foreground">{stats.total_cases}</p>
              <p className="text-xs text-muted-foreground">Total Cases</p>
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-emerald-400">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function AlertsTab({ alerts, onRefresh }) {
  const [filter, setFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);

  const filtered = filter ? alerts.filter(a => a.status === filter) : alerts;

  const handleStatusUpdate = async (alertId, status) => {
    try {
      await lawAPI.updateAlert(alertId, { status });
      toast.success('Alert status updated');
      onRefresh();
      setSelectedAlert(null);
    } catch {
      toast.error('Failed to update alert');
    }
  };

  const handleCreateCase = async (alert) => {
    try {
      await lawAPI.createCase({ alert_id: alert.alert_id });
      toast.success('Case created');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create case');
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Select value={filter} onValueChange={(v) => setFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 bg-background" data-testid="alert-filter">
            <SelectValue placeholder="All Alerts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3" data-testid="alerts-list">
        {filtered.map((a) => (
          <div key={a.alert_id} className="glass-panel rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedAlert(a)} data-testid={`alert-${a.alert_id}`}>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-primary/70">{a.scid}</span>
                  <CategoryBadge category={a.category} />
                  <StatusBadge status={a.status} />
                </div>
                <p className="font-bold">{a.item_title}</p>
                {a.scan_location && <p className="text-xs text-muted-foreground mt-1">Scanned at: {a.scan_location}</p>}
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <TPSBadge score={a.tps_score} />
                {a.status === 'new' && (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleCreateCase(a); }} className="bg-primary/20 text-primary hover:bg-primary/30 rounded-sm text-xs" data-testid={`create-case-${a.alert_id}`}>
                    Open Case
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No alerts found</p>}
      </div>

      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="bg-[#0B0D12] border-white/10" data-testid="alert-detail-dialog">
            <DialogHeader>
              <DialogTitle>Alert: {selectedAlert.scid}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="font-bold text-lg">{selectedAlert.item_title}</p>
              <div className="flex gap-2 flex-wrap">
                <CategoryBadge category={selectedAlert.category} />
                <StatusBadge status={selectedAlert.status} />
                <TPSBadge score={selectedAlert.tps_score} />
              </div>
              {selectedAlert.scan_location && <p className="text-sm text-muted-foreground">Location: {selectedAlert.scan_location}</p>}
              <p className="text-sm text-muted-foreground">Reported: {new Date(selectedAlert.created_at).toLocaleString()}</p>
              <div className="flex gap-2">
                <Button onClick={() => handleStatusUpdate(selectedAlert.alert_id, 'investigating')} variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">Investigating</Button>
                <Button onClick={() => handleStatusUpdate(selectedAlert.alert_id, 'resolved')} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">Resolve</Button>
                <Button onClick={() => handleStatusUpdate(selectedAlert.alert_id, 'dismissed')} variant="outline" className="border-slate-500/30 text-slate-400 hover:bg-slate-500/10">Dismiss</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


function CasesTab({ cases, onRefresh }) {
  const [filter, setFilter] = useState('');
  const filtered = filter ? cases.filter(c => c.status === filter) : cases;

  const handleUpdate = async (caseId, updates) => {
    try {
      await lawAPI.updateCase(caseId, updates);
      toast.success('Case updated');
      onRefresh();
    } catch {
      toast.error('Failed to update case');
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Select value={filter} onValueChange={(v) => setFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 bg-background" data-testid="case-filter">
            <SelectValue placeholder="All Cases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cases</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3" data-testid="cases-list">
        {filtered.map((c) => (
          <div key={c.case_id} className="glass-panel rounded-lg p-4" data-testid={`case-${c.case_id}`}>
            <div className="flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-primary/70">{c.case_id}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.scid}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm">Officer: <span className="font-medium">{c.assigned_officer}</span></p>
                {c.notes && <p className="text-sm text-muted-foreground mt-1">{c.notes}</p>}
                <p className="text-xs text-muted-foreground mt-2">Updated: {new Date(c.updated_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                {c.status !== 'closed' && (
                  <>
                    <Button size="sm" onClick={() => handleUpdate(c.case_id, { status: 'in_progress' })} variant="outline" className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                      In Progress
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate(c.case_id, { status: 'closed' })} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                      Close
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No cases found</p>}
      </div>
    </div>
  );
}
