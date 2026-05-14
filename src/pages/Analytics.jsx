import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Database, Shield, Activity, RefreshCw, Download } from 'lucide-react';
import { loadProviders, loadJobs } from '../services/clientScraper';
import { loadBatches } from '../services/clientImport';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#2563eb','#16a34a','#9333ea','#ca8a04','#dc2626','#0891b2','#d97706'];

function StatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    blue:   'text-blue-600 bg-blue-50 border-blue-100',
    green:  'text-green-600 bg-green-50 border-green-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    amber:  'text-amber-600 bg-amber-50 border-amber-100',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colors[color]}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function EmptyChart({ label, sub }) {
  return (
    <div className="h-52 flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
        <Activity size={18} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-300 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Build analytics from localStorage data ────────────────────────────────────
function buildAnalytics() {
  const providers = loadProviders();
  const jobs      = loadJobs();
  const batches   = loadBatches();

  // KPIs
  const totalProviders  = providers.length;
  const scraped         = providers.filter(p => !p.imported).length;
  const imported        = providers.filter(p => p.imported).length;
  const verified        = providers.filter(p => p.ai_verified).length;
  const avgAccuracy     = totalProviders > 0
    ? Math.round(providers.reduce((s, p) => s + (p.accuracy_score || 0), 0) / totalProviders)
    : 0;
  const completedJobs   = jobs.filter(j => j.status === 'completed').length;
  const failedJobs      = jobs.filter(j => j.status === 'failed').length;
  const successRate     = jobs.length > 0
    ? Math.round((completedJobs / jobs.length) * 100)
    : 0;

  // Providers by state
  const stateMap = {};
  providers.forEach(p => {
    if (p.state) stateMap[p.state] = (stateMap[p.state] || 0) + 1;
  });
  const byState = Object.entries(stateMap)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Services breakdown
  const serviceMap = {};
  providers.forEach(p => {
    (p.services || []).forEach(s => {
      const key = s.length > 20 ? s.slice(0, 20) + '…' : s;
      serviceMap[key] = (serviceMap[key] || 0) + 1;
    });
  });
  const byService = Object.entries(serviceMap)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Scraping activity over time (last 14 days)
  const dayMap = {};
  const now = Date.now();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    dayMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
  }
  jobs.filter(j => j.status === 'completed' && j.created_at).forEach(j => {
    const d = new Date(j.created_at);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dayMap[key] !== undefined) dayMap[key]++;
  });
  // Also count imports
  batches.filter(b => b.status === 'completed' && b.date).forEach(b => {
    const key = new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dayMap[key] !== undefined) dayMap[key] += (b.records || 0);
  });
  const trend = Object.entries(dayMap).map(([date, records]) => ({ date, records }));

  // Accuracy distribution
  const accDist = [
    { range: '0–25%',  count: providers.filter(p => (p.accuracy_score||0) < 25).length  },
    { range: '25–50%', count: providers.filter(p => (p.accuracy_score||0) >= 25 && (p.accuracy_score||0) < 50).length },
    { range: '50–75%', count: providers.filter(p => (p.accuracy_score||0) >= 50 && (p.accuracy_score||0) < 75).length },
    { range: '75–100%',count: providers.filter(p => (p.accuracy_score||0) >= 75).length  },
  ].filter(d => d.count > 0);

  return {
    totalProviders, scraped, imported, verified, avgAccuracy,
    completedJobs, failedJobs, successRate,
    byState, byService, trend, accDist,
    totalJobs: jobs.length, totalBatches: batches.length,
  };
}

