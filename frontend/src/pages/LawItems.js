import { useState, useEffect, useCallback } from 'react';
import { lawAPI } from '@/lib/api';
import { CategoryBadge, StatusBadge } from '@/components/TPSDisplay';
import { PackageSearch, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function LawItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', status: '' });

  const fetchItems = useCallback(async () => {
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.status) params.status = filter.status;
      const res = await lawAPI.getItems(params);
      setItems(res.data);
    } catch { toast.error('Failed to load items'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div data-testid="law-items-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">All Reported Items</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} items in database</p>
        </div>
        <div className="flex gap-3">
          <Select value={filter.category} onValueChange={(v) => setFilter({ ...filter, category: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-36 bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="jewellery">Jewellery</SelectItem>
              <SelectItem value="vehicle">Vehicle</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-32 bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="recovered">Recovered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="glass-panel rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="items-table">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">SCID</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.item_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{item.scid}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.brand} {item.model}</p>
                    </td>
                    <td className="px-4 py-3"><CategoryBadge category={item.category} /></td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 font-mono text-sm">{item.estimated_value ? `₹${item.estimated_value.toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{item.theft_location || '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.theft_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <PackageSearch className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No items found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
