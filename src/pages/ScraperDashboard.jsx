import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play, RotateCcw, Plus, Download, X, Clock, Database,
  Activity, CheckCircle, AlertTriangle, Globe, RefreshCw,
  ExternalLink, ChevronDown, ChevronUp, Wifi, WifiOff, Info
} from 'lucide-react';
import { scrapeURL, saveProvider, saveJob, loadJobs, clearJob } from '../services/clientScraper';
import { useToast } from '../components/ui/index';

const STATUS_STYLE = {
  running:   'bg-blue-100 text-blue-700 border-blue-200',
  queued:    'bg-slate-100 text-slate-600 border-slate-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed:    'bg-red-100 text-red-700 border-red-200',
  partial:   'bg-amber-100 text-amber-700 border-amber-200',
};

function JobCard({ job, onCancel, onExpand, expanded }) {
  const pct = job.progress || 0;
  const isPartial = job.status === 'partial';

  return (
    <div className={`bg-white rounded-xl border-2 p-4 transition-all ${
      job.status === 'running'   ? 'border-blue-200 shadow-md shadow-blue-50/50' :
      job.status === 'completed' ? 'border-green-200' :
      job.status === 'partial'   ? 'border-amber-200' :
      job.status === 'failed'    ? 'border-red-200' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          job.status === 'running'   ? 'bg-blue-600' :
          job.status === 'completed' ? 'bg-green-100' :
          job.status === 'partial'   ? 'bg-amber-100' :
          job.status === 'failed'    ? 'bg-red-100' : 'bg-slate-100'
        }`}>
          {job.status === 'running'   ? <RotateCcw size={14} className="text-white animate-spin" style={{animationDuration:'2s'}} /> :
           job.status === 'completed' ? <CheckCircle size={14} className="text-green-600" /> :
           job.status === 'partial'   ? <AlertTriangle size={14} className="text-amber-500" /> :
           job.status === 'failed'    ? <WifiOff size={14} className="text-red-500" /> :
                                        <Clock size={14} className="text-slate-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 truncate">{job.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${STATUS_STYLE[job.status] || STATUS_STYLE.queued}`}>
              {job.status}
            </span>
            {job.data?.accuracy_score > 0 && job.status !== 'running' && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                job.data.accuracy_score >= 60 ? 'bg-green-50 text-green-600' :
                job.data.accuracy_score >= 30 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {job.data.accuracy_score}% accuracy
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-mono truncate max-w-sm">{job.url}</span>
            <a href={job.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>
              <ExternalLink size={10} className="text-slate-300 hover:text-blue-500 flex-shrink-0" />
            </a>
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {(job.status === 'completed' || job.status === 'partial') && job.data && (
            <button onClick={() => onExpand(job.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
            </button>
          )}
          {job.status !== 'running' && (
            <button onClick={() => onCancel(job.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors">
              <X size={13}/>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              job.status === 'failed'    ? 'bg-red-500' :
              job.status === 'completed' ? 'bg-green-500' :
              job.status === 'partial'   ? 'bg-amber-400' : 'bg-blue-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className="text-slate-400 truncate flex-1">{job.step || ''}</span>
          <span className="font-mono text-slate-400 flex-shrink-0 ml-2">{pct}%</span>
        </div>
      </div>

      {/* Partial warning */}
      {isPartial && (
        <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <Info size={11} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <p className="text-[10px] text-amber-700 leading-relaxed">
            {job.error || 'Site blocked proxy access. Basic info extracted from URL. Try a different URL or check the site manually.'}
          </p>
        </div>
      )}

      {/* Expanded extracted data */}
      {expanded && job.data && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Name',     value: job.data.name },
              { label: 'Phone',    value: job.data.phone },
              { label: 'Email',    value: job.data.email },
              { label: 'Location', value: [job.data.city, job.data.state].filter(Boolean).join(', ') || null },
              { label: 'Services', value: job.data.services?.slice(0,3).join(', ') || null },
              { label: 'Avg Price',value: job.data.avg_price ? `$${job.data.avg_price.toLocaleString()}` : null },
            ].map(({label, value}) => value ? (
              <div key={label} className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
                <div className="text-xs text-slate-700 font-medium truncate mt-0.5">{value}</div>
              </div>
            ) : null)}
          </div>
          {job.data.website && (
            <a href={job.data.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:underline">
              <ExternalLink size={9}/> Open {job.data.website.replace(/^https?:\/\/(www\.)?/,'')}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function LogRow({ log }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error:   'bg-red-50 border-red-200 text-red-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-100 text-blue-700',
  };
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${styles[log.type] || styles.info}`}>
      <span className="font-mono text-[10px] opacity-60 flex-shrink-0 pt-0.5">{log.time}</span>
      <span className="flex-1 leading-relaxed break-all">{log.message}</span>
    </div>
  );
}

export default function ScraperDashboard() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [url, setUrl]           = useState('');
  const [jobName, setJobName]   = useState('');
  const [jobType, setJobType]   = useState('standard');
  const [jobs, setJobs]         = useState([]);
  const [logs, setLogs]         = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [expandedJob, setExpandedJob] = useState(null);

  // Auto-fill URL from query param (from Dashboard quick-scrape)
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) { setUrl(urlParam); setShowForm(true); }
  }, [searchParams]);

  // Load persisted jobs
  useEffect(() => { setJobs(loadJobs()); }, []);

  const addLog = useCallback((message, type = 'info') => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }),
      message, type,
    }, ...prev].slice(0, 150));
  }, []);

  const updateJob = useCallback((id, updates) => {
    setJobs(prev => {
      const next = prev.map(j => j.id === id ? { ...j, ...updates } : j);
      const job  = next.find(j => j.id === id);
      if (job) saveJob(job);
      return next;
    });
  }, []);

  const handleLaunch = async () => {
    const trimmed = url.trim();
    if (!trimmed) { toast.warning('Please enter a URL'); return; }

    let finalUrl = trimmed;
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
    try { new URL(finalUrl); } catch { toast.error('Invalid URL format'); return; }

    const parsedHost = new URL(finalUrl).hostname;
    const name       = jobName.trim() || parsedHost.replace('www.', '');

    const job = {
      id: 'job_' + Date.now(),
      name, url: finalUrl, type: jobType,
      status: 'running', progress: 0,
      step: 'Initialising...', data: null, error: null,
      created_at: new Date().toISOString(),
    };

    setJobs(prev => [job, ...prev]);
    saveJob(job);
    setShowForm(false);
    setUrl('');
    setJobName('');
    setLaunching(false);
    addLog(`Started: ${finalUrl}`, 'info');

    // Progress animation stages
    const stages = [
      { step: 'Connecting via proxy network (8 endpoints)...', pct: 12 },
      { step: 'Fetching page HTML...', pct: 30 },
      { step: 'Parsing document structure...', pct: 48 },
      { step: 'Extracting contact information...', pct: 62 },
      { step: 'Detecting services & pricing...', pct: 78 },
      { step: 'Analysing data quality...', pct: 90 },
      { step: 'Finalising...', pct: 96 },
    ];

    let stageIdx = 0;
    const progressTimer = setInterval(() => {
      if (stageIdx < stages.length) {
        const s = stages[stageIdx++];
        updateJob(job.id, { progress: s.pct, step: s.step });
        addLog(s.step, 'info');
      }
    }, 900);

    try {
      const result = await scrapeURL(finalUrl, {
        onProgress: (msg) => addLog(msg, 'info'),
      });
      clearInterval(progressTimer);

      if (result.success) {
        // Full success
        saveProvider(result.data);
        updateJob(job.id, {
          status: 'completed', progress: 100,
          step: `Extracted: ${result.data.name}`,
          data: result.data,
        });
        addLog(`✓ SUCCESS: ${result.data.name}`, 'success');
        if (result.data.phone) addLog(`  📞 Phone: ${result.data.phone}`, 'success');
        if (result.data.email) addLog(`  📧 Email: ${result.data.email}`, 'success');
        if (result.data.city || result.data.state) addLog(`  📍 Location: ${[result.data.city, result.data.state].filter(Boolean).join(', ')}`, 'success');
        if (result.data.services?.length) addLog(`  🏛 Services: ${result.data.services.slice(0,3).join(', ')}`, 'success');
        addLog(`  📊 Accuracy score: ${result.data.accuracy_score}%`, 'info');
        setExpandedJob(job.id);
        toast.success(`Scraped ${result.data.name} — ${result.data.accuracy_score}% accuracy`);

      } else if (result.partial) {
        // Partial success — save what we got
        saveProvider(result.data);
        updateJob(job.id, {
          status: 'partial', progress: 100,
          step: 'Partial data only — site blocked proxies',
          data: result.data, error: result.error,
        });
        addLog(`⚠ PARTIAL: ${result.error}`, 'warning');
        addLog(`  Saved basic info for: ${result.data.name}`, 'warning');
        toast.warning(`Partial scrape: ${result.data.name} — site has anti-scraping protection`);

      } else {
        updateJob(job.id, {
          status: 'failed', progress: 100,
          step: result.error || 'Failed', error: result.error,
        });
        addLog(`✗ FAILED: ${result.error}`, 'error');
        toast.error(`Scrape failed: ${result.error}`);
      }
    } catch (err) {
      clearInterval(progressTimer);
      updateJob(job.id, {
        status: 'failed', progress: 100,
        step: err.message || 'Unknown error', error: err.message,
      });
      addLog(`✗ Error: ${err.message}`, 'error');
      toast.error(err.message || 'Scrape failed');
    }
  };

  const handleCancel = (id) => {
    clearJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
    if (expandedJob === id) setExpandedJob(null);
  };

  const handleExport = () => {
    const data = jobs.filter(j => j.data).map(j => j.data);
    if (!data.length) { toast.warning('No results to export'); return; }
    const header = 'name,url,phone,email,address,city,state,services,avg_price,accuracy_score';
    const rows = data.map(d => [
      `"${(d.name||'').replace(/"/g,'')}"`, d.url||'', d.phone||'', d.email||'',
      `"${(d.address||'').replace(/"/g,'')}"`, d.city||'', d.state||'',
      `"${(d.services||[]).join('; ')}"`, d.avg_price||'', d.accuracy_score||0,
    ].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scrape_results_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success('Exported to CSV');
  };

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.type === logFilter);
  const activeJobs    = jobs.filter(j => j.status === 'running');
  const completedJobs = jobs.filter(j => j.status !== 'running');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scraper Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Extract funeral home data from any website.</p>
        </div>
        <div className="flex gap-2">
          {jobs.some(j => j.data) && (
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all">
              <Download size={13}/> Export CSV
            </button>
          )}
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm">
            <Plus size={14}/> New Job
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Wifi size={14} className="text-blue-600 flex-shrink-0 mt-0.5"/>
        <div className="text-xs text-blue-800 leading-relaxed">
          <strong>Client-side scraper</strong> — fetches pages through 8 CORS proxy endpoints with automatic fallback. Some sites block all proxies (Cloudflare, heavy JS sites). Results are saved locally and appear in Marketplace instantly.
          <span className="text-blue-600 font-medium"> Partial data is still saved</span> when a site partially blocks access.
        </div>
      </div>

      {/* New Job Form */}
      {showForm && (
        <div className="bg-white rounded-xl border-2 border-blue-300 p-5 shadow-sm animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Launch New Scrape Job</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <X size={14} className="text-slate-400"/>
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Target URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  type="url"
                  placeholder="https://funeralhome.com"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLaunch()}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Best results on sites without Cloudflare protection · Include full URL with https://</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Job Name (optional)</label>
                <input type="text" placeholder="e.g. Smith Funeral Home" value={jobName}
                  onChange={e => setJobName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Data Focus</label>
                <select value={jobType} onChange={e => setJobType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all">
                  <option value="standard">Standard (All Data)</option>
                  <option value="contact">Contact Info</option>
                  <option value="pricing">Pricing</option>
                  <option value="services">Services</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleLaunch} disabled={!url.trim() || launching}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 shadow-sm">
              {launching
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <Play size={13}/>}
              {launching ? 'Launching...' : 'Launch Job'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Jobs list */}
        <div className="lg:col-span-3 space-y-5">
          {/* Active */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Active ({activeJobs.length})</h2>
            {activeJobs.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Activity size={22} className="text-slate-300 mx-auto mb-2"/>
                <p className="text-sm font-medium text-slate-500 mb-1">No active jobs</p>
                <p className="text-xs text-slate-400 mb-3">Click "New Job" to start scraping</p>
                <button onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all">
                  <Plus size={13}/> New Job
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map(job => (
                  <JobCard key={job.id} job={job} onCancel={handleCancel}
                    onExpand={id => setExpandedJob(e => e === id ? null : id)}
                    expanded={expandedJob === job.id}/>
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          {completedJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Results ({completedJobs.length})
                <span className="ml-2 text-[10px] font-normal text-slate-400">
                  {completedJobs.filter(j=>j.status==='completed').length} success ·
                  {completedJobs.filter(j=>j.status==='partial').length} partial ·
                  {completedJobs.filter(j=>j.status==='failed').length} failed
                </span>
              </h2>
              <div className="space-y-3">
                {completedJobs.map(job => (
                  <JobCard key={job.id} job={job} onCancel={handleCancel}
                    onExpand={id => setExpandedJob(e => e === id ? null : id)}
                    expanded={expandedJob === job.id}/>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Extraction Log */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col sticky top-4" style={{maxHeight:'72vh'}}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-slate-900">Extraction Log</h2>
              <div className="flex gap-1">
                {['all','info','success','warning','error'].map(f => (
                  <button key={f} onClick={() => setLogFilter(f)}
                    className={`px-2 py-1 text-[10px] rounded-md font-medium transition-all capitalize ${
                      logFilter === f ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
              {filteredLogs.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-center">
                  <Database size={20} className="text-slate-300 mb-2"/>
                  <p className="text-xs text-slate-400">Logs appear here during scraping</p>
                </div>
              ) : filteredLogs.map(log => <LogRow key={log.id} log={log}/>)}
            </div>
            {logs.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] text-slate-400">{filteredLogs.length} entries</span>
                <button onClick={() => setLogs([])} className="text-[10px] text-red-400 hover:text-red-600">Clear</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
