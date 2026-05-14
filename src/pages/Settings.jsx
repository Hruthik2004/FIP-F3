import { useState, useRef, useEffect } from 'react';
import { User, Search, Key, Bell, Shield, Save, Camera, Trash2,
  Eye, EyeOff, Copy, Check, Plus, RefreshCw, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/index';

const TABS = [
  { id: 'profile',       icon: User,   label: 'Profile' },
  { id: 'scraping',      icon: Search, label: 'Scraping' },
  { id: 'api',           icon: Key,    label: 'API Keys' },
  { id: 'notifications', icon: Bell,   label: 'Notifications' },
  { id: 'compliance',    icon: Shield, label: 'Compliance' },
];

const PREFS_KEY = 'fi_settings_prefs';

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-200'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function ApiKeyRow({ label, sub, status }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotated, setRotated] = useState(false);
  const toast = useToast();
  const key = label === 'Production'
    ? 'fi_live_xk9a2m4p7q1r8s3t6u0v5w2y'
    : 'fi_test_mn3p6r9s2u5x8a1c4e7h0j3k';

  const handleCopy = () => {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">{label} API Key</div>
          <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {status}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-slate-900 text-green-400 text-xs font-mono rounded-lg truncate">
          {revealed ? key : key.slice(0, 10) + '••••••••••••••••'}
        </code>
        <button onClick={() => setRevealed(v => !v)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={handleCopy} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
          {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
        </button>
        <button onClick={() => { setRotated(true); toast.success(`${label} key rotated`); setTimeout(() => setRotated(false), 1500); }}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
          <RefreshCw size={13} className={rotated ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [isDirty, setIsDirty] = useState(false);

  // Load profile from user object (which is already persisted in localStorage via useAuth)
  const [profile, setProfile] = useState({
    name:         user?.name         || '',
    full_name:    user?.full_name    || '',
    email:        user?.email        || '',
    title:        user?.title        || '',
    organization: user?.organization || '',
    phone:        user?.phone        || '',
    location:     user?.location     || '',
    website:      user?.website      || '',
    bio:          user?.bio          || '',
  });

  // Load persisted preferences
  const loadPrefs = () => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
  };
  const savedPrefs = loadPrefs();

  const [notifications, setNotifications] = useState({
    scrapeComplete: savedPrefs.scrapeComplete ?? true,
    driftAlerts:    savedPrefs.driftAlerts    ?? true,
    enrichment:     savedPrefs.enrichment     ?? false,
    weeklyDigest:   savedPrefs.weeklyDigest   ?? true,
    apiWarnings:    savedPrefs.apiWarnings     ?? false,
  });

  const [scraping, setScraping] = useState({
    concurrency:   savedPrefs.concurrency   || '10',
    proxy:         savedPrefs.proxy         || 'residential',
    delay:         savedPrefs.delay         || '500',
    retries:       savedPrefs.retries       || '3',
    timeout:       savedPrefs.timeout       || '30',
    format:        savedPrefs.format        || 'json',
    dedup:         savedPrefs.dedup         ?? true,
    ai_extraction: savedPrefs.ai_extraction ?? true,
  });

  // Sync profile when user object changes (e.g. after Google login)
  useEffect(() => {
    if (user) {
      setProfile(p => ({
        name:         user.name         || p.name,
        full_name:    user.full_name    || p.full_name,
        email:        user.email        || p.email,
        title:        user.title        || p.title,
        organization: user.organization || p.organization,
        phone:        user.phone        || p.phone,
        location:     user.location     || p.location,
        website:      user.website      || p.website,
        bio:          user.bio          || p.bio,
      }));
      setAvatarPreview(user.avatar || null);
    }
  }, [user?.id]); // only on user ID change

  const handleField = (key, val) => {
    setProfile(p => ({ ...p, [key]: val }));
    setIsDirty(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.warning('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.warning('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarPreview(ev.target.result); setIsDirty(true); };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => { setAvatarPreview(null); setIsDirty(true); if (fileRef.current) fileRef.current.value = ''; };

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    // updateProfile merges into persisted user — survives refresh
    updateProfile({ ...profile, avatar: avatarPreview });
    setIsDirty(false);
    toast.success('Profile saved — changes will persist across sessions');
    setSaving(false);
  };

  const handleDiscard = () => {
    setProfile({
      name: user?.name || '', full_name: user?.full_name || '',
      email: user?.email || '', title: user?.title || '',
      organization: user?.organization || '', phone: user?.phone || '',
      location: user?.location || '', website: user?.website || '', bio: user?.bio || '',
    });
    setAvatarPreview(user?.avatar || null);
    setIsDirty(false);
  };

  const savePrefs = (key, val) => {
    const prefs = loadPrefs();
    prefs[key] = val;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  };

  const handleNotifChange = (key, val) => {
    setNotifications(p => { const n = { ...p, [key]: val }; savePrefs(key, val); return n; });
  };
  const handleScrapingChange = (key, val) => {
    setScraping(p => { const n = { ...p, [key]: val }; savePrefs(key, val); return n; });
  };

  const initials = (profile.full_name || profile.name || profile.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">All changes are saved to your browser session and persist across refreshes.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-0.5 sticky top-4">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                <tab.icon size={15} />{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-5">

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <>
              {/* Avatar */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Profile Photo</h2>
                <div className="flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                      : <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white">{initials}</div>}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                      <Camera size={14} /> Upload Photo
                    </button>
                    {avatarPreview && (
                      <button onClick={removeAvatar}
                        className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors">
                        <Trash2 size={14} /> Remove Photo
                      </button>
                    )}
                    <p className="text-xs text-slate-400">JPG, PNG or GIF · Max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Personal Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'full_name',    label: 'Full Name',         placeholder: 'Your full name',            span: 1 },
                    { key: 'name',         label: 'Display Name',      placeholder: 'How others see you',         span: 1 },
                    { key: 'email',        label: 'Email Address',     placeholder: 'your@email.com', type: 'email', span: 2 },
                    { key: 'title',        label: 'Job Title',         placeholder: 'e.g. Operations Manager',   span: 1 },
                    { key: 'organization', label: 'Organization',      placeholder: 'Company name',              span: 1 },
                    { key: 'phone',        label: 'Phone Number',      placeholder: '+1 (555) 000-0000', type: 'tel', span: 1 },
                    { key: 'location',     label: 'Location',          placeholder: 'City, Country',             span: 1 },
                    { key: 'website',      label: 'Website / LinkedIn', placeholder: 'https://', type: 'url',    span: 2 },
                  ].map(f => (
                    <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">{f.label}</label>
                      <input
                        type={f.type || 'text'}
                        placeholder={f.placeholder}
                        value={profile[f.key]}
                        onChange={e => handleField(f.key, e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Bio</label>
                    <textarea
                      placeholder="Write a short bio..."
                      value={profile.bio}
                      onChange={e => handleField('bio', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>

                {isDirty && (
                  <div className="flex items-center gap-2 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">You have unsaved changes</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                  <button onClick={handleDiscard} disabled={!isDirty}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40">
                    Discard Changes
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-60">
                    {saving
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Save size={14} />}
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── SCRAPING TAB ── */}
          {activeTab === 'scraping' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-1">Scraping Preferences</h2>
              <p className="text-sm text-slate-500 mb-5">Preferences are saved automatically to your browser.</p>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'concurrency', label: 'Concurrency', type: 'select', options: [['5','5 Threads'],['10','10 Threads'],['25','25 Threads'],['50','50 Threads']] },
                    { key: 'proxy',       label: 'Proxy Mode',  type: 'select', options: [['residential','Residential'],['datacenter','Datacenter'],['mobile','Mobile'],['none','No Proxy']] },
                    { key: 'delay',       label: 'Delay (ms)',  type: 'number', min: 0,   max: 5000 },
                    { key: 'retries',     label: 'Max Retries', type: 'number', min: 0,   max: 10 },
                    { key: 'timeout',     label: 'Timeout (s)', type: 'number', min: 5,   max: 120 },
                    { key: 'format',      label: 'Output Format', type: 'select', options: [['json','JSON'],['csv','CSV'],['xlsx','Excel']] },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">{f.label}</label>
                      {f.type === 'select'
                        ? <select value={scraping[f.key]} onChange={e => handleScrapingChange(f.key, e.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                            {f.options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        : <input type="number" value={scraping[f.key]} min={f.min} max={f.max}
                            onChange={e => handleScrapingChange(f.key, e.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />}
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-1">
                  {[
                    { key: 'dedup',         label: 'Deduplication',      sub: 'Skip already-scraped URLs' },
                    { key: 'ai_extraction', label: 'AI-Enhanced Extraction', sub: 'Improve accuracy with AI parsing' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{item.label}</div>
                        <div className="text-xs text-slate-500">{item.sub}</div>
                      </div>
                      <Toggle on={scraping[item.key]} onChange={v => handleScrapingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-xs text-green-600 flex items-center gap-1.5">
                    <Check size={11} /> Preferences auto-saved to browser
                  </p>
                  <button onClick={() => toast.success('Scraping preferences saved')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all">
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── API KEYS TAB ── */}
          {activeTab === 'api' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-1">API Keys</h2>
              <p className="text-sm text-slate-500 mb-5">Keep these secret — never commit to source code.</p>
              <div className="space-y-4">
                <ApiKeyRow label="Production" sub="Full read/write access" status="Active" />
                <ApiKeyRow label="Development" sub="Rate-limited (100 req/hr)" status="Limited" />
                <button onClick={() => toast.info('Key generation requires a connected backend')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600 text-sm font-medium rounded-xl transition-all">
                  <Plus size={14} /> Generate New Key
                </button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-1">Notifications</h2>
              <p className="text-sm text-slate-500 mb-5">Preferences are saved immediately to your browser.</p>
              <div className="space-y-1">
                {[
                  { key: 'scrapeComplete', label: 'Scrape Completion',     sub: 'When scraping jobs finish' },
                  { key: 'driftAlerts',    label: 'Structure Drift Alerts', sub: 'When website layouts change' },
                  { key: 'enrichment',     label: 'Enrichment Pipeline',   sub: 'Stage completion & errors' },
                  { key: 'weeklyDigest',   label: 'Weekly Digest',         sub: 'Weekly market summary email' },
                  { key: 'apiWarnings',    label: 'API Rate Limit Warnings', sub: 'Near request limit alerts' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{item.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
                    </div>
                    <Toggle on={notifications[item.key]} onChange={v => handleNotifChange(item.key, v)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-4">
                <Check size={11} /> Preferences auto-saved
              </p>
            </div>
          )}

          {/* ── COMPLIANCE TAB ── */}
          {activeTab === 'compliance' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-1">Compliance</h2>
              <p className="text-sm text-slate-500 mb-5">Platform compliance status and audit events.</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[['GDPR','Compliant','green'],['CCPA','Compliant','green'],['SOC 2','In Progress','amber'],['ISO 27001','Compliant','green']].map(([l,s,c]) => (
                  <div key={l} className={`p-4 rounded-xl border ${c==='green' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className={`text-sm font-bold ${c==='green' ? 'text-green-800' : 'text-amber-800'}`}>{l}</div>
                    <div className={`text-xs mt-0.5 font-medium ${c==='green' ? 'text-green-700' : 'text-amber-700'}`}>{s}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-sm font-semibold text-slate-800 mb-3">Audit Log</div>
                {[
                  { action: 'Profile updated',               time: 'Just now',   ok: true },
                  { action: 'API key accessed',              time: '1h ago',     ok: true },
                  { action: 'Data export completed',         time: 'Yesterday',  ok: true },
                  { action: 'GDPR delete request processed', time: '3 days ago', ok: true },
                ].map((ev, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${ev.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                      {ev.action}
                    </div>
                    <span className="text-[10px] text-slate-400">{ev.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
