import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Star, ShieldCheck, MapPin, RefreshCw,
  Globe, Plus, Database, ExternalLink, Trash2
} from 'lucide-react';
import { loadProviders, deleteProvider } from '../services/clientScraper';
import { useToast } from '../components/ui/index';

const SERVICE_TYPES = ['Traditional Burial','Direct Cremation','Memorial Services','Eco Burial','Veteran Services','Pre-Planning','Cremation','Graveside Service'];
const STATES = ['All States','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function ProviderCard({ provider, onClick, onDelete }) {
  const initials = (provider.name || '??').slice(0, 2).toUpperCase();
  const score = provider.accuracy_score || 0;
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative"
      onClick={onClick}
    >
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(provider.id); }}
        className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 text-slate-400"
      >
        <Trash2 size={11}/>
      </button>

      {/* Header */}
      <div className="h-28 bg-gradient-to-br from-blue-50 via-slate-100 to-slate-200 relative flex items-center justify-center">
        <span className="text-4xl font-bold text-slate-300 select-none">{initials}</span>
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {provider.ai_verified && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-semibold text-blue-600 shadow-sm">
              <ShieldCheck size={9}/> Verified
            </div>
          )}
          {provider.imported && (
            <div className="flex items-center px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded-lg text-[10px] text-slate-500">
              Imported
            </div>
          )}
        </div>
        {provider.avg_price && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-sm rounded-lg text-xs font-bold text-white">
            ${provider.avg_price.toLocaleString()}+
          </div>
        )}
        {score > 0 && (
          <div className={`absolute bottom-2 left-2 text-[10px] font-bold px-1.5 py-0.5 bg-white/90 rounded-lg ${scoreColor}`}>
            {score}% accuracy
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
          {provider.name}
        </h3>
        {(provider.city || provider.state) && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
            <MapPin size={10}/>
            <span>{[provider.city, provider.state].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {provider.rating && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={10} className={i <= Math.round(provider.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}/>
              ))}
            </div>
            <span className="text-xs text-slate-500">{provider.rating}</span>
          </div>
        )}

        {provider.phone && (
          <div className="text-xs text-slate-400 mb-1 truncate">📞 {provider.phone}</div>
        )}

        {provider.services?.slice(0, 2).map(s => (
          <span key={s} className="inline-block text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md mr-1 mb-1">{s}</span>
        ))}

        {provider.website && (
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5">
            <Globe size={9}/>
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="hover:text-blue-600 hover:underline truncate flex items-center gap-0.5"
            >
              {provider.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              <ExternalLink size={8}/>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onScrape }) {
  return (
    <div className="col-span-full bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🏛</span>
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-2">No providers yet</h3>
      <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
        Start by scraping funeral home websites or importing a CSV/XLSX/JSON file to populate your marketplace.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onScrape}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
        >
          <RefreshCw size={14}/> Start Scraping
        </button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const toast = useToast();
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All States');
  const [serviceFilter, setServiceFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const reload = useCallback(() => {
    setProviders(loadProviders());
  }, []);

  useEffect(() => {
    reload();
    // Poll for new data every 3 seconds (scraped/imported data)
    const interval = setInterval(reload, 3000);
    return () => clearInterval(interval);
  }, [reload]);

  const handleDelete = (id) => {
    deleteProvider(id);
    setProviders(loadProviders());
    toast.info('Provider removed');
  };

  // Filter
  const filtered = providers.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(q) &&
          !p.city?.toLowerCase().includes(q) &&
          !p.state?.toLowerCase().includes(q) &&
          !p.email?.toLowerCase().includes(q))
        return false;
    }
    if (stateFilter !== 'All States' && p.state !== stateFilter) return false;
    if (serviceFilter && !(p.services || []).some(s => s.toLowerCase().includes(serviceFilter.toLowerCase()))) return false;
    if (verifiedOnly && !p.ai_verified) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Provider Marketplace</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {providers.length === 0 ? 'No providers yet' : `${filtered.length} of ${providers.length} provider${providers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all">
            <RefreshCw size={13}/> Refresh
          </button>
          <button onClick={() => navigate('/app/import')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all">
            <Plus size={13}/> Import
          </button>
          <button onClick={() => navigate('/app/scraper')} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all">
            <Database size={13}/> Scrape
          </button>
        </div>
      </div>

      {/* Filters */}
      {providers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              type="text"
              placeholder="Search by name, city, email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <select
            value={stateFilter}
            onChange={e => { setStateFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          >
            {STATES.map(s => <option key={s}>{s}</option>)}
          </select>

          <select
            value={serviceFilter}
            onChange={e => { setServiceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          >
            <option value="">All Services</option>
            {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <div
              onClick={() => { setVerifiedOnly(v => !v); setPage(1); }}
              className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${verifiedOnly ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${verifiedOnly ? 'left-4' : 'left-0.5'}`}/>
            </div>
            AI Verified only
          </label>

          {(search || stateFilter !== 'All States' || serviceFilter || verifiedOnly) && (
            <button
              onClick={() => { setSearch(''); setStateFilter('All States'); setServiceFilter(''); setVerifiedOnly(false); setPage(1); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginated.length === 0 && providers.length === 0 ? (
          <EmptyState onScrape={() => navigate('/app/scraper')}/>
        ) : paginated.length === 0 ? (
          <div className="col-span-full text-center py-10 text-slate-400 text-sm">
            No providers match your filters.
            <button onClick={() => { setSearch(''); setStateFilter('All States'); setServiceFilter(''); setVerifiedOnly(false); }} className="ml-2 text-blue-600 hover:underline">Clear filters</button>
          </div>
        ) : (
          paginated.map(p => (
            <ProviderCard
              key={p.id}
              provider={p}
              onClick={() => navigate(`/app/marketplace/${p.id}`)}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all">
            ← Prev
          </button>
          {Array.from({length: Math.min(7, totalPages)}, (_, i) => {
            let pg = i + 1;
            if (totalPages > 7) {
              if (page <= 4) pg = i + 1;
              else if (page >= totalPages - 3) pg = totalPages - 6 + i;
              else pg = page - 3 + i;
            }
            if (pg < 1 || pg > totalPages) return null;
            return (
              <button key={pg} onClick={() => setPage(pg)}
                className={`w-8 h-8 text-sm rounded-lg transition-all ${pg===page ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'}`}>
                {pg}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