export default function Analytics() {
  const [data, setData] = useState(() => buildAnalytics());

  const refresh = useCallback(() => setData(buildAnalytics()), []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleExport = () => {
    const providers = loadProviders();
    if (!providers.length) return;
    const csv = [
      'name,city,state,phone,email,website,services,accuracy_score,ai_verified,scraped_at',
      ...providers.map(p => [
        `"${p.name||''}"`, p.city||'', p.state||'', p.phone||'', p.email||'',
        p.website||'', `"${(p.services||[]).join('; ')}"`,
        p.accuracy_score||0, p.ai_verified||false, p.scraped_at||'',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `funeral_intel_analytics_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const isEmpty = data.totalProviders === 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time insights from your local provider database.</p>
        </div>
        <div className="flex gap-2">
          {data.totalProviders > 0 && (
            <button onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all">
              <Download size={13} /> Export CSV
            </button>
          )}
          <button onClick={refresh}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
          <strong>No data yet</strong> — scrape some funeral home URLs or import a CSV/XLSX file to see analytics here. All charts update automatically as you add data.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Providers" value={data.totalProviders.toLocaleString()} icon={Database} color="blue"
          sub={`${data.scraped} scraped · ${data.imported} imported`} />
        <StatCard label="AI Verified" value={data.verified.toLocaleString()} icon={Shield} color="green"
          sub={data.totalProviders > 0 ? `${Math.round((data.verified/data.totalProviders)*100)}% of total` : 'no data'} />
        <StatCard label="Avg Accuracy" value={data.avgAccuracy > 0 ? `${data.avgAccuracy}%` : '—'} icon={TrendingUp} color="purple"
          sub="data quality score" />
        <StatCard label="Scrape Success Rate" value={data.totalJobs > 0 ? `${data.successRate}%` : '—'} icon={Activity} color="amber"
          sub={`${data.completedJobs} ok · ${data.failedJobs} failed`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Scraping Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Activity (Last 14 Days)</h2>
          {data.trend.every(d => d.records === 0)
            ? <EmptyChart label="No activity yet" sub="Scrape URLs or import files to see data" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="records" stroke="#2563eb" fill="url(#blueGrad)" strokeWidth={2} name="Records" />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* By State */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Providers by State</h2>
          {data.byState.length === 0
            ? <EmptyChart label="No geographic data yet" sub="State info is extracted during scraping" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byState}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4,4,0,0]} name="Providers" />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Services Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Top Service Types</h2>
          {data.byService.length === 0
            ? <EmptyChart label="No service data yet" sub="Services are detected during scraping" />
            : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={190}>
                  <PieChart>
                    <Pie data={data.byService} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="count" paddingAngle={2}>
                      {data.byService.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val, name, props) => [val, props.payload.service]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 overflow-hidden">
                  {data.byService.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-600 truncate">{s.service}</span>
                      </div>
                      <span className="font-bold text-slate-800 flex-shrink-0">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Accuracy Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Accuracy Distribution</h2>
          {data.accDist.length === 0
            ? <EmptyChart label="No accuracy data" sub="Will populate as you scrape providers" />
            : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.accDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Providers" radius={[4,4,0,0]}>
                      {data.accDist.map((entry, i) => {
                        const colors = ['#dc2626','#f59e0b','#3b82f6','#16a34a'];
                        return <Cell key={i} fill={colors[i % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {data.accDist.map((d, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-2">
                      <div className="text-sm font-bold text-slate-900">{d.count}</div>
                      <div className="text-[10px] text-slate-400">{d.range}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </div>

      {/* Summary table */}
      {!isEmpty && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Platform Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Providers',   value: data.totalProviders },
              { label: 'Scraped via Web',   value: data.scraped },
              { label: 'Imported from File', value: data.imported },
              { label: 'AI Verified',       value: data.verified },
              { label: 'Avg Data Accuracy', value: `${data.avgAccuracy}%` },
              { label: 'Total Scrape Jobs', value: data.totalJobs },
              { label: 'Successful Jobs',   value: data.completedJobs },
              { label: 'Import Batches',    value: data.totalBatches },
            ].map((row, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="text-lg font-bold text-slate-900">{typeof row.value === 'number' ? row.value.toLocaleString() : row.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{row.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
