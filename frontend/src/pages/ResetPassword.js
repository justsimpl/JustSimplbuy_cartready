import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import axios from 'axios';
import { TrendingUp, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API}/auth/verify-reset-token/${token}`);
      setTokenValid(true);
      setEmail(response.data.email);
    } catch (error) {
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reset password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Verifying reset token...</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="auth-container" data-testid="reset-password-invalid">
        <div className="auth-card text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 
            className="text-2xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Invalid or Expired Link
          </h1>
          <p className="text-slate-500 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Request New Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-container" data-testid="reset-password-success">
        <div className="auth-card text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 
            className="text-2xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Password Reset!
          </h1>
          <p className="text-slate-500 mb-6">
            Your password has been successfully reset. You can now login with your new password.
          </p>
          <Link to="/login">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container" data-testid="reset-password-page">
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
          Reset Password
        </h1>
        <p className="text-center text-slate-500 mb-8">
          Enter your new password for <strong>{email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="password" className="text-slate-700">New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                data-testid="reset-password"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-slate-700">Confirm Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                data-testid="reset-confirm-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-6 font-semibold btn-hover-lift"
            data-testid="reset-submit"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
