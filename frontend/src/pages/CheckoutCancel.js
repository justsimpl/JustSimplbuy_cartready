import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { XCircle, ArrowLeft, ShoppingCart, HelpCircle } from 'lucide-react';

export default function CheckoutCancelPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-slate-50" data-testid="checkout-cancel-page">
      <Navbar />
      
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Payment Cancelled
          </h1>
          <p className="text-slate-500 mb-8">
            Your payment was cancelled. Don't worry - your cart items are still saved.
          </p>

          <div className="space-y-3">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate('/checkout')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Return to Cart
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Need help? Contact our support team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
