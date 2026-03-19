export function TPSDisplay({ score, size = 'lg' }) {
  const getColor = () => {
    if (score <= 30) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', ring: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]', label: 'SAFE' };
    if (score <= 70) return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40', ring: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]', label: 'SUSPICIOUS' };
    return { text: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/40', ring: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', label: 'HIGH RISK' };
  };

  const c = getColor();
  const dims = size === 'lg' ? 'w-32 h-32' : size === 'md' ? 'w-20 h-20' : 'w-12 h-12';
  const textSize = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-base';
  const labelSize = size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <div className="flex flex-col items-center gap-2" data-testid="tps-display">
      <div className={`${dims} rounded-full ${c.bg} border-2 ${c.border} ${c.ring} flex flex-col items-center justify-center`}>
        <span className={`font-mono font-bold ${textSize} ${c.text}`} data-testid="tps-score">{score}</span>
        {size !== 'sm' && <span className={`${labelSize} font-bold tracking-wider ${c.text} opacity-70`}>TPS</span>}
      </div>
      {size === 'lg' && (
        <span className={`text-xs font-bold tracking-widest uppercase ${c.text}`} data-testid="tps-label">{c.label}</span>
      )}
    </div>
  );
}

export function TPSBadge({ score }) {
  const getStyle = () => {
    if (score <= 30) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (score <= 70) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-red-500/15 text-red-400 border-red-500/30';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold ${getStyle()}`} data-testid="tps-badge">
      TPS: {score}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const styles = {
    jewellery: 'bg-amber-500/15 text-amber-400',
    vehicle: 'bg-blue-500/15 text-blue-400',
    electronics: 'bg-violet-500/15 text-violet-400',
    other: 'bg-slate-500/15 text-slate-400',
  };

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${styles[category] || styles.other}`} data-testid="category-badge">
      {category}
    </span>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    active: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    recovered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    closed: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    new: 'bg-red-500/15 text-red-400 border-red-500/30',
    investigating: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dismissed: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wider ${styles[status] || styles.active}`} data-testid="status-badge">
      {status?.replace('_', ' ')}
    </span>
  );
}
