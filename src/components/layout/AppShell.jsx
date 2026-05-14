import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Upload, ShoppingBag, MessageSquare,
  Zap, BarChart3, Settings, LogOut, Bell, Search,
  Activity, Menu, X, ChevronRight
} from 'lucide-react';

const nav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/scraper', icon: Activity, label: 'Scraper' },
  { to: '/app/import', icon: Upload, label: 'Bulk Import' },
  { to: '/app/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { to: '/app/assistant', icon: MessageSquare, label: 'AI Assistant' },
  { to: '/app/enrichment', icon: Zap, label: 'Enrichment' },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.full_name || user?.name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const Sidebar = ({ mobile = false }) => (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col bg-white border-r border-slate-200 ${mobile ? 'w-full h-full' : 'w-[220px]'} flex-shrink-0`}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-slate-900 text-sm">Funeral Intel</span>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 px-3 py-3 space-y-0.5">
        <NavLink
          to="/app/settings"
          onClick={() => mobile && setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          <Settings size={16} />
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* User info at bottom */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div
          className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
          onClick={() => { navigate('/app/settings'); mobile && setSidebarOpen(false); }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || user?.name || 'Your Account'}</div>
            <div className="text-[10px] text-slate-500 truncate">{user?.email || 'Set up your profile'}</div>
          </div>
          <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-white h-full shadow-2xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <Menu size={18} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search providers, jobs, URLs..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>

            {/* User avatar - clickable to settings */}
            <button
              onClick={() => navigate('/app/settings')}
              className="flex items-center gap-2 hover:bg-slate-100 px-2 py-1.5 rounded-xl transition-all"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-none">{user?.full_name || user?.name || 'Your Account'}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{user?.role || 'Analyst'}</div>
              </div>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
