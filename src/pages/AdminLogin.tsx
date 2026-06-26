import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { authAPI, publicAPI } from '@/services/api';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>('');
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  useEffect(() => {
    // Load tenant info if tenantSlug is present
    if (tenantSlug) {
      publicAPI.getTenantBySlug(tenantSlug).then(tenant => {
        if (tenant) {
          setTenantId(tenant.id);
          setTenantName(tenant.name);
        }
      });
    }
  }, [tenantSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { token } = await authAPI.login(email, password, tenantId || undefined);
      // Clear any stale super admin session so the interceptor uses the tenant admin token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      localStorage.setItem('admin_token', token);

      // Decode token to get tenantId if not already set
      try {
        const decoded = JSON.parse(atob(token));
        if (decoded.tenantId && !tenantId) {
          setTenantId(decoded.tenantId);
          localStorage.setItem('current_tenant_id', decoded.tenantId);
        } else if (tenantId) {
          localStorage.setItem('current_tenant_id', tenantId);
        }
        if (tenantSlug) {
          localStorage.setItem('current_tenant_slug', tenantSlug);
        }
      } catch { /* token decode error */ }

      toast.success('Login successful!');
      
      // Navigate to appropriate dashboard
      if (tenantSlug) {
        navigate(`/${tenantSlug}/admin/dashboard`);
      } else {
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast.error('Invalid credentials');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            {tenantName ? `Sign in to manage ${tenantName}` : 'Sign in to manage your restaurant menu'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-primary-600 hover:text-primary-700">
            ← Back to Menu
          </a>
        </div>
      </div>
    </div>
  );
}
