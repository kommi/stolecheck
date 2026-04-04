import { useState, useRef } from 'react';
import { verifyAPI } from '@/lib/api';
import { TPSDisplay, CategoryBadge } from '@/components/TPSDisplay';
import { ScanSearch, Camera, Hash, Type, Loader2, AlertTriangle, CheckCircle2, Clock, Image, MapPin, IndianRupee, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function BuyerVerification() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scanImagePreview, setScanImagePreview] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const handleScan = async (data, previewUrl) => {
    setLoading(true);
    setResult(null);
    setScanImagePreview(previewUrl || null);
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

      {/* Scan Panel */}
      <div className="glass-panel rounded-lg p-6 mb-8" data-testid="scan-panel">
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
      {loading && (
        <div className="glass-panel rounded-lg p-12" data-testid="loading-panel">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-2 border-primary/30">
                <div className="absolute inset-0 rounded-full border-2 border-primary/60 border-t-transparent animate-spin" />
              </div>
              <ScanSearch className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-muted-foreground">Analyzing image against stolen items database...</p>
            <p className="text-xs text-muted-foreground/60">AI comparison in progress</p>
          </div>
        </div>
      )}

      {!loading && result && (
        <div className="space-y-6" data-testid="results-panel">
          {/* TPS Score Card */}
          <div className="glass-panel rounded-lg p-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <TPSDisplay score={result.tps_score} size="lg" />
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-3">Verification Result</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ScoreBox label="Visual Match" value={result.visual_similarity} weight="40%" />
                  <ScoreBox label="ID Match" value={result.id_match_confidence} weight="35%" />
                  <ScoreBox label="Metadata" value={result.metadata_match} weight="15%" />
                  <ScoreBox label="Context Risk" value={result.contextual_risk} weight="10%" />
                </div>

                {/* Risk Alert */}
                {result.tps_score > 70 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4 flex gap-3" data-testid="stolen-warning">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-400 text-sm">HIGH RISK: Likely Stolen Item</p>
                      <p className="text-xs text-muted-foreground mt-1">Do NOT proceed with purchase. Law enforcement has been automatically alerted.</p>
                    </div>
                  </div>
                )}
                {result.tps_score > 30 && result.tps_score <= 70 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4 flex gap-3" data-testid="suspicious-warning">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-400 text-sm">SUSPICIOUS: Proceed With Caution</p>
                      <p className="text-xs text-muted-foreground mt-1">Partial matches found. Verify provenance and documentation before purchase.</p>
                    </div>
                  </div>
                )}
                {result.tps_score <= 30 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mt-4 flex gap-3" data-testid="safe-notice">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-400 text-sm">CLEAR: No Database Matches</p>
                      <p className="text-xs text-muted-foreground mt-1">Item not found in stolen database. Proceed with standard due diligence.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          {result.ai_analysis && (
            <div className="glass-panel rounded-lg p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" /> AI Analysis
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{result.ai_analysis}</p>
            </div>
          )}

          {/* Side-by-side Matched Items */}
          {result.matched_items?.length > 0 && (
            <div className="glass-panel rounded-lg p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Matched Stolen Items ({result.matched_items.length})
              </h3>
              <div className="space-y-4">
                {result.matched_items.map((m, i) => (
                  <MatchedItemCard
                    key={i}
                    match={m}
                    index={i}
                    scanImage={scanImagePreview}
                    onViewDetails={() => setSelectedMatch(m)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !result && (
        <div className="glass-panel rounded-lg p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ScanSearch className="w-8 h-8 text-primary/50" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold mb-2">Ready to Verify</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Upload a photo, enter an ID number, or search by description to check if an item is reported stolen.
          </p>
        </div>
      )}

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

      {/* Match Detail Dialog */}
      {selectedMatch && (
        <MatchDetailDialog match={selectedMatch} scanImage={scanImagePreview} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}


function MatchedItemCard({ match, index, scanImage, onViewDetails }) {
  const confidenceColor = match.confidence > 70 ? 'text-red-400 bg-red-500/15 border-red-500/30' :
    match.confidence > 30 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
    'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';

  return (
    <div className="bg-background/50 rounded-lg border border-white/5 overflow-hidden" data-testid={`match-card-${index}`}>
      <div className="flex flex-col lg:flex-row">
        {/* Side-by-side Images */}
        {(scanImage || match.image) && (
          <div className="flex shrink-0 border-b lg:border-b-0 lg:border-r border-white/5">
            {scanImage && (
              <div className="w-40 h-40 relative">
                <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-primary/80 rounded text-[9px] font-bold text-white uppercase">Your Scan</div>
                <img src={scanImage} alt="Scanned" className="w-full h-full object-cover" />
              </div>
            )}
            {match.image && (
              <div className="w-40 h-40 relative">
                <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-red-500/80 rounded text-[9px] font-bold text-white uppercase">Stolen DB</div>
                <img src={`data:image/jpeg;base64,${match.image}`} alt="Database" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Match Details */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-primary/70">{match.scid}</span>
            {match.category && <CategoryBadge category={match.category} />}
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${confidenceColor}`}>
              {match.confidence}% match
            </span>
          </div>
          <h4 className="font-bold text-base mb-1">{match.title || 'Unknown Item'}</h4>
          {match.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{match.description}</p>}
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {match.brand && <span>Brand: <span className="text-foreground/70">{match.brand}</span></span>}
            {match.model && <span>Model: <span className="text-foreground/70">{match.model}</span></span>}
            {match.color && <span>Color: <span className="text-foreground/70">{match.color}</span></span>}
            {match.estimated_value && <span>Value: <span className="text-foreground/70">₹{match.estimated_value.toLocaleString()}</span></span>}
          </div>

          {match.reason && (
            <p className="text-xs text-primary/70 mt-2 italic">{match.reason}</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={onViewDetails} className="text-xs border-white/10" data-testid={`view-details-${match.scid}`}>
              <Eye className="w-3 h-3 mr-1" /> Full Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


function MatchDetailDialog({ match, scanImage, onClose }) {
  return (
    <Dialog open={!!match} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0B0D12] border-white/10" data-testid="match-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-primary">{match.scid}</span>
            <CategoryBadge category={match.category} />
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
              match.confidence > 70 ? 'text-red-400 bg-red-500/15 border-red-500/30' :
              match.confidence > 30 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
              'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
            }`}>
              {match.confidence}% match
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5">
          {/* Side-by-side images */}
          {(scanImage || match.image) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Image Comparison</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg overflow-hidden border border-white/10">
                  <div className="bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary uppercase tracking-wider">Your Scanned Item</div>
                  {scanImage ? (
                    <img src={scanImage} alt="Scanned" className="w-full aspect-square object-contain bg-black/50" />
                  ) : (
                    <div className="w-full aspect-square bg-black/30 flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="rounded-lg overflow-hidden border border-red-500/20">
                  <div className="bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 uppercase tracking-wider">Stolen Database Match</div>
                  {match.image ? (
                    <img src={`data:image/jpeg;base64,${match.image}`} alt="Database" className="w-full aspect-square object-contain bg-black/50" />
                  ) : (
                    <div className="w-full aspect-square bg-black/30 flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <h3 className="text-xl font-bold">{match.title}</h3>
          {match.description && <p className="text-sm text-muted-foreground">{match.description}</p>}

          <div className="grid grid-cols-2 gap-3">
            {match.brand && <DetailRow label="Brand" value={match.brand} />}
            {match.model && <DetailRow label="Model" value={match.model} />}
            {match.color && <DetailRow label="Color" value={match.color} />}
            {match.estimated_value && <DetailRow label="Estimated Value" value={`₹${match.estimated_value.toLocaleString()}`} />}
            {match.theft_location && <DetailRow label="Theft Location" value={match.theft_location} />}
            {match.theft_date && <DetailRow label="Theft Date" value={match.theft_date} />}
            {match.fir_number && <DetailRow label="FIR Number" value={match.fir_number} />}
          </div>

          {match.distinguishing_marks && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Distinguishing Marks</p>
              <p className="text-sm text-foreground/80 bg-background/50 rounded p-3 border border-white/5">{match.distinguishing_marks}</p>
            </div>
          )}

          {match.reason && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Match Reason</p>
              <p className="text-sm text-primary/80">{match.reason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}


function PhotoScan({ onScan, loading }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [category, setCategory] = useState('');

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImage(reader.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Upload Item Photo</Label>
        {imagePreview ? (
          <div className="relative rounded-lg overflow-hidden border border-white/10 max-w-md">
            <img src={imagePreview} alt="Scan" className="w-full max-h-64 object-contain bg-black/50" />
            <button onClick={() => { setImage(null); setImagePreview(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors">
              <span className="text-white text-sm font-bold">×</span>
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-white/10 hover:border-primary/30 cursor-pointer transition-colors" data-testid="photo-upload-area">
            <Camera className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload photo of the item</span>
            <span className="text-xs text-muted-foreground/50 mt-1">JPG, PNG up to 10MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
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
        onClick={() => onScan(
          { search_type: 'photo', image_base64: image, category: category && category !== 'any' ? category : undefined },
          imagePreview
        )}
        disabled={!image || loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase tracking-wide h-11"
        data-testid="photo-scan-btn"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanSearch className="w-4 h-4 mr-2" />}
        Scan Against Database
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


function ScoreBox({ label, value, weight }) {
  const pct = Math.round(value * 100);
  const color = pct > 70 ? 'text-red-400' : pct > 30 ? 'text-amber-400' : 'text-emerald-400';
  const bgColor = pct > 70 ? 'bg-red-500' : pct > 30 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-background/50 rounded-lg p-3 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground/50">{weight}</span>
      </div>
      <p className={`text-xl font-mono font-bold ${color}`}>{pct}%</p>
      <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${bgColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
