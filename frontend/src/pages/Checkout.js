import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  CreditCard, Truck, CheckCircle, Loader2, MapPin, 
  ChevronRight, Lock, ShoppingBag, ArrowLeft
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CheckoutPage() {
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
  
  // Shipping form
  const [useExistingAddress, setUseExistingAddress] = useState(true);
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '', address_line1: '', address_line2: '',
    city: '', state: '', zip_code: '', country: 'USA', phone: ''
  });
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [cartRes, profileRes] = await Promise.all([
        axios.get(`${API}/cart`, { headers: getAuthHeader() }),
        axios.get(`${API}/user/profile`, { headers: getAuthHeader() })
      ]);
      
      if (!cartRes.data.items || cartRes.data.items.length === 0) {
        toast.error('Your cart is empty');
        navigate('/cart');
        return;
      }
      
      setCart(cartRes.data);
      setProfile(profileRes.data);
      
      // Pre-fill shipping address
      if (profileRes.data.shipping_address?.address_line1) {
        setShippingAddress(profileRes.data.shipping_address);
        setUseExistingAddress(true);
      } else {
        setUseExistingAddress(false);
        setShippingAddress({
          ...shippingAddress,
          full_name: profileRes.data.name || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load checkout data');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const validateShipping = () => {
    const addr = useExistingAddress && profile?.shipping_address ? profile.shipping_address : shippingAddress;
    if (!addr.full_name || !addr.address_line1 || !addr.city || !addr.state || !addr.zip_code) {
      toast.error('Please fill in all required address fields');
      return false;
    }
    return true;
  };

  const handleContinueToPayment = () => {
    if (validateShipping()) {
      setStep(2);
    }
  };

  const handleContinueToReview = () => {
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    setProcessing(true);
    
    try {
      const checkoutData = {
        origin_url: window.location.origin,
        shipping_address: useExistingAddress ? null : shippingAddress,
        use_saved_address: useExistingAddress,
        payment_method: paymentMethod
      };
      
      const response = await axios.post(
        `${API}/checkout/create-session`,
        checkoutData,
        { headers: getAuthHeader() }
      );
      
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create checkout session');
      setProcessing(false);
    }
  };

  const getActiveAddress = () => {
    return useExistingAddress && profile?.shipping_address ? profile.shipping_address : shippingAddress;
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
    <div className="min-h-screen bg-slate-50" data-testid="checkout-page">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cart')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cart
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[
            { num: 1, label: 'Shipping', icon: Truck },
            { num: 2, label: 'Payment', icon: CreditCard },
            { num: 3, label: 'Review', icon: CheckCircle }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => s.num < step && setStep(s.num)}
                disabled={s.num > step}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  step === s.num 
                    ? 'bg-indigo-600 text-white' 
                    : step > s.num 
                      ? 'bg-green-100 text-green-700 cursor-pointer' 
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
              {idx < 2 && (
                <ChevronRight className={`w-5 h-5 mx-2 ${step > s.num ? 'text-green-500' : 'text-slate-300'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="shipping-step">
                <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <Truck className="w-5 h-5" /> Shipping Address
                </h2>

                {profile?.shipping_address?.address_line1 && (
                  <div className="mb-6">
                    <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        checked={useExistingAddress}
                        onChange={() => setUseExistingAddress(true)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{profile.shipping_address.full_name}</p>
                        <p className="text-sm text-slate-600">
                          {profile.shipping_address.address_line1}
                          {profile.shipping_address.address_line2 && `, ${profile.shipping_address.address_line2}`}
                        </p>
                        <p className="text-sm text-slate-600">
                          {profile.shipping_address.city}, {profile.shipping_address.state} {profile.shipping_address.zip_code}
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 mb-6">
                  <input
                    type="radio"
                    checked={!useExistingAddress}
                    onChange={() => setUseExistingAddress(false)}
                  />
                  <span className="font-medium">Use a different address</span>
                </label>

                {!useExistingAddress && (
                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={shippingAddress.full_name}
                        onChange={(e) => setShippingAddress({...shippingAddress, full_name: e.target.value})}
                        data-testid="shipping-name"
                      />
                    </div>
                    <div>
                      <Label>Address Line 1 *</Label>
                      <Input
                        value={shippingAddress.address_line1}
                        onChange={(e) => setShippingAddress({...shippingAddress, address_line1: e.target.value})}
                        placeholder="Street address"
                        data-testid="shipping-address1"
                      />
                    </div>
                    <div>
                      <Label>Address Line 2</Label>
                      <Input
                        value={shippingAddress.address_line2}
                        onChange={(e) => setShippingAddress({...shippingAddress, address_line2: e.target.value})}
                        placeholder="Apt, suite, unit, etc."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>City *</Label>
                        <Input
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                          data-testid="shipping-city"
                        />
                      </div>
                      <div>
                        <Label>State *</Label>
                        <Input
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                          data-testid="shipping-state"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>ZIP Code *</Label>
                        <Input
                          value={shippingAddress.zip_code}
                          onChange={(e) => setShippingAddress({...shippingAddress, zip_code: e.target.value})}
                          data-testid="shipping-zip"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 h-12"
                  onClick={handleContinueToPayment}
                  data-testid="continue-to-payment"
                >
                  Continue to Payment <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="payment-step">
                <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Payment Method
                </h2>

                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="card" id="card" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Credit / Debit Card</p>
                      <p className="text-sm text-slate-500">Visa, Mastercard, Amex, Discover</p>
                    </div>
                    <div className="flex gap-1">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Visa</span>
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">MC</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'affirm' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="affirm" id="affirm" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Affirm</p>
                      <p className="text-sm text-slate-500">Pay over time with 0% APR available</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">BNPL</span>
                  </label>

                  <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'klarna' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="klarna" id="klarna" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Klarna</p>
                      <p className="text-sm text-slate-500">Pay in 4 interest-free payments</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded">BNPL</span>
                  </label>

                  <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'afterpay_clearpay' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="afterpay_clearpay" id="afterpay" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Afterpay</p>
                      <p className="text-sm text-slate-500">Pay in 4 installments, every 2 weeks</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded">BNPL</span>
                  </label>
                </RadioGroup>

                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleContinueToReview}
                    data-testid="continue-to-review"
                  >
                    Review Order <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6" data-testid="review-step">
                {/* Shipping Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Shipping Address
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Edit</Button>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-900">{getActiveAddress().full_name}</p>
                    <p>{getActiveAddress().address_line1}</p>
                    {getActiveAddress().address_line2 && <p>{getActiveAddress().address_line2}</p>}
                    <p>{getActiveAddress().city}, {getActiveAddress().state} {getActiveAddress().zip_code}</p>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Payment Method
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Edit</Button>
                  </div>
                  <p className="text-slate-600 capitalize">
                    {paymentMethod === 'card' ? 'Credit / Debit Card' : 
                     paymentMethod === 'afterpay_clearpay' ? 'Afterpay' : paymentMethod}
                  </p>
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Order Items ({cart.item_count})
                  </h3>
                  <div className="space-y-3">
                    {cart.items.map((item) => (
                      <div key={item.product_id} className="flex items-center gap-3">
                        <img
                          src={item.product?.image_url}
                          alt={item.product?.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{item.product?.title}</p>
                          <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">${item.item_total?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12"
                    onClick={handlePlaceOrder}
                    disabled={processing}
                    data-testid="place-order-btn"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Place Order - ${cart.total.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-4">
              <h3 className="font-semibold text-slate-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-2 text-sm">
                    <img
                      src={item.product?.image_url}
                      alt=""
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-slate-700">{item.product?.title}</p>
                      <p className="text-slate-400">x{item.quantity}</p>
                    </div>
                    <p className="font-medium">${item.item_total?.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>${cart.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span className="text-green-600">FREE</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t border-slate-200 pt-2">
                  <div className="flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>${cart.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Lock className="w-4 h-4" />
                <span>Secure checkout powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
