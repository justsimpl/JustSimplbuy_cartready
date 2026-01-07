import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock, Loader2, Shield, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(location.state?.error || '');

  // Redirect if already logged in as admin
  useEffect(() => {
    if (user && isAdmin()) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(email, password);
      
      if (userData.role !== 'admin') {
        setError('Admin access required. This account does not have admin privileges.');
        return;
      }
      
      toast.success('Welcome to Admin Panel!');
      navigate('/admin');
    } catch (err) {
      const message = err.response?.data?.detail || 'Invalid credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" data-testid="admin-login-page">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="font-bold text-2xl text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                PriceWise
              </span>
              <div className="flex items-center gap-1 text-indigo-400 text-sm">
                <Shield className="w-3 h-3" />
                Admin Panel
              </div>
            </div>
          </div>

          <h1 
            className="text-xl font-bold text-center text-white mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Admin Login
          </h1>
          <p className="text-center text-slate-400 mb-6 text-sm">
            Sign in with your admin account
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-900/50 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500"
                  data-testid="admin-login-email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500"
                  data-testid="admin-login-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-6 font-semibold"
              data-testid="admin-login-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Sign In to Admin
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
            <Link 
              to="/admin/forgot-password" 
              className="block text-center text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              Forgot your password?
            </Link>
            <Link 
              to="/" 
              className="block text-center text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Back to Store
            </Link>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Need admin access? Contact your system administrator.
        </p>
      </div>
    </div>
  );
}
