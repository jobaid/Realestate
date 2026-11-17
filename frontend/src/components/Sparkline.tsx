interface Point { date: string; count: number; }

export default function Sparkline({ data, height = 100 }: { data: Point[]; height?: number }) {
  if (data.length === 0) return <div className="text-sm text-navy-400">No data yet.</div>;
  const w = 800;
  const h = height;
  const max = Math.max(1, ...data.map((p) => p.count));
  const n = data.length;
  const stepX = w / Math.max(1, n - 1);

  const points = data.map((p, i) => [i * stepX, h - (p.count / max) * (h - 12) - 4] as const);
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;

  const first = data[0]?.date;
  const last = data[n - 1]?.date;
  const total = data.reduce((s, p) => s + p.count, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-2">
        <div className="text-navy-900 font-semibold text-2xl">{total}</div>
        <div className="text-navy-400 text-xs">{first} → {last}</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-24">
        <defs>
          <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={path} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
