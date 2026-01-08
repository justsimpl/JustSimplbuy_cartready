import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import axios from 'axios';
import { TrendingUp, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
      
      // In development, we get the reset token back
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);
      }
      
      toast.success('Reset instructions sent!');
    } catch (error) {
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" data-testid="forgot-password-page">
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
            JustSimplBuying
          </span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 
              className="text-2xl font-bold text-slate-900 mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Check Your Email
            </h1>
            <p className="text-slate-500 mb-6">
              If an account exists with <strong>{email}</strong>, you'll receive a password reset link.
            </p>

            {/* Development mode: Show reset link */}
            {resetToken && (
              <Alert className="mb-6 bg-amber-50 border-amber-200 text-left">
                <AlertDescription>
                  <p className="text-sm text-amber-800 font-medium mb-2">Development Mode</p>
                  <p className="text-sm text-amber-700 mb-2">Reset token: <code className="bg-amber-100 px-1 rounded">{resetToken.substring(0, 20)}...</code></p>
                  <Link 
                    to={`/reset-password?token=${resetToken}`}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Click here to reset password →
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            <Link to="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 
              className="text-2xl font-bold text-center text-slate-900 mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Forgot Password
            </h1>
            <p className="text-center text-slate-500 mb-8">
              Enter your email and we'll send you a reset link
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    data-testid="forgot-email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-6 font-semibold btn-hover-lift"
                data-testid="forgot-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            <p className="text-center text-slate-500 mt-6">
              Remember your password?{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
