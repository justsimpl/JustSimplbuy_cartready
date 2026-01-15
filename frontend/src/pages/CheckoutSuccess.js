import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  CheckCircle, Loader2, Package, Truck, Mail, 
  ArrowRight, Home, ShoppingBag
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CheckoutSuccessPage() {
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [status, setStatus] = useState('checking'); // checking, success, failed
  const [order, setOrder] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!sessionId) {
      navigate('/');
      return;
    }
    checkPaymentStatus();
  }, [user, sessionId]);

  const checkPaymentStatus = async () => {
    if (attempts >= 10) {
      setStatus('failed');
      toast.error('Payment verification timed out. Please check your email for confirmation.');
      return;
    }

    try {
      const response = await axios.get(
        `${API}/checkout/status/${sessionId}`,
        { headers: getAuthHeader() }
      );

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        setOrder(response.data.order);
        toast.success('Payment successful!');
      } else if (response.data.status === 'expired') {
        setStatus('failed');
        toast.error('Payment session expired');
      } else {
        // Still processing, poll again
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setAttempts(prev => prev + 1);
      if (attempts < 10) {
        setTimeout(checkPaymentStatus, 2000);
      } else {
        setStatus('failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="checkout-success-page">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-16">
        {status === 'checking' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verifying Payment...</h1>
            <p className="text-slate-500">Please wait while we confirm your payment.</p>
            <p className="text-sm text-slate-400 mt-4">Attempt {attempts + 1} of 10</p>
          </div>
        )}

        {status === 'success' && order && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Thank You For Your Order!
              </h1>
              <p className="text-slate-500 mb-4">
                Order #{order.id.slice(-8).toUpperCase()} has been confirmed
              </p>
              <p className="text-sm text-slate-400">
                A confirmation email has been sent to {user?.email}
              </p>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" /> Order Details
              </h2>
              
              <div className="space-y-3 mb-6">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.product?.image_url && (
                      <img src={item.product.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{item.title || item.product?.title}</p>
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Paid</span>
                  <span className="text-green-600">${order.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5" /> Shipping To
              </h2>
              {order.shipping_address && (
                <div className="text-slate-600">
                  <p className="font-medium text-slate-900">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}</p>
                </div>
              )}
            </div>

            {/* What's Next */}
            <div className="bg-indigo-50 rounded-2xl p-6">
              <h2 className="font-semibold text-indigo-900 mb-3">What's Next?</h2>
              <ul className="space-y-2 text-indigo-700">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  You'll receive a confirmation email shortly
                </li>
                <li className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  We'll notify you when your order ships
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Track your order from your dashboard
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                View Orders
              </Button>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Verification Failed</h1>
            <p className="text-slate-500 mb-6">
              We couldn't verify your payment. If you were charged, please contact support.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/cart')}>
                Return to Cart
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                View Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
