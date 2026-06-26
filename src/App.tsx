import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Menu from './pages/Menu';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

const DEFAULT_SLUG = import.meta.env.VITE_DEFAULT_SLUG as string | undefined;

function App() {
  return (
    <ThemeProvider>
    <TenantProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1a1a1a',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Root: redirect to default tenant slug if configured, else show landing */}
          <Route
            path="/"
            element={
              DEFAULT_SLUG
                ? <Navigate to={`/${DEFAULT_SLUG}`} replace />
                : <LandingPage />
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/:tenantSlug/admin/login" element={<AdminLogin />} />
          <Route path="/:tenantSlug/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/:tenantSlug" element={<Menu />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </TenantProvider>
    </ThemeProvider>
  );
}

export default App;
