import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const USER_KEY = 'fi_user_v2';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadPersistedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || !u.id) return null;
    return u;
  } catch { return null; }
}

function persistUser(u) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount — CRITICAL: this must run before ProtectedRoute
  useEffect(() => {
    const saved = loadPersistedUser();
    if (saved) setUser(saved);
    setLoading(false);
  }, []);

  // Also listen for storage events (multi-tab sync)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === USER_KEY) {
        if (e.newValue) {
          try { setUser(JSON.parse(e.newValue)); } catch {}
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setAndPersist = useCallback((u) => {
    persistUser(u);
    setUser(u);
  }, []);

  const login = useCallback(async (email, password) => {
    await new Promise(r => setTimeout(r, 500));
    // Restore any previously saved profile for this email
    const existing = loadPersistedUser();
    const base = {
      id: existing?.email === email ? existing.id : 'usr_' + Date.now(),
      email,
      name: '',
      full_name: '',
      title: '',
      organization: '',
      phone: '',
      location: '',
      website: '',
      bio: '',
      avatar: null,
      role: 'Analyst',
      provider: 'email',
    };
    // Keep saved profile fields if same email
    const u = existing?.email === email ? { ...base, ...existing, email } : base;
    setAndPersist(u);
    return { success: true };
  }, [setAndPersist]);

  const loginWithGoogle = useCallback(() => {
    return new Promise((resolve) => {
      if (!GOOGLE_CLIENT_ID) {
        // Demo mode — create/restore Google user
        const existing = loadPersistedUser();
        const u = existing?.provider === 'google' ? existing : {
          id: 'google_' + Date.now(),
          email: '',
          name: '',
          full_name: '',
          title: '',
          organization: '',
          phone: '',
          location: '',
          website: '',
          bio: '',
          avatar: null,
          role: 'Analyst',
          provider: 'google',
        };
        setAndPersist(u);
        resolve({ success: true });
        return;
      }

      const initFlow = () => {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            try {
              const payload = JSON.parse(atob(response.credential.split('.')[1]));
              const existing = loadPersistedUser();
              const base = {
                id: 'google_' + payload.sub,
                email: payload.email || '',
                name: payload.given_name || payload.name || '',
                full_name: payload.name || '',
                avatar: payload.picture || null,
                role: 'Analyst',
                provider: 'google',
              };
              // Keep saved extra fields if same Google account
              const u = existing?.id === base.id
                ? { ...base, ...existing, email: base.email, name: base.name, full_name: base.full_name, avatar: base.avatar }
                : { ...base, title: '', organization: '', phone: '', location: '', website: '', bio: '' };
              setAndPersist(u);
              resolve({ success: true });
            } catch (e) {
              resolve({ success: false, error: 'Failed to decode Google token' });
            }
          },
        });
        window.google.accounts.id.prompt();
      };

      if (typeof window.google === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        script.onload = initFlow;
        script.onerror = () => resolve({ success: false, error: 'Failed to load Google SDK' });
      } else {
        initFlow();
      }
    });
  }, [setAndPersist]);

  const register = useCallback(async (data) => {
    await new Promise(r => setTimeout(r, 500));
    const u = {
      id: 'usr_' + Date.now(),
      email: data.email || '',
      name: data.name || '',
      full_name: data.full_name || data.name || '',
      title: data.title || '',
      organization: data.organization || '',
      phone: '',
      location: '',
      website: '',
      bio: '',
      avatar: null,
      role: 'Analyst',
      provider: 'email',
    };
    setAndPersist(u);
    return { success: true };
  }, [setAndPersist]);

  const logout = useCallback(() => {
    persistUser(null);
    setUser(null);
  }, []);

  // updateProfile merges and persists — fixes profile wipe on refresh
  const updateProfile = useCallback((data) => {
    setUser(prev => {
      const updated = { ...prev, ...data };
      persistUser(updated);
      return updated;
    });
    return { success: true };
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, loginWithGoogle, register, logout, updateProfile,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
