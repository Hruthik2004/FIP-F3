import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/index';
import LandingPage        from './pages/LandingPage';
import LoginPage          from './pages/LoginPage';
import AppShell           from './components/layout/AppShell';
import Dashboard          from './pages/Dashboard';
import ScraperDashboard   from './pages/ScraperDashboard';
import BulkImport         from './pages/BulkImport';
import Marketplace        from './pages/Marketplace';
import ProviderDetail     from './pages/ProviderDetail';
import AIAssistant        from './pages/AIAssistant';
import EnrichmentPipeline from './pages/EnrichmentPipeline';
import Analytics          from './pages/Analytics';
import Settings           from './pages/Settings';

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  // If not authenticated redirect to login, preserving intended URL
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  // If already logged in, skip login page
  return isAuthenticated ? <Navigate to="/app/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"     element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index                     element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard"          element={<Dashboard />} />
        <Route path="scraper"            element={<ScraperDashboard />} />
        <Route path="import"             element={<BulkImport />} />
        <Route path="marketplace"        element={<Marketplace />} />
        <Route path="marketplace/:id"    element={<ProviderDetail />} />
        <Route path="assistant"          element={<AIAssistant />} />
        <Route path="enrichment"         element={<EnrichmentPipeline />} />
        <Route path="analytics"          element={<Analytics />} />
        <Route path="settings"           element={<Settings />} />
      </Route>

      {/* Catch-all: go to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
