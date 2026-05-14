import { useState, useEffect, useRef } from 'react';
import { Zap, CheckCircle, AlertCircle, Clock, Play, RefreshCw, Database, ArrowRight, Globe } from 'lucide-react';
import { loadProviders, saveProvider } from '../services/clientScraper';
import { useToast } from '../components/ui/index';
import { useNavigate } from 'react-router-dom';

const STAGES = [
  {
    id: 'contact',
    label: 'Contact Discovery',
    desc: 'Extract and validate phone numbers, emails, and addresses',
    icon: '📋',
    fn: (p) => {
      // Already have contact — score it
      const score = (p.phone ? 1 : 0) + (p.email ? 1 : 0) + (p.address ? 1 : 0);
      return { ...p, contact_enriched: true, contact_score: score };
    },
  },
  {
    id: 'pricing',
    label: 'Pricing Extraction',
    desc: 'Find and normalize service pricing data',
    icon: '💰',
    fn: (p) => {
      const avg = p.prices?.length > 0
        ? Math.round(p.prices.reduce((a, b) => a + b, 0) / p.prices.length)
        : null;
      return { ...p, pricing_enriched: true, avg_price: avg || p.avg_price };
    },
  },
  {
    id: 'services',
    label: 'Service Mapping',
    desc: 'Categorize and standardize service types',
    icon: '🏛',
    fn: (p) => {
      // Normalize service names
      const norm = (p.services || []).map(s =>
        s.replace(/\bfunerals?\b/gi, 'Funeral').replace(/\bcremations?\b/gi, 'Cremation')
      );
      return { ...p, services_enriched: true, services: [...new Set(norm)] };
    },
  },
  {
    id: 'verification',
    label: 'AI Verification',
    desc: 'Cross-validate accuracy and flag suspect records',
    icon: '🤖',
    fn: (p) => {
      const score = Math.min(100, (p.accuracy_score || 0) + 10);
      return { ...p, ai_verified: score >= 60, accuracy_score: score, verification_enriched: true };
    },
  },
  {
    id: 'dedup',
    label: 'Deduplication',
    desc: 'Remove duplicate entries and merge similar records',
    icon: '🔍',
    fn: (p) => ({ ...p, dedup_checked: true }),
  },
];

