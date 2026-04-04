import { useState, useEffect, useCallback } from 'react';
import { lawAPI } from '@/lib/api';
import { CategoryBadge, StatusBadge } from '@/components/TPSDisplay';
import { PackageSearch, Loader2, Eye, MapPin, Calendar, IndianRupee, Hash, FileText, Image, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function LawItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const handleViewDetail = async (item) => {
    setDetailLoading(true);
    try {
      const res = await lawAPI.getItemDetail(item.item_id);
      setSelectedItem(res.data);
    } catch {
      // Fallback to the list item data
      setSelectedItem(item);
    }
    setDetailLoading(false);
  };

  return (
    <div data-testid="law-items-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Stolen Items Database</h1>
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
        <div className="space-y-3" data-testid="items-grid">
          {items.map((item) => (
            <div
              key={item.item_id}
              className="glass-panel rounded-lg overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => handleViewDetail(item)}
              data-testid={`item-row-${item.item_id}`}
            >
              <div className="flex">
                {/* Thumbnail */}
                <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-black/30 flex items-center justify-center border-r border-white/5">
                  {item.images && item.images.length > 0 ? (
                    <img src={`data:image/jpeg;base64,${item.images[0]}`} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-8 h-8 text-muted-foreground/20" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-primary">{item.scid}</span>
                    <CategoryBadge category={item.category} />
                    <StatusBadge status={item.status} />
                    {item.images && item.images.length > 0 && (
                      <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded uppercase">{item.images.length} photo{item.images.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-base group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {item.brand && <span>{item.brand} {item.model}</span>}
                    {item.estimated_value && <span>₹{item.estimated_value.toLocaleString()}</span>}
                    {item.theft_location && <span>{item.theft_location}</span>}
                    {item.fir_number && <span className="font-mono">{item.fir_number}</span>}
                  </div>
                </div>

                {/* Action */}
                <div className="hidden md:flex items-center px-4">
                  <Button size="sm" variant="ghost" className="text-primary/50 group-hover:text-primary">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <PackageSearch className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No items found</p>
            </div>
          )}
        </div>
      )}

      {/* Item Detail Dialog */}
      {selectedItem && (
        <ItemDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}


function ItemDetailDialog({ item, onClose }) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0B0D12] border-white/10" data-testid="item-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-primary text-lg">{item.scid}</span>
            <CategoryBadge category={item.category} />
            <StatusBadge status={item.status} />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Images Gallery */}
          {item.images && item.images.length > 0 && (
            <div data-testid="item-images">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Evidence Photos ({item.images.length})
              </p>
              <div className="rounded-lg overflow-hidden border border-white/10 bg-black/30">
                <img
                  src={`data:image/jpeg;base64,${item.images[activeImageIdx]}`}
                  alt={`${item.title} - Photo ${activeImageIdx + 1}`}
                  className="w-full max-h-80 object-contain"
                />
              </div>
              {item.images.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {item.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      className={`w-16 h-16 rounded border overflow-hidden ${i === activeImageIdx ? 'border-primary' : 'border-white/10'}`}
                    >
                      <img src={`data:image/jpeg;base64,${img}`} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          </div>

          {/* Item Specifications */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Item Details</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {item.brand && <DetailField label="Brand" value={item.brand} />}
              {item.model && <DetailField label="Model" value={item.model} />}
              {item.color && <DetailField label="Color" value={item.color} />}
              {item.estimated_value && <DetailField label="Estimated Value" value={`₹${item.estimated_value.toLocaleString()}`} />}
              {item.purchase_date && <DetailField label="Purchase Date" value={item.purchase_date} />}
            </div>
          </div>

          {/* Distinguishing Marks */}
          {item.distinguishing_marks && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Distinguishing Marks</p>
              <p className="text-sm text-foreground/80 bg-background/50 rounded-lg p-3 border border-white/5 leading-relaxed">{item.distinguishing_marks}</p>
            </div>
          )}

          {/* Unique Identifiers */}
          {item.unique_identifiers && Object.keys(item.unique_identifiers).length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Unique Identifiers</p>
              <div className="bg-background/50 rounded-lg border border-white/5 divide-y divide-white/5">
                {Object.entries(item.unique_identifiers).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground uppercase font-bold">{key.replace('_', ' ')}</span>
                    <span className="font-mono text-sm text-primary">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theft Information */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Theft Information</p>
            <div className="grid grid-cols-2 gap-4">
              {item.theft_date && <DetailFieldIcon icon={Calendar} label="Theft Date" value={item.theft_date} />}
              {item.theft_location && <DetailFieldIcon icon={MapPin} label="Theft Location" value={item.theft_location} />}
              {item.fir_number && <DetailFieldIcon icon={FileText} label="FIR Number" value={item.fir_number} />}
              {item.reporter_name && <DetailFieldIcon icon={User} label="Reported By" value={item.reporter_name} />}
            </div>
          </div>

          {/* Registration Info */}
          <div className="text-xs text-muted-foreground pt-2 border-t border-white/5">
            Registered: {new Date(item.created_at).toLocaleString()} | Item ID: <span className="font-mono">{item.item_id}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function DetailFieldIcon({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
