import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Globe, Phone, Mail, MapPin, ShieldCheck,
  Clock, ExternalLink, AlertCircle, Zap, Star, Trash2
} from 'lucide-react';
import { loadProviders, deleteProvider } from '../services/clientScraper';

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const providers = loadProviders();
    const found = providers.find(p => p.id === id);
    setProvider(found || null);
    setLoading(false);
  }, [id]);

  const handleDelete = () => {
    deleteProvider(id);
    navigate('/app/marketplace');
  };

  if (loading) return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-5 bg-slate-100 rounded w-32"/>
      <div className="bg-white rounded-xl border border-slate-200 p-6 h-32"/>
    </div>
  );

  if (!provider) return (
    <div className="p-6">
      <button onClick={() => navigate('/app/marketplace')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft size={15}/> Back to Marketplace
      </button>
      <div className="bg-white rounded-xl border border-red-200 p-10 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3"/>
        <h3 className="font-semibold text-slate-800 mb-1">Provider not found</h3>
        <p className="text-sm text-slate-400 mb-4">This provider may have been deleted.</p>
        <button onClick={() => navigate('/app/marketplace')} className="text-sm text-blue-600 hover:underline">
          Return to Marketplace
        </button>
      </div>
    </div>
  );

  const score = provider.accuracy_score || 0;
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';
  const scoreBg = score >= 70 ? 'bg-green-50 border-green-200' : score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/app/marketplace')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={15}/> Back to Marketplace
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400 flex-shrink-0 border border-slate-200">
            {(provider.name || '??').slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-slate-900">{provider.name}</h1>
              {provider.ai_verified && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-semibold border border-blue-200">
                  <ShieldCheck size={11}/> AI Verified
                </span>
              )}
              {provider.imported && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">Imported</span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-3">
              {(provider.city || provider.state) && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13}/>
                  {[provider.address, provider.city, provider.state, provider.zip].filter(Boolean).join(', ')}
                </span>
              )}
              {provider.website && (
                <a href={provider.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:underline">
                  <Globe size={13}/>
                  {provider.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                  <ExternalLink size={10}/>
                </a>
              )}
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                  <Phone size={13}/> {provider.phone}
                </a>
              )}
              {provider.email && (
                <a href={`mailto:${provider.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                  <Mail size={13}/> {provider.email}
                </a>
              )}
              {provider.scraped_at && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={13}/> {new Date(provider.scraped_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {provider.rating && (
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={13} className={i <= Math.round(provider.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}/>
                ))}
                <span className="text-sm font-semibold text-slate-700">{provider.rating}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            {score > 0 && (
              <div className={`text-center px-3 py-2 rounded-xl border ${scoreBg}`}>
                <div className={`text-xl font-bold ${scoreColor}`}>{score}%</div>
                <div className="text-[10px] text-slate-500">accuracy</div>
              </div>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-all border border-red-200"
            >
              <Trash2 size={11}/> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {['overview','services','raw'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t === 'raw' ? 'Raw Data' : t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {provider.description && (
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">About</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{provider.description}</p>
            </div>
          )}

          {/* Contact info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Contact Information</h3>
            <div className="space-y-2.5">
              {[
                { icon: Phone, label: 'Phone', value: provider.phone, href: `tel:${provider.phone}` },
                { icon: Mail, label: 'Email', value: provider.email, href: `mailto:${provider.email}` },
                { icon: Globe, label: 'Website', value: provider.website?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], href: provider.website, external: true },
                { icon: MapPin, label: 'Address', value: [provider.address, provider.city, provider.state, provider.zip].filter(Boolean).join(', ') },
              ].map(({icon: Icon, label, value, href, external}) => value ? (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={13} className="text-slate-500"/>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</div>
                    {href ? (
                      <a href={href} target={external ? '_blank' : undefined} rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        {value}
                        {external && <ExternalLink size={10}/>}
                      </a>
                    ) : (
                      <div className="text-sm text-slate-700">{value}</div>
                    )}
                  </div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Pricing */}
          {(provider.avg_price || provider.prices?.length > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Pricing</h3>
              {provider.avg_price && (
                <div className="mb-3">
                  <div className="text-2xl font-bold text-slate-900">${provider.avg_price.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Average service price</div>
                </div>
              )}
              {provider.prices?.length > 0 && (
                <div className="space-y-1.5">
                  {provider.prices.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Price {i + 1}</span>
                      <span className="font-semibold text-slate-800">${p.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Social links */}
          {Object.keys(provider.socials || {}).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Social Media</h3>
              <div className="space-y-2">
                {Object.entries(provider.socials).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline capitalize">
                    <ExternalLink size={12}/> {platform}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Services tab */}
      {tab === 'services' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Services Offered</h3>
          {provider.services?.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {provider.services.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>
                  <span className="text-sm text-slate-700 font-medium">{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Zap size={24} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-sm text-slate-400">No services detected.</p>
              <p className="text-xs text-slate-300 mt-1">Try re-scraping this provider from the Scraper page.</p>
            </div>
          )}
        </div>
      )}

      {/* Raw data tab */}
      {tab === 'raw' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Raw Provider Data</h3>
          <pre className="text-xs font-mono bg-slate-900 text-green-400 rounded-xl p-4 overflow-auto max-h-96 leading-relaxed">
            {JSON.stringify(provider, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