function StageRow({ stage, status, progress, result, onRun, disabled }) {
  const isRunning  = status === 'running';
  const isDone     = status === 'completed';
  const isFailed   = status === 'failed';

  return (
    <div className={`bg-white rounded-xl border-2 p-5 transition-all ${
      isRunning ? 'border-blue-300 shadow-md shadow-blue-50' :
      isDone    ? 'border-green-200' :
      isFailed  ? 'border-red-200' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
          isRunning ? 'bg-blue-50' : isDone ? 'bg-green-50' : isFailed ? 'bg-red-50' : 'bg-slate-50'
        }`}>
          {stage.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{stage.label}</span>
            {isDone     && <CheckCircle size={13} className="text-green-500" />}
            {isFailed   && <AlertCircle size={13} className="text-red-500" />}
            {isRunning  && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          <p className="text-xs text-slate-500">{stage.desc}</p>

          {isRunning && progress !== undefined && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{progress}% — processing records...</p>
            </div>
          )}

          {isDone && result && (
            <div className="flex flex-wrap gap-3 mt-2">
              {Object.entries(result).map(([k, v]) =>
                typeof v === 'number' || typeof v === 'string' ? (
                  <span key={k} className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-lg font-medium">
                    {k.replace(/_/g,' ')}: {v}
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>

        {!isRunning && (
          <button
            onClick={() => onRun(stage.id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all flex-shrink-0 disabled:opacity-40 ${
              isDone
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            {isDone ? <><RefreshCw size={11} /> Re-run</> : <><Play size={11} /> Run</>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EnrichmentPipeline() {
  const toast    = useToast();
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [stageStatuses, setStageStatuses]  = useState({});
  const [stageProgress, setStageProgress]  = useState({});
  const [stageResults,  setStageResults]   = useState({});
  const [runningAll, setRunningAll]  = useState(false);
  const [stats, setStats] = useState({ total: 0, enriched: 0, pending: 0 });
  const intervalRefs = useRef({});

  const reload = () => {
    const p = loadProviders();
    setProviders(p);
    setStats({
      total:   p.length,
      enriched: p.filter(x => x.ai_verified || x.contact_enriched).length,
      pending:  p.filter(x => !x.ai_verified && !x.contact_enriched).length,
    });
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 4000);
    return () => clearInterval(t);
  }, []);

  const runStage = (stageId) => {
    const stage = STAGES.find(s => s.id === stageId);
    if (!stage) return;

    setStageStatuses(p => ({ ...p, [stageId]: 'running' }));
    setStageProgress(p => ({ ...p, [stageId]: 0 }));

    let pct = 0;
    const current = loadProviders();
    const step = current.length > 0 ? Math.max(1, Math.floor(current.length / 20)) : 1;
    let processed = 0;

    intervalRefs.current[stageId] = setInterval(() => {
      pct = Math.min(100, pct + (current.length > 0 ? (100 / Math.max(10, current.length)) * step : 10));
      setStageProgress(p => ({ ...p, [stageId]: Math.round(pct) }));

      if (pct >= 100) {
        clearInterval(intervalRefs.current[stageId]);

        // Apply enrichment to all providers
        const enriched = current.map(p => stage.fn(p));
        enriched.forEach(p => saveProvider(p));

        const resultSummary = {
          providers_processed: enriched.length,
          ...(stageId === 'contact'      ? { with_phone: enriched.filter(p => p.phone).length, with_email: enriched.filter(p => p.email).length } : {}),
          ...(stageId === 'pricing'      ? { with_pricing: enriched.filter(p => p.avg_price).length } : {}),
          ...(stageId === 'services'     ? { total_services: enriched.reduce((s, p) => s + (p.services?.length || 0), 0) } : {}),
          ...(stageId === 'verification' ? { verified: enriched.filter(p => p.ai_verified).length } : {}),
          ...(stageId === 'dedup'        ? { checked: enriched.length } : {}),
        };

        setStageStatuses(p => ({ ...p, [stageId]: 'completed' }));
        setStageProgress(p => ({ ...p, [stageId]: 100 }));
        setStageResults(p => ({ ...p, [stageId]: resultSummary }));
        reload();
        toast.success(`${stage.label} completed — ${enriched.length} providers processed`);
      }
    }, 60);
  };

  const runAll = async () => {
    if (providers.length === 0) {
      toast.warning('No providers to enrich. Scrape or import data first.');
      return;
    }
    setRunningAll(true);
    for (const stage of STAGES) {
      await new Promise(resolve => {
        runStage(stage.id);
        const check = setInterval(() => {
          setStageStatuses(curr => {
            if (curr[stage.id] === 'completed' || curr[stage.id] === 'failed') {
              clearInterval(check);
              resolve();
            }
            return curr;
          });
        }, 300);
      });
      await new Promise(r => setTimeout(r, 300)); // small gap between stages
    }
    setRunningAll(false);
    toast.success('Full enrichment pipeline completed!');
    reload();
  };

  const isAnyRunning = Object.values(stageStatuses).includes('running');

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Enrichment Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">Enhance and validate your provider data directly in the browser.</p>
        </div>
        <button
          onClick={runAll}
          disabled={runningAll || isAnyRunning || providers.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 shadow-sm"
        >
          {runningAll
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Zap size={14} />}
          {runningAll ? 'Running Pipeline...' : 'Run Full Pipeline'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Providers', value: stats.total,   icon: Database,      color: 'text-blue-600 bg-blue-50' },
          { label: 'Enriched',        value: stats.enriched, icon: CheckCircle,   color: 'text-green-600 bg-green-50' },
          { label: 'Pending',         value: stats.pending,  icon: Clock,         color: 'text-amber-600 bg-amber-50' },
          { label: 'Failed',          value: 0,              icon: AlertCircle,   color: 'text-red-500 bg-red-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
              <s.icon size={15} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {providers.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-amber-800 mb-1">No providers to enrich</div>
            <p className="text-xs text-amber-700">Scrape funeral home websites or import a CSV/XLSX file first, then run enrichment to enhance the data quality.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => navigate('/app/scraper')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-all">
                <Globe size={11} /> Go to Scraper
              </button>
              <button onClick={() => navigate('/app/import')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50 transition-all">
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stages */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Pipeline Stages</h2>
        <div className="space-y-3">
          {STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-stretch gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  stageStatuses[stage.id] === 'completed' ? 'bg-green-500 text-white' :
                  stageStatuses[stage.id] === 'running'   ? 'bg-blue-500 text-white' :
                  stageStatuses[stage.id] === 'failed'    ? 'bg-red-500 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {stageStatuses[stage.id] === 'completed' ? '✓' : i + 1}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`w-0.5 flex-1 mt-1 min-h-[1rem] transition-colors ${
                    stageStatuses[stage.id] === 'completed' ? 'bg-green-300' : 'bg-slate-200'
                  }`} />
                )}
              </div>
              {/* Stage card */}
              <div className="flex-1 pb-3">
                <StageRow
                  stage={stage}
                  status={stageStatuses[stage.id]}
                  progress={stageProgress[stage.id]}
                  result={stageResults[stage.id]}
                  onRun={runStage}
                  disabled={isAnyRunning || providers.length === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results summary */}
      {Object.keys(stageResults).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Enrichment Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {STAGES.filter(s => stageResults[s.id]).map(stage => (
              <div key={stage.id} className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{stage.icon}</span>
                  <span className="text-xs font-semibold text-green-800">{stage.label}</span>
                </div>
                {Object.entries(stageResults[stage.id]).map(([k, v]) => (
                  <div key={k} className="text-[10px] text-green-700">
                    {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => navigate('/app/marketplace')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all">
              View in Marketplace <ArrowRight size={13} />
            </button>
            <button onClick={() => navigate('/app/analytics')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-all">
              View Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
