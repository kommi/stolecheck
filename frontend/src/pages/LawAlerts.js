import { useState, useEffect, useCallback } from 'react';
import { lawAPI } from '@/lib/api';
import { CategoryBadge, StatusBadge, TPSBadge } from '@/components/TPSDisplay';
import { Siren, Loader2, Eye, MapPin, Calendar, FileText, Image, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function LawAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [linkedItem, setLinkedItem] = useState(null);

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
      setSelectedAlert(null);
    } catch { toast.error('Update failed'); }
  };

  const handleCreateCase = async (alertId) => {
    try {
      await lawAPI.createCase({ alert_id: alertId });
      toast.success('Case created');
      fetchAlerts();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleViewItem = async (alert) => {
    try {
      const res = await lawAPI.getItemDetail(alert.item_id);
      setLinkedItem(res.data);
    } catch {
      toast.error('Could not load item details');
    }
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-primary/70">{a.scid}</span>
                    <CategoryBadge category={a.category} />
                    <StatusBadge status={a.status} />
                    <TPSBadge score={a.tps_score} />
                  </div>
                  <p className="font-bold text-lg">{a.item_title}</p>
                  {a.scan_location && <p className="text-sm text-muted-foreground mt-1">Scanned at: {a.scan_location}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button size="sm" onClick={() => handleViewItem(a)} variant="outline" className="text-xs border-primary/30 text-primary hover:bg-primary/10" data-testid={`view-item-${a.alert_id}`}>
                    <Eye className="w-3 h-3 mr-1" /> View Item
                  </Button>
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

      {/* Linked Item Detail Dialog */}
      {linkedItem && (
        <Dialog open={!!linkedItem} onOpenChange={() => setLinkedItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0B0D12] border-white/10" data-testid="alert-item-detail">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-primary text-lg">{linkedItem.scid}</span>
                <CategoryBadge category={linkedItem.category} />
                <StatusBadge status={linkedItem.status} />
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Images */}
              {linkedItem.images && linkedItem.images.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Evidence Photos ({linkedItem.images.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {linkedItem.images.map((img, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-white/10 bg-black/30">
                        <img src={`data:image/jpeg;base64,${img}`} alt={`Photo ${i+1}`} className="w-full max-h-60 object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-xl font-bold">{linkedItem.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{linkedItem.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {linkedItem.brand && <DField label="Brand" value={linkedItem.brand} />}
                {linkedItem.model && <DField label="Model" value={linkedItem.model} />}
                {linkedItem.color && <DField label="Color" value={linkedItem.color} />}
                {linkedItem.estimated_value && <DField label="Value" value={`₹${linkedItem.estimated_value.toLocaleString()}`} />}
                {linkedItem.theft_date && <DField label="Theft Date" value={linkedItem.theft_date} />}
                {linkedItem.theft_location && <DField label="Location" value={linkedItem.theft_location} />}
                {linkedItem.fir_number && <DField label="FIR" value={linkedItem.fir_number} />}
                {linkedItem.reporter_name && <DField label="Reporter" value={linkedItem.reporter_name} />}
              </div>

              {linkedItem.distinguishing_marks && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Distinguishing Marks</p>
                  <p className="text-sm bg-background/50 rounded p-3 border border-white/5">{linkedItem.distinguishing_marks}</p>
                </div>
              )}

              {linkedItem.unique_identifiers && Object.keys(linkedItem.unique_identifiers).length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Identifiers</p>
                  <div className="bg-background/50 rounded-lg border border-white/5 divide-y divide-white/5">
                    {Object.entries(linkedItem.unique_identifiers).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs text-muted-foreground uppercase font-bold">{k.replace('_', ' ')}</span>
                        <span className="font-mono text-sm text-primary">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
