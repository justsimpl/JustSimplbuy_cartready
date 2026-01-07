import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" data-testid="register-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span 
            className="font-bold text-2xl text-slate-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PriceWise
          </span>
        </div>

        <h1 
          className="text-2xl font-bold text-center text-slate-900 mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Create Account
        </h1>
        <p className="text-center text-slate-500 mb-8">
          Start tracking prices and saving money
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-slate-700">Full Name</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                data-testid="register-name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-slate-700">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                data-testid="register-email"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-slate-700">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                data-testid="register-password"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-6 font-semibold btn-hover-lift"
            data-testid="register-submit"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <p className="text-center text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline" data-testid="login-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
