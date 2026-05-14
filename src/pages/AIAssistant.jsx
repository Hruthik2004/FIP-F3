import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Trash2, Bot, User, Loader, Lightbulb } from 'lucide-react';
import { loadProviders } from '../services/clientScraper';
import { useAuth } from '../hooks/useAuth';

// ─── Local AI: answer questions about localStorage providers ──────────────────
function answerLocally(question, providers) {
  const q = question.toLowerCase();
  const count = providers.length;

  if (count === 0) {
    return `I don't have any provider data to analyze yet. Please scrape some funeral home websites or import a CSV/XLSX file first, then I can answer questions about your data.`;
  }

  // Top providers by rating
  if (q.includes('top') || q.includes('best') || q.includes('rating') || q.includes('rated')) {
    const rated = providers.filter(p => p.rating).sort((a, b) => b.rating - a.rating).slice(0, 5);
    if (!rated.length) return `I have ${count} providers in the database but none have rating data yet. Try enriching your data via the Enrichment Pipeline.`;
    return `**Top Rated Funeral Homes** (from your ${count} providers):\n\n${
      rated.map((p, i) => `${i+1}. **${p.name}** — ${p.rating}★\n   ${p.city ? p.city + (p.state ? ', '+p.state : '') : 'Location unknown'}`).join('\n\n')
    }`;
  }

  // State/location filter
  const stateMatch = q.match(/\b(california|texas|florida|new york|ohio|illinois|georgia|washington|ca|tx|fl|ny|oh|il|ga|wa|pa|nc|ma|az|co|tn|mi|va)\b/i);
  if (stateMatch || q.includes('state') || q.includes('location')) {
    let byState = providers;
    if (stateMatch) {
      const stateAbbr = { california:'CA', texas:'TX', florida:'FL', 'new york':'NY', ohio:'OH', illinois:'IL', georgia:'GA', washington:'WA', pennsylvania:'PA', 'north carolina':'NC', massachusetts:'MA', arizona:'AZ', colorado:'CO', tennessee:'TN', michigan:'MI', virginia:'VA' };
      const st = stateAbbr[stateMatch[0].toLowerCase()] || stateMatch[0].toUpperCase();
      byState = providers.filter(p => p.state === st);
      if (!byState.length) return `No providers found in ${st} in your database. Try scraping funeral homes from that state.`;
      return `**Providers in ${st}** (${byState.length} found):\n\n${byState.slice(0,8).map(p => `• **${p.name}**${p.city ? ' — ' + p.city : ''}${p.phone ? '\n  📞 ' + p.phone : ''}`).join('\n\n')}`;
    }
    const stateMap = {};
    providers.forEach(p => { if (p.state) stateMap[p.state] = (stateMap[p.state]||0)+1; });
    const sorted = Object.entries(stateMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
    return `**Providers by State** (${count} total):\n\n${sorted.map(([s,c]) => `• **${s}**: ${c} providers`).join('\n')}`;
  }

  // Pricing
  if (q.includes('pric') || q.includes('cost') || q.includes('cheap') || q.includes('expensive') || q.includes('afford')) {
    const priced = providers.filter(p => p.avg_price).sort((a, b) => a.avg_price - b.avg_price);
    if (!priced.length) return `I have ${count} providers but no pricing data yet. Pricing is extracted during web scraping — try the Enrichment Pipeline to re-process your data.`;
    const avg = Math.round(priced.reduce((s, p) => s + p.avg_price, 0) / priced.length);
    return `**Pricing Summary** (from ${priced.length} providers with price data):\n\n• Average price: **$${avg.toLocaleString()}**\n• Most affordable: **${priced[0].name}** — $${priced[0].avg_price.toLocaleString()}\n• Most expensive: **${priced[priced.length-1].name}** — $${priced[priced.length-1].avg_price.toLocaleString()}\n\n${q.includes('cheap') || q.includes('afford') ? 'Most Affordable:\n' + priced.slice(0,3).map(p => `• ${p.name}: $${p.avg_price.toLocaleString()}`).join('\n') : ''}`;
  }

  // Services
  if (q.includes('service') || q.includes('cremation') || q.includes('burial') || q.includes('eco') || q.includes('green') || q.includes('veteran')) {
    const serviceMap = {};
    providers.forEach(p => (p.services||[]).forEach(s => { serviceMap[s] = (serviceMap[s]||0)+1; }));
    const sorted = Object.entries(serviceMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if (!sorted.length) return `I have ${count} providers but no service data has been extracted yet. Run the Enrichment Pipeline or re-scrape to detect services.`;
    if (q.includes('eco') || q.includes('green')) {
      const eco = providers.filter(p => (p.services||[]).some(s => /eco|green|natural|aqua/i.test(s)));
      return eco.length ? `**Eco-Friendly Burial Providers** (${eco.length} found):\n\n${eco.map(p => `• **${p.name}** — ${p.city||''}${p.state ? ', '+p.state : ''}\n  Services: ${p.services.filter(s => /eco|green|natural|aqua/i.test(s)).join(', ')}`).join('\n\n')}` : `No providers offering eco/green burial options found in your database. Try scraping more providers.`;
    }
    return `**Top Service Types** across your ${count} providers:\n\n${sorted.map(([s,c]) => `• **${s}**: ${c} provider${c!==1?'s':''}`).join('\n')}`;
  }

  // Verified
  if (q.includes('verif') || q.includes('accura') || q.includes('quality') || q.includes('reliable')) {
    const verified = providers.filter(p => p.ai_verified).sort((a,b)=>(b.accuracy_score||0)-(a.accuracy_score||0));
    const avgAcc = providers.length > 0 ? Math.round(providers.reduce((s,p)=>s+(p.accuracy_score||0),0)/providers.length) : 0;
    return `**Data Quality Summary**:\n\n• ${verified.length} of ${count} providers are AI verified\n• Average accuracy score: **${avgAcc}%**\n\n${verified.length > 0 ? '**Top Verified Providers:**\n' + verified.slice(0,5).map(p => `• **${p.name}** — ${p.accuracy_score}% accuracy`).join('\n') : 'Run the Enrichment Pipeline to verify your providers.'}`;
  }

  // Contact info
  if (q.includes('phone') || q.includes('email') || q.includes('contact') || q.includes('reach')) {
    const withPhone = providers.filter(p => p.phone).length;
    const withEmail = providers.filter(p => p.email).length;
    return `**Contact Data Coverage** (${count} providers):\n\n• 📞 Phone numbers: **${withPhone}** providers (${Math.round(withPhone/count*100)}%)\n• 📧 Email addresses: **${withEmail}** providers (${Math.round(withEmail/count*100)}%)\n\nRun Contact Discovery in the Enrichment Pipeline to improve coverage.`;
  }

  // Summary / overview
  if (q.includes('summar') || q.includes('overview') || q.includes('total') || q.includes('how many') || q.includes('count')) {
    const scraped  = providers.filter(p => !p.imported).length;
    const imported = providers.filter(p => p.imported).length;
    const verified = providers.filter(p => p.ai_verified).length;
    const withPhone = providers.filter(p => p.phone).length;
    const avgAcc = Math.round(providers.reduce((s,p)=>s+(p.accuracy_score||0),0)/count);
    return `**Database Summary**:\n\n• **${count}** total providers\n• **${scraped}** scraped from web · **${imported}** imported from files\n• **${verified}** AI verified (${Math.round(verified/count*100)}%)\n• **${withPhone}** have phone numbers\n• Average accuracy: **${avgAcc}%**`;
  }

  // Default helpful response
  return `I can answer questions about your **${count} providers** in the database. Try asking:\n\n• *"Show top-rated funeral homes"*\n• *"Which providers offer cremation?"*\n• *"What's the average pricing?"*\n• *"Show providers in Texas"*\n• *"How many are AI verified?"*\n• *"Give me a summary"*`;
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-500 to-blue-600'}`}>
        {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
      </div>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
      }`}>
        <div className="whitespace-pre-wrap">{msg.content.split('**').map((part, i) =>
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        )}</div>
        <div className={`text-[10px] mt-1.5 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Give me a database summary',
  'Show top-rated funeral homes',
  'Which providers offer cremation?',
  'What is the average service pricing?',
  'How many providers are AI verified?',
  'Show providers by state',
];

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const CHAT_KEY  = 'fi_chat_history';

  // Restore chat history
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
      if (saved.length) setMessages(saved);
    } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveHistory = (msgs) => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-50)));
  };

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));

    const providers = loadProviders();
    const answer = answerLocally(content, providers);

    const aiMsg = {
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString(),
    };

    const final = [...newMsgs, aiMsg];
    setMessages(final);
    saveHistory(final);
    setLoading(false);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_KEY);
  };

  const providerCount = loadProviders().length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">AI Assistant</h1>
            <p className="text-xs text-slate-500">
              {providerCount > 0 ? `Analysing ${providerCount} providers in your database` : 'No providers yet — scrape or import data first'}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare size={26} className="text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-2">How can I help you?</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm">
              {providerCount > 0
                ? `I can analyze your ${providerCount} providers and answer questions about pricing, services, ratings, and geographic coverage.`
                : `Scrape funeral home websites or import a CSV file, then I can answer questions about your data.`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left p-3 text-xs text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all flex items-start gap-2">
                  <Lightbulb size={11} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Bot size={13} className="text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">Analysing your data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t border-slate-200 flex-shrink-0">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about your funeral provider data..."
            disabled={loading}
            className="flex-1 px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0 shadow-sm"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Answers are based on your local provider database · Chat history is saved in browser
        </p>
      </div>
    </div>
  );
}
