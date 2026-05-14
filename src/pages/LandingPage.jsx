import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Shield, Zap, BarChart3, Globe, CheckCircle, MessageSquare } from 'lucide-react';

const FEATURES = [
  { icon: Globe, title: 'Smart Web Scraping', desc: 'AI-powered extraction from any funeral home website with intelligent deduplication and structure-drift detection.' },
  { icon: Zap, title: 'Enrichment Pipeline', desc: 'Automatically enhance raw scraped data with contact discovery, pricing normalization, and service categorization.' },
  { icon: BarChart3, title: 'Market Analytics', desc: 'Real-time dashboards showing provider distribution, pricing trends, and regional market insights.' },
  { icon: MessageSquare, title: 'AI Assistant', desc: 'Ask natural language questions about your data and get instant, actionable market intelligence.' },
  { icon: Shield, title: 'GDPR Compliant', desc: 'Enterprise-grade security with full audit trails, data provenance tracking, and compliance reporting.' },
  { icon: Activity, title: 'Live Monitoring', desc: 'Real-time scraper health monitoring, job scheduling, and automated retry logic for 99.9% uptime.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900">Funeral Intelligence</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium px-4 py-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Funeral Market Intelligence Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-5 max-w-3xl mx-auto">
          AI-Powered Data Intelligence for the{' '}
          <span className="text-blue-600">Funeral Industry</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
          Scrape, enrich, and analyze funeral home data at scale. Turn raw web data into actionable market insights.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200"
          >
            Start Free Trial <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
          >
            View Demo
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Everything You Need</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  <f.icon size={18} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-blue-600 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-blue-200 mb-6 text-sm">Start extracting funeral market intelligence today.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl transition-all"
          >
            Create Free Account <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity size={12} className="text-white" />
            </div>
            <span>Funeral Intelligence Platform</span>
          </div>
          <div className="flex gap-5">
            <a href="https://docs.funeralintel.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Docs</a>
            <a href="https://status.funeralintel.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Status</a>
            <a href="mailto:support@funeralintel.com" className="hover:text-slate-600 transition-colors">Support</a>
            <a href="mailto:privacy@funeralintel.com" className="hover:text-slate-600 transition-colors">Privacy</a>
          </div>
          <span>© {new Date().getFullYear()} Funeral Intelligence Platform</span>
        </div>
      </footer>
    </div>
  );
}
