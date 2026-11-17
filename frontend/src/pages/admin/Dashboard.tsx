import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Home, Mail, DollarSign, TrendingUp, AlertCircle,
} from 'lucide-react';
import { getStats, getInquiriesDaily, getRecentActivity } from '../../lib/adminStats';
import Sparkline from '../../components/Sparkline';
import BarRow from '../../components/BarRow';

const fmtMoney = (n: number) => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000
  ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n}`;

function KPI({
  icon: Icon, label, value, accent = 'text-navy-900', sub,
}: { icon: any; label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-navy-100 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-navy-500">{label}</span>
        <Icon size={16} className="text-accent-600" />
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-navy-400">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: getStats });
  const daily = useQuery({ queryKey: ['admin-daily'], queryFn: getInquiriesDaily });
  const activity = useQuery({ queryKey: ['admin-activity'], queryFn: getRecentActivity });

  if (stats.isLoading) return <p className="text-navy-500 text-sm">Loading…</p>;
  if (!stats.data) return <p className="text-red-600 text-sm">Could not load stats.</p>;

  const s = stats.data;
  const propsBars = [
    { label: 'available', value: s.properties.available, color: '#f97316' },
    { label: 'pending', value: s.properties.pending, color: '#f59e0b' },
    { label: 'sold', value: s.properties.sold, color: '#0f172a' },
    { label: 'rented', value: s.properties.rented, color: '#0f172a' },
    { label: 'draft', value: s.properties.draft, color: '#94a3b8' },
    { label: 'off_market', value: s.properties.off_market, color: '#94a3b8' },
  ].filter((b) => b.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-navy-900">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Building2} label="Total properties" value={s.properties.total}
          sub={`${s.properties.published} published`} />
        <KPI icon={Home} label="Available" value={s.properties.available}
          sub={`${s.properties.featured} featured`} accent="text-accent-700" />
        <KPI icon={Mail} label="New inquiries" value={s.inquiries.new}
          sub={`${s.inquiries.last_7d} in last 7 days`} accent="text-emerald-700" />
        <KPI icon={DollarSign} label="Active listing value"
          value={fmtMoney(s.properties.value_active)}
          sub="Sum of available listings" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-xl bg-white ring-1 ring-navy-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-accent-600" />
            <h2 className="font-semibold text-navy-900">Inquiries — last 30 days</h2>
          </div>
          {daily.data ? <Sparkline data={daily.data} /> : <p className="text-navy-500 text-sm">Loading…</p>}
        </section>

        <section className="rounded-xl bg-white ring-1 ring-navy-100 p-6">
          <h2 className="font-semibold text-navy-900 mb-4">Properties by status</h2>
          {propsBars.length > 0 ? <BarRow data={propsBars} /> : <p className="text-navy-400 text-sm">No properties yet.</p>}
        </section>
      </div>

      <section className="rounded-xl bg-white ring-1 ring-navy-100 p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-accent-600" />
          <h2 className="font-semibold text-navy-900">Recent activity</h2>
        </div>
        {activity.data && activity.data.length > 0 ? (
          <ul className="divide-y divide-navy-50 text-sm">
            {activity.data.map((a, i) => (
              <li key={i} className="py-2.5 flex justify-between gap-4">
                <span className="text-navy-800">
                  <span className="font-medium capitalize">{a.action.replace('_', ' ')}</span>{' '}
                  {a.entity && <span className="text-navy-500">{a.entity}</span>}
                  {a.user_email && <span className="text-navy-400 ml-2">by {a.user_email}</span>}
                </span>
                <span className="text-xs text-navy-400 whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-navy-400 text-sm">No activity yet.</p>}
        <Link to="/admin/inquiries" className="inline-block mt-3 text-xs text-accent-700 hover:underline">
          View all inquiries →
        </Link>
      </section>
    </div>
  );
}
