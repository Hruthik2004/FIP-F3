import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, Target, Shield, Plus, Globe, ArrowRight, TrendingUp, Database, Upload } from 'lucide-react';
import { loadProviders, loadJobs } from '../services/clientScraper';
import { loadBatches } from '../services/clientImport';
import { useAuth } from '../hooks/useAuth';

function StatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colors[color]}`}>
          <Icon size={15}/>
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ providers: 0, scraped: 0, imported: 0, avgAccuracy: 0 });
  const [jobs, setJobs] = useState([]);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const providers = loadProviders();
    const jobs = loadJobs();
    const batches = loadBatches();
    const scraped = providers.filter(p => !p.imported).length;
    const imported = providers.filter(p => p.imported).length;
    const avgAccuracy = providers.length > 0
      ? Math.round(providers.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / providers.length)
      : 0;
    setStats({ providers: providers.length, scraped, imported, avgAccuracy });
    setJobs(jobs.slice(0, 4));

    const interval = setInterval(() => {
      const prov = loadProviders();
      const j = loadJobs();
      setStats({
        providers: prov.length,
        scraped: prov.filter(p => !p.imported).length,
        imported: prov.filter(p => p.imported).length,
        avgAccuracy: prov.length > 0
          ? Math.round(prov.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / prov.length)
          : 0,
      });
      setJobs(j.slice(0, 4));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const handleQuickScrape = () => {
    if (!url.trim()) return;
    navigate(`/app/scraper?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Here's your platform overview.</p>
        </div>
        <button onClick={() => navigate('/app/scraper')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm">
          <Plus size={14}/> New Scrape
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Providers" value={stats.providers.toLocaleString()} icon={Database} color="blue"
          sub={stats.providers === 0 ? 'Start scraping to add providers' : 'in local database'}/>
        <StatCard label="Scraped" value={stats.scraped.toLocaleString()} icon={Globe} color="green"
          sub="via web scraper"/>
        <StatCard label="Imported" value={stats.imported.toLocaleString()} icon={Upload} color="purple"
          sub="via file upload"/>
        <StatCard label="Avg Accuracy" value={stats.avgAccuracy > 0 ? `${stats.avgAccuracy}%` : '—'} icon={Shield} color="amber"
          sub="data quality score"/>
      </div>

      {/* Quick scrape */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Scrape</h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              type="url"
              placeholder="https://funeral-home-website.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickScrape()}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            onClick={handleQuickScrape}
            disabled={!url.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-40 whitespace-nowrap shadow-sm"
          >
            <Activity size={14}/> Scrape
          </button>
        </div>
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent Jobs</h2>
          <button onClick={() => navigate('/app/scraper')} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            View all <ArrowRight size={11}/>
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Activity size={24} className="text-slate-300 mx-auto mb-2"/>
            <p className="text-sm font-medium text-slate-500 mb-1">No jobs yet</p>
            <p className="text-xs text-slate-400 mb-3">Launch your first scraping job to see results here</p>
            <button onClick={() => navigate('/app/scraper')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all">
              <Plus size={13}/> Start Scraping
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{job.name}</div>
                    <div className="text-xs text-slate-400 font-mono truncate max-w-xs">{job.url}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    job.status==='running'   ? 'bg-blue-100 text-blue-700' :
                    job.status==='completed' ? 'bg-green-100 text-green-700' :
                    job.status==='failed'    ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>{job.status}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${job.status==='completed' ? 'bg-green-500' : job.status==='failed' ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${job.progress || 0}%` }}
                  />
                </div>
                {job.data && (
                  <div className="text-xs text-green-600 mt-1.5 font-medium">
                    ✓ {job.data.name} · {job.data.accuracy_score || 0}% accuracy
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Marketplace', desc: 'Browse providers', to: '/app/marketplace', emoji: '🏛' },
          { label: 'Bulk Import', desc: 'Upload CSV/XLSX', to: '/app/import', emoji: '📁' },
          { label: 'AI Assistant', desc: 'Ask questions', to: '/app/assistant', emoji: '🤖' },
          { label: 'Analytics', desc: 'View insights', to: '/app/analytics', emoji: '📊' },
        ].map(item => (
          <button key={item.to} onClick={() => navigate(item.to)}
            className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="text-xl mb-2">{item.emoji}</div>
            <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{item.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
