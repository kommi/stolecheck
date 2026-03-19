import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { verifyAPI } from '@/lib/api';
import { TPSDisplay, CategoryBadge } from '@/components/TPSDisplay';
import { ScanSearch, Camera, Hash, Type, Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function BuyerVerification() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleScan = async (data) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyAPI.scan(data);
      setResult(res.data);
      if (res.data.tps_score > 70) {
        toast.error('HIGH RISK: This item may be stolen!');
      } else if (res.data.tps_score > 30) {
        toast.warning('SUSPICIOUS: Exercise caution with this item.');
      } else {
        toast.success('SAFE: No matches found in stolen database.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed');
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    try {
      const res = await verifyAPI.history();
      setHistory(res.data);
      setShowHistory(true);
    } catch {
      toast.error('Failed to load history');
    }
  };

  return (
    <div data-testid="buyer-verification">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Verify Item</h1>
          <p className="text-muted-foreground text-sm mt-1">Scan or search items before purchasing to check theft status</p>
        </div>
        <Button onClick={loadHistory} variant="outline" className="border-white/10 rounded-sm" data-testid="history-btn">
          <Clock className="w-4 h-4 mr-2" /> Scan History
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Scan Panel */}
        <div className="glass-panel rounded-lg p-6" data-testid="scan-panel">
          <Tabs defaultValue="photo" className="w-full">
            <TabsList className="w-full bg-background/50 mb-6">
              <TabsTrigger value="photo" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary" data-testid="tab-photo">
                <Camera className="w-4 h-4 mr-2" /> Photo Scan
              </TabsTrigger>
              <TabsTrigger value="id" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary" data-testid="tab-id">
                <Hash className="w-4 h-4 mr-2" /> ID Scan
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary" data-testid="tab-text">
                <Type className="w-4 h-4 mr-2" /> Text Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photo">
              <PhotoScan onScan={handleScan} loading={loading} />
            </TabsContent>
            <TabsContent value="id">
              <IDScan onScan={handleScan} loading={loading} />
            </TabsContent>
            <TabsContent value="text">
              <TextSearch onScan={handleScan} loading={loading} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Results Panel */}
        <div className="glass-panel rounded-lg p-6" data-testid="results-panel">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <ScanSearch className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Scan Results
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-primary/30 animate-pulse" />
                <Loader2 className="w-8 h-8 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-muted-foreground">Analyzing against stolen database...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* TPS Score */}
              <div className="flex justify-center py-4">
                <TPSDisplay score={result.tps_score} size="lg" />
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Score Breakdown</p>
                <ScoreBar label="Visual Similarity" value={result.visual_similarity} weight="40%" />
                <ScoreBar label="ID Match" value={result.id_match_confidence} weight="35%" />
                <ScoreBar label="Metadata Match" value={result.metadata_match} weight="15%" />
                <ScoreBar label="Contextual Risk" value={result.contextual_risk} weight="10%" />
              </div>

              {/* Matched Items */}
              {result.matched_items?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Matched Items ({result.matched_items.length})</p>
                  <div className="space-y-2">
                    {result.matched_items.map((m, i) => (
                      <div key={i} className="bg-background/50 rounded-md p-3 border border-white/5" data-testid={`match-${i}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-primary">{m.scid}</span>
                          <span className={`font-mono text-xs font-bold ${m.confidence > 70 ? 'text-red-400' : m.confidence > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {m.confidence}% match
                          </span>
                        </div>
                        {m.title && <p className="text-sm font-medium">{m.title}</p>}
                        {m.category && <CategoryBadge category={m.category} />}
                        <p className="text-xs text-muted-foreground mt-1">{m.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {result.ai_analysis && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">AI Analysis</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.ai_analysis}</p>
                </div>
              )}

              {/* Action Warning */}
              {result.tps_score > 70 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3" data-testid="stolen-warning">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <p className="font-bold text-red-400 text-sm">WARNING: High Probability of Stolen Item</p>
                    <p className="text-xs text-muted-foreground mt-1">Do not proceed with purchase. Alert has been sent to law enforcement.</p>
                  </div>
                </div>
              )}
              {result.tps_score <= 30 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex gap-3" data-testid="safe-notice">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-400 text-sm">No Matches Found</p>
                    <p className="text-xs text-muted-foreground mt-1">Item not found in stolen database. Proceed with standard caution.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ScanSearch className="w-8 h-8 text-primary/50" strokeWidth={1.5} />
              </div>
              <p className="text-muted-foreground text-sm">Use the scan panel to verify an item</p>
              <p className="text-muted-foreground text-xs mt-1">Photo scan, ID lookup, or text search</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="mt-8 glass-panel rounded-lg p-6" data-testid="scan-history">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Scan History</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>Close</Button>
          </div>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-background/50 rounded-md p-3 border border-white/5">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${h.risk_level === 'safe' ? 'bg-emerald-400' : h.risk_level === 'suspicious' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm font-medium capitalize">{h.search_type?.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-mono font-bold text-sm ${h.tps_score > 70 ? 'text-red-400' : h.tps_score > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  TPS: {h.tps_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function PhotoScan({ onScan, loading }) {
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState('');

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Upload Item Photo</Label>
        {image ? (
          <div className="relative rounded-lg overflow-hidden border border-white/10 aspect-video">
            <img src={image} alt="Scan" className="w-full h-full object-contain bg-black" />
            <button onClick={() => setImage(null)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center">
              <span className="text-white text-xs">x</span>
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-white/10 hover:border-primary/30 cursor-pointer transition-colors" data-testid="photo-upload-area">
            <Camera className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload or drag photo</span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        )}
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Category (optional)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-background" data-testid="photo-category-select">
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any category</SelectItem>
            <SelectItem value="jewellery">Jewellery</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => onScan({ search_type: 'photo', image_base64: image?.split(',')[1], category: category && category !== 'any' ? category : undefined })}
        disabled={!image || loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase tracking-wide h-11"
        data-testid="photo-scan-btn"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanSearch className="w-4 h-4 mr-2" />}
        Scan Photo
      </Button>
    </div>
  );
}


function IDScan({ onScan, loading }) {
  const [idType, setIdType] = useState('imei');
  const [idValue, setIdValue] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Identifier Type</Label>
        <Select value={idType} onValueChange={setIdType}>
          <SelectTrigger className="bg-background" data-testid="id-type-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="imei">IMEI Number</SelectItem>
            <SelectItem value="vin">VIN / Chassis</SelectItem>
            <SelectItem value="hallmark">Hallmark ID</SelectItem>
            <SelectItem value="serial">Serial Number</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Identifier Value</Label>
        <Input
          value={idValue}
          onChange={(e) => setIdValue(e.target.value)}
          placeholder={`Enter ${idType.toUpperCase()}`}
          className="bg-background font-mono"
          data-testid="id-value-input"
        />
      </div>
      <Button
        onClick={() => onScan({ search_type: 'id_scan', identifier_type: idType, identifier_value: idValue })}
        disabled={!idValue.trim() || loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase tracking-wide h-11"
        data-testid="id-scan-btn"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Hash className="w-4 h-4 mr-2" />}
        Search ID
      </Button>
    </div>
  );
}


function TextSearch({ onScan, loading }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Search Description</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the item: brand, model, color, any details..."
          rows={3}
          className="bg-background"
          data-testid="text-search-input"
        />
      </div>
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Category (optional)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-background" data-testid="text-category-select">
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any category</SelectItem>
            <SelectItem value="jewellery">Jewellery</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => onScan({ search_type: 'text_search', search_text: text, category: category && category !== 'any' ? category : undefined })}
        disabled={!text.trim() || loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase tracking-wide h-11"
        data-testid="text-search-btn"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Type className="w-4 h-4 mr-2" />}
        Search Database
      </Button>
    </div>
  );
}


function ScoreBar({ label, value, weight }) {
  const pct = Math.round(value * 100);
  const color = pct > 70 ? 'bg-red-500' : pct > 30 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label} <span className="text-muted-foreground/50">({weight})</span></span>
        <span className="font-mono font-bold">{pct}%</span>
      </div>
      <div className="h-1.5 bg-background rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
