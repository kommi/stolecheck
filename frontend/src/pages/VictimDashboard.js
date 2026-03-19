import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { itemsAPI } from '@/lib/api';
import { CategoryBadge, StatusBadge } from '@/components/TPSDisplay';
import { Plus, X, Upload, Loader2, Package, Camera, Hash, MapPin, Calendar, IndianRupee, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function VictimDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.status) params.status = filter.status;
      const res = await itemsAPI.getAll(params);
      setItems(res.data);
    } catch (err) {
      toast.error('Failed to load items');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const stats = {
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    recovered: items.filter(i => i.status === 'recovered').length,
  };

  return (
    <div data-testid="victim-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Stolen Items</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your reported items, {user?.name}</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-sm font-bold uppercase tracking-wide"
          data-testid="add-item-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Report Stolen Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Items', value: stats.total, color: 'text-primary' },
          { label: 'Active', value: stats.active, color: 'text-amber-400' },
          { label: 'Recovered', value: stats.recovered, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="glass-panel rounded-lg p-5" data-testid={`stat-card-${i}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{s.label}</p>
            <p className={`text-3xl font-mono font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filter.category} onValueChange={(v) => setFilter({ ...filter, category: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-40 bg-background" data-testid="filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="jewellery">Jewellery</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-32 bg-background" data-testid="filter-status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="recovered">Recovered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="glass-panel rounded-lg p-12 text-center" data-testid="empty-state">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-bold mb-2">No items reported</h3>
          <p className="text-muted-foreground text-sm mb-6">Start by reporting a stolen item to get it into the database</p>
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground rounded-sm font-bold uppercase tracking-wide">
            <Plus className="w-4 h-4 mr-2" /> Report Item
          </Button>
        </div>
      ) : (
        <div className="grid gap-4" data-testid="items-list">
          {items.map((item) => (
            <div
              key={item.item_id}
              onClick={() => setSelectedItem(item)}
              className="glass-panel rounded-lg p-5 hover:border-primary/30 transition-colors duration-300 cursor-pointer group"
              data-testid={`item-card-${item.item_id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-primary/70">{item.scid}</span>
                    <CategoryBadge category={item.category} />
                    <StatusBadge status={item.status} />
                  </div>
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {item.brand && <span>Brand: <span className="text-foreground/70">{item.brand}</span></span>}
                    {item.estimated_value && <span>Value: <span className="text-foreground/70">₹{item.estimated_value?.toLocaleString()}</span></span>}
                    {item.theft_location && <span>Location: <span className="text-foreground/70">{item.theft_location}</span></span>}
                  </div>
                </div>
                {item.fir_number && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">FIR</p>
                    <p className="font-mono text-xs text-foreground/70">{item.fir_number}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateItemDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchItems(); }} />

      {/* Detail Dialog */}
      {selectedItem && (
        <ItemDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} onUpdated={fetchItems} />
      )}
    </div>
  );
}


function CreateItemDialog({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: 'electronics', title: '', description: '', brand: '', model: '',
    color: '', distinguishing_marks: '', estimated_value: '', purchase_date: '',
    fir_number: '', theft_date: '', theft_location: '',
    unique_identifiers: { imei: '', vin: '', hallmark_id: '', serial_number: '' },
    images: [],
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setForm(prev => ({ ...prev, images: [...prev.images, base64] }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        unique_identifiers: Object.fromEntries(
          Object.entries(form.unique_identifiers).filter(([, v]) => v)
        ),
      };
      await itemsAPI.create(payload);
      toast.success('Item registered! SCID assigned.');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to register item');
    }
    setLoading(false);
  };

  const idFields = {
    jewellery: ['hallmark_id'],
    vehicle: ['vin'],
    electronics: ['imei', 'serial_number'],
    other: ['serial_number'],
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0B0D12] border-white/10" data-testid="create-item-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Report Stolen Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</Label>
            <div className="grid grid-cols-4 gap-2">
              {['jewellery', 'vehicle', 'electronics', 'other'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={`px-3 py-2 rounded-md text-xs font-semibold capitalize border transition-colors ${
                    form.category === c ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background border-white/10 text-muted-foreground hover:border-white/20'
                  }`}
                  data-testid={`category-btn-${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Title & Description */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Item Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. iPhone 16 Pro Max" required className="bg-background" data-testid="item-title-input" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Apple, Honda" className="bg-background" data-testid="item-brand-input" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed description including model, color, distinguishing marks..." required rows={3} className="bg-background" data-testid="item-description-input" />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Model</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Model name" className="bg-background" data-testid="item-model-input" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Color</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Color" className="bg-background" data-testid="item-color-input" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Est. Value (₹)</Label>
              <Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} placeholder="0" className="bg-background" data-testid="item-value-input" />
            </div>
          </div>

          {/* Unique Identifiers */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Unique Identifiers</Label>
            <div className="grid grid-cols-2 gap-3">
              {(idFields[form.category] || idFields.other).map((field) => (
                <div key={field}>
                  <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">{field.replace('_', ' ')}</Label>
                  <Input
                    value={form.unique_identifiers[field] || ''}
                    onChange={(e) => setForm({ ...form, unique_identifiers: { ...form.unique_identifiers, [field]: e.target.value } })}
                    placeholder={field.toUpperCase()}
                    className="bg-background font-mono text-sm"
                    data-testid={`id-${field}-input`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Theft Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Theft Date</Label>
              <Input type="date" value={form.theft_date} onChange={(e) => setForm({ ...form, theft_date: e.target.value })} className="bg-background" data-testid="theft-date-input" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Theft Location</Label>
              <Input value={form.theft_location} onChange={(e) => setForm({ ...form, theft_location: e.target.value })} placeholder="City, Area" className="bg-background" data-testid="theft-location-input" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">FIR Number</Label>
              <Input value={form.fir_number} onChange={(e) => setForm({ ...form, fir_number: e.target.value })} placeholder="FIR/YYYY/..." className="bg-background font-mono text-sm" data-testid="fir-input" />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Photos</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-dashed border-white/20 hover:border-primary/40 cursor-pointer transition-colors" data-testid="image-upload-btn">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload Photo</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {form.images.length > 0 && (
                <span className="text-xs text-emerald-400">{form.images.length} photo(s) added</span>
              )}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.4)] rounded-sm font-bold uppercase tracking-wide h-11" data-testid="submit-item-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Register Stolen Item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function ItemDetailDialog({ item, onClose, onUpdated }) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await itemsAPI.update(item.item_id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      onUpdated();
      onClose();
    } catch {
      toast.error('Failed to update');
    }
    setUpdating(false);
  };

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#0B0D12] border-white/10" data-testid="item-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-primary">{item.scid}</span>
            <CategoryBadge category={item.category} />
            <StatusBadge status={item.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <h3 className="text-xl font-bold">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>

          <div className="grid grid-cols-2 gap-3">
            {item.brand && <InfoRow icon={Package} label="Brand" value={item.brand} />}
            {item.model && <InfoRow icon={Hash} label="Model" value={item.model} />}
            {item.color && <InfoRow icon={Package} label="Color" value={item.color} />}
            {item.estimated_value && <InfoRow icon={IndianRupee} label="Value" value={`₹${item.estimated_value.toLocaleString()}`} />}
            {item.theft_date && <InfoRow icon={Calendar} label="Theft Date" value={item.theft_date} />}
            {item.theft_location && <InfoRow icon={MapPin} label="Location" value={item.theft_location} />}
          </div>

          {item.unique_identifiers && Object.keys(item.unique_identifiers).length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Identifiers</p>
              <div className="space-y-1">
                {Object.entries(item.unique_identifiers).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground uppercase text-xs">{k.replace('_', ' ')}</span>
                    <span className="font-mono text-xs">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.distinguishing_marks && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Distinguishing Marks</p>
              <p className="text-sm text-foreground/80">{item.distinguishing_marks}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {item.status === 'active' && (
              <Button onClick={() => handleStatusChange('recovered')} disabled={updating} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" data-testid="mark-recovered-btn">
                Mark Recovered
              </Button>
            )}
            {item.status !== 'closed' && (
              <Button onClick={() => handleStatusChange('closed')} disabled={updating} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="close-item-btn">
                Close Report
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5" strokeWidth={1.5} />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
