import { useState, useEffect, useCallback } from 'react';
import { lawAPI } from '@/lib/api';
import { CategoryBadge, StatusBadge } from '@/components/TPSDisplay';
import { Siren, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function LawAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchAlerts = useCallback(async () => {
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await lawAPI.getAlerts(params);
      setAlerts(res.data);
    } catch { toast.error('Failed to load alerts'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleStatusUpdate = async (alertId, status) => {
    try {
      await lawAPI.updateAlert(alertId, { status });
      toast.success('Alert updated');
      fetchAlerts();
    } catch { toast.error('Update failed'); }
  };

  const handleCreateCase = async (alertId) => {
    try {
      await lawAPI.createCase({ alert_id: alertId });
      toast.success('Case created');
      fetchAlerts();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div data-testid="law-alerts-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">High-risk stolen item detections</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 bg-background" data-testid="alerts-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3" data-testid="alerts-list">
          {alerts.map((a) => (
            <div key={a.alert_id} className="glass-panel rounded-lg p-5" data-testid={`alert-${a.alert_id}`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-primary/70">{a.scid}</span>
                    <CategoryBadge category={a.category} />
                    <StatusBadge status={a.status} />
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${a.tps_score > 70 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      TPS: {a.tps_score}
                    </span>
                  </div>
                  <p className="font-bold text-lg">{a.item_title}</p>
                  {a.scan_location && <p className="text-sm text-muted-foreground mt-1">Location: {a.scan_location}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {a.status === 'new' && (
                    <>
                      <Button size="sm" onClick={() => handleCreateCase(a.alert_id)} className="bg-primary/20 text-primary hover:bg-primary/30 rounded-sm text-xs">
                        Open Case
                      </Button>
                      <Button size="sm" onClick={() => handleStatusUpdate(a.alert_id, 'investigating')} variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                        Investigate
                      </Button>
                    </>
                  )}
                  {a.status === 'investigating' && (
                    <Button size="sm" onClick={() => handleStatusUpdate(a.alert_id, 'resolved')} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Siren className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No alerts found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
