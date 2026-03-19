import { useState, useEffect, useCallback } from 'react';
import { lawAPI } from '@/lib/api';
import { StatusBadge } from '@/components/TPSDisplay';
import { FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function LawCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchCases = useCallback(async () => {
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await lawAPI.getCases(params);
      setCases(res.data);
    } catch { toast.error('Failed to load cases'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleUpdate = async (caseId, status) => {
    try {
      await lawAPI.updateCase(caseId, { status });
      toast.success('Case updated');
      fetchCases();
    } catch { toast.error('Update failed'); }
  };

  return (
    <div data-testid="law-cases-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cases</h1>
          <p className="text-muted-foreground text-sm mt-1">Active investigations and case management</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 bg-background" data-testid="cases-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3" data-testid="cases-list">
          {cases.map((c) => (
            <div key={c.case_id} className="glass-panel rounded-lg p-5" data-testid={`case-${c.case_id}`}>
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-primary font-bold">{c.case_id}</span>
                    <span className="font-mono text-xs text-muted-foreground">{c.scid}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm">Assigned to: <span className="font-medium">{c.assigned_officer}</span></p>
                  {c.notes && <p className="text-sm text-muted-foreground mt-2 bg-background/50 rounded p-3">{c.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-2">Last updated: {new Date(c.updated_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {c.status !== 'closed' && (
                    <>
                      {c.status !== 'in_progress' && (
                        <Button size="sm" onClick={() => handleUpdate(c.case_id, 'in_progress')} variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                          In Progress
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleUpdate(c.case_id, 'closed')} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                        Close Case
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {cases.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No cases found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
