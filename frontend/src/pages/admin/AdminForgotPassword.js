import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { toast } from 'sonner';
import axios from 'axios';
import { TrendingUp, Mail, Loader2, ArrowLeft, CheckCircle, Shield } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminForgotPasswordPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" data-testid="admin-forgot-password-page">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
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

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-900/50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h1 
                className="text-xl font-bold text-white mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Check Your Email
              </h1>
              <p className="text-slate-400 mb-6 text-sm">
                If an admin account exists with <strong className="text-slate-300">{email}</strong>, you'll receive a password reset link.
              </p>

              {resetToken && (
                <Alert className="mb-6 bg-amber-900/30 border-amber-800 text-left">
                  <AlertDescription>
                    <p className="text-sm text-amber-400 font-medium mb-2">Development Mode</p>
                    <p className="text-sm text-amber-300 mb-2">Token: <code className="bg-amber-900/50 px-1 rounded">{resetToken.substring(0, 20)}...</code></p>
                    <Link 
                      to={`/admin/reset-password?token=${resetToken}`}
                      className="text-sm text-indigo-400 hover:underline"
                    >
                      Click here to reset password →
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

              <Link to="/admin/login">
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 
                className="text-xl font-bold text-center text-white mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Forgot Password
              </h1>
              <p className="text-center text-slate-400 mb-6 text-sm">
                Enter your admin email to reset your password
              </p>

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
                      data-testid="admin-forgot-email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-6 font-semibold"
                  data-testid="admin-forgot-submit"
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

              <p className="text-center text-slate-500 mt-6 text-sm">
                Remember your password?{' '}
                <Link to="/admin/login" className="text-indigo-400 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
