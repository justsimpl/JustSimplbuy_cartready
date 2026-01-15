import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ShoppingCart, Trash2, Minus, Plus, Loader2, ArrowRight, 
  Package, ShoppingBag, CreditCard
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CartPage() {
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0, item_count: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/cart');
      return;
    }
    fetchCart();
  }, [user]);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`, { headers: getAuthHeader() });
      setCart(response.data);
    } catch (error) {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    setUpdating(productId);
    try {
      const response = await axios.put(
        `${API}/cart/update/${productId}`,
        { quantity: newQuantity },
        { headers: getAuthHeader() }
      );
      setCart(response.data);
    } catch (error) {
      toast.error('Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId) => {
    setUpdating(productId);
    try {
      const response = await axios.delete(`${API}/cart/remove/${productId}`, { headers: getAuthHeader() });
      setCart(response.data);
      toast.success('Item removed');
    } catch (error) {
      toast.error('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    if (!window.confirm('Clear entire cart?')) return;
    try {
      const response = await axios.delete(`${API}/cart/clear`, { headers: getAuthHeader() });
      setCart(response.data);
      toast.success('Cart cleared');
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="cart-page">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
            <ShoppingCart className="inline w-8 h-8 mr-3" />
            Shopping Cart
          </h1>
          {cart.items.length > 0 && (
            <Button variant="outline" onClick={clearCart} className="text-red-600 hover:text-red-700">
              Clear Cart
            </Button>
          )}
        </div>

        {cart.items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 text-center py-20">
            <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6">Browse our products and add items to your cart</p>
            <Button onClick={() => navigate('/search')} className="bg-indigo-600 hover:bg-indigo-700">
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div 
                  key={item.product_id} 
                  className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4"
                  data-testid={`cart-item-${item.product_id}`}
                >
                  <img
                    src={item.product?.image_url || '/placeholder.png'}
                    alt={item.product?.title}
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/product/${item.product_id}`)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/product/${item.product_id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600 line-clamp-2"
                    >
                      {item.product?.title}
                    </Link>
                    <p className="text-sm text-slate-500 mt-1">{item.product?.brand}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={updating === item.product_id || item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-10 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={updating === item.product_id}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">${item.item_total?.toFixed(2)}</p>
                        <p className="text-sm text-slate-500">${item.product?.price?.toFixed(2)} each</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-red-500"
                    onClick={() => removeItem(item.product_id)}
                    disabled={updating === item.product_id}
                    data-testid={`remove-item-${item.product_id}`}
                  >
                    {updating === item.product_id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({cart.item_count} items)</span>
                    <span>${cart.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping</span>
                    <span className="text-green-600">FREE</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-lg font-bold text-slate-900">
                      <span>Total</span>
                      <span>${cart.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
                  onClick={() => navigate('/checkout')}
                  data-testid="checkout-btn"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500 mb-2">Buy Now Pay Later available</p>
                  <div className="flex justify-center gap-2 text-xs text-slate-400">
                    <span className="px-2 py-1 bg-slate-100 rounded">Affirm</span>
                    <span className="px-2 py-1 bg-slate-100 rounded">Klarna</span>
                    <span className="px-2 py-1 bg-slate-100 rounded">Afterpay</span>
                  </div>
                </div>

                <Link 
                  to="/search" 
                  className="block text-center text-indigo-600 hover:underline mt-4 text-sm"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
