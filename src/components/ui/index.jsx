/**
 * Shared UI Components — Toast, Spinner, Skeleton, Modal, StatusBadge, etc.
 */
import { useState, useEffect, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// ─── Toast System ─────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info:    (msg) => addToast(msg, 'info'),
  };

  const ICONS = {
    success: <CheckCircle size={15} className="text-green-500 flex-shrink-0" />,
    error:   <AlertCircle size={15} className="text-red-500 flex-shrink-0" />,
    warning: <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />,
    info:    <Info size={15} className="text-blue-500 flex-shrink-0" />,
  };

  const BORDERS = {
    success: 'border-l-green-400',
    error:   'border-l-red-400',
    warning: 'border-l-amber-400',
    info:    'border-l-blue-400',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 bg-white border border-slate-200 border-l-4 ${BORDERS[t.type] || BORDERS.info} rounded-xl px-4 py-3 shadow-lg min-w-[280px] max-w-sm pointer-events-auto animate-slide-up`}
          >
            {ICONS[t.type]}
            <span className="text-sm text-slate-700 flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="p-0.5 rounded hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <X size={12} className="text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin flex-shrink-0 ${className}`}
    />
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  success:    'bg-green-100 text-green-700',
  completed:  'bg-green-100 text-green-700',
  active:     'bg-green-100 text-green-700',
  online:     'bg-green-100 text-green-700',
  running:    'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  queued:     'bg-amber-100 text-amber-700',
  paused:     'bg-amber-100 text-amber-700',
  warning:    'bg-amber-100 text-amber-700',
  error:      'bg-red-100 text-red-700',
  failed:     'bg-red-100 text-red-700',
  critical:   'bg-red-100 text-red-700',
  idle:       'bg-slate-100 text-slate-600',
  offline:    'bg-slate-100 text-slate-600',
};

export function StatusBadge({ status, label }) {
  const style = BADGE_STYLES[status?.toLowerCase()] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize ${style}`}>
      {label || status}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full animate-slide-up ${sizes[size] || sizes.md}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'blue', label, showValue }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = {
    blue: 'bg-blue-600', green: 'bg-green-500',
    amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500',
  };
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between text-xs mb-1">
          {label && <span className="text-slate-500">{label}</span>}
          {showValue && <span className="font-medium text-slate-700">{pct}%</span>}
        </div>
      )}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[color] || colors.blue}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, desc, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon size={24} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      {desc && <p className="text-xs text-slate-500 max-w-xs mt-0.5">{desc}</p>}
      {action && (
        <button
          onClick={action}
          className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── Data Table ───────────────────────────────────────────────────────────────
export function DataTable({ columns, data, loading, emptyText = 'No data available' }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (!data?.length) {
    return <p className="text-center text-sm text-slate-400 py-10">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-slate-700">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
