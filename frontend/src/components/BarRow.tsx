interface Bar { label: string; value: number; color?: string; }

export default function BarRow({ data }: { data: Bar[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex justify-between text-xs text-navy-500 mb-1">
            <span className="capitalize">{d.label.replace('_', ' ')}</span>
            <span className="font-semibold text-navy-900">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? '#1e3a8a' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
