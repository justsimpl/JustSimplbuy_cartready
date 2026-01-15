import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Heart, Bell, Bookmark, TrendingUp, DollarSign, Package, 
  Trash2, ExternalLink, Loader2, ChevronRight, User, MapPin,
  CreditCard, ShoppingBag, Truck, Eye
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  
  const [wishlist, setWishlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  
  // Profile edit states
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [addressForm, setAddressForm] = useState({
    full_name: '', address_line1: '', address_line2: '',
    city: '', state: '', zip_code: '', country: 'USA', phone: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    card_last_four: '', card_brand: '', card_holder_name: '',
    expiry_month: '', expiry_year: '', billing_zip: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [wishlistRes, alertsRes, searchesRes, ordersRes, profileRes] = await Promise.all([
        axios.get(`${API}/wishlist`, { headers: getAuthHeader() }),
        axios.get(`${API}/alerts`, { headers: getAuthHeader() }),
        axios.get(`${API}/saved-searches`, { headers: getAuthHeader() }),
        axios.get(`${API}/user/orders`, { headers: getAuthHeader() }),
        axios.get(`${API}/user/profile`, { headers: getAuthHeader() })
      ]);
      
      setWishlist(wishlistRes.data);
      setAlerts(alertsRes.data);
      setSavedSearches(searchesRes.data);
      setOrders(ordersRes.data.orders || []);
      setProfile(profileRes.data);
      
      // Initialize forms
      setProfileForm({ name: profileRes.data.name || '', phone: profileRes.data.phone || '' });
      if (profileRes.data.shipping_address) {
        setAddressForm(profileRes.data.shipping_address);
      }
      if (profileRes.data.payment_info) {
        setPaymentForm(profileRes.data.payment_info);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await axios.delete(`${API}/wishlist/${productId}`, { headers: getAuthHeader() });
      setWishlist(wishlist.filter(item => item.product_id !== productId));
      toast.success('Removed from wishlist');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await axios.delete(`${API}/alerts/${alertId}`, { headers: getAuthHeader() });
      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast.success('Alert deleted');
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  const deleteSavedSearch = async (searchId) => {
    try {
      await axios.delete(`${API}/saved-searches/${searchId}`, { headers: getAuthHeader() });
      setSavedSearches(savedSearches.filter(search => search.id !== searchId));
      toast.success('Saved search deleted');
    } catch (error) {
      toast.error('Failed to delete saved search');
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/user/profile`, { name: profileForm.name, phone: profileForm.phone }, { headers: getAuthHeader() });
      toast.success('Profile updated');
      setEditingProfile(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/user/profile`, { shipping_address: addressForm }, { headers: getAuthHeader() });
      toast.success('Shipping address updated');
      setEditingAddress(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update address');
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/user/profile`, { payment_info: paymentForm }, { headers: getAuthHeader() });
      toast.success('Payment info updated');
      setEditingPayment(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update payment info');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const totalSavings = wishlist.reduce((acc, item) => {
    if (item.product) {
      return acc + (item.product.original_price - item.product.price);
    }
    return acc;
  }, 0);

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
    <div className="min-h-screen bg-slate-50" data-testid="dashboard-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500">Manage your account, orders, and preferences</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8" data-testid="stats-grid">
          <div className="dashboard-stat-card bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-slate-500">Orders</span>
            </div>
            <div className="dashboard-stat-value" data-testid="orders-count">{orders.length}</div>
          </div>
          
          <div className="dashboard-stat-card bg-gradient-to-br from-indigo-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm text-slate-500">Wishlist</span>
            </div>
            <div className="dashboard-stat-value" data-testid="wishlist-count">{wishlist.length}</div>
          </div>
          
          <div className="dashboard-stat-card bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">Alerts</span>
            </div>
            <div className="dashboard-stat-value" data-testid="alerts-count">{alerts.length}</div>
          </div>
          
          <div className="dashboard-stat-card bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-slate-500">Savings</span>
            </div>
            <div className="dashboard-stat-value text-green-600" data-testid="total-savings">
              ${totalSavings.toFixed(2)}
            </div>
          </div>
          
          <div className="dashboard-stat-card bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-slate-500">Searches</span>
            </div>
            <div className="dashboard-stat-value" data-testid="searches-count">{savedSearches.length}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Settings */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5" /> Profile
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)} data-testid="edit-profile-btn">
                  Edit
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-slate-900 font-medium">{profile?.name}</p>
                <p className="text-slate-500 text-sm">{profile?.email}</p>
                {profile?.phone && <p className="text-slate-500 text-sm">{profile.phone}</p>}
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Shipping Address
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingAddress(true)} data-testid="edit-address-btn">
                  {profile?.shipping_address?.address_line1 ? 'Edit' : 'Add'}
                </Button>
              </div>
              {profile?.shipping_address?.address_line1 ? (
                <div className="text-sm text-slate-600 space-y-1">
                  <p className="font-medium text-slate-900">{profile.shipping_address.full_name}</p>
                  <p>{profile.shipping_address.address_line1}</p>
                  {profile.shipping_address.address_line2 && <p>{profile.shipping_address.address_line2}</p>}
                  <p>{profile.shipping_address.city}, {profile.shipping_address.state} {profile.shipping_address.zip_code}</p>
                  <p>{profile.shipping_address.country}</p>
                  {profile.shipping_address.phone && <p>{profile.shipping_address.phone}</p>}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No shipping address saved</p>
              )}
            </div>

            {/* Payment Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Payment Method
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingPayment(true)} data-testid="edit-payment-btn">
                  {profile?.payment_info?.card_last_four ? 'Edit' : 'Add'}
                </Button>
              </div>
              {profile?.payment_info?.card_last_four ? (
                <div className="text-sm text-slate-600 space-y-1">
                  <p className="font-medium text-slate-900 capitalize">{profile.payment_info.card_brand} •••• {profile.payment_info.card_last_four}</p>
                  <p>{profile.payment_info.card_holder_name}</p>
                  <p>Expires {profile.payment_info.expiry_month}/{profile.payment_info.expiry_year}</p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No payment method saved</p>
              )}
            </div>
          </div>

          {/* Right Column - Orders & Lists */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4 overflow-x-auto">
              {[
                { id: 'orders', label: 'Orders', icon: ShoppingBag, count: orders.length },
                { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlist.length },
                { id: 'alerts', label: 'Alerts', icon: Bell, count: alerts.length },
                { id: 'searches', label: 'Searches', icon: Bookmark, count: savedSearches.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div data-testid="orders-content">
                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No orders yet</h3>
                      <p className="text-slate-500 mb-4">Start shopping to see your orders here</p>
                      <Button onClick={() => navigate('/search')}>Browse Products</Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {orders.map(order => (
                        <div key={order.id} className="p-4 hover:bg-slate-50" data-testid={`order-${order.id}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-slate-900">Order #{order.id.slice(-8).toUpperCase()}</p>
                              <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                              <span className="font-bold text-slate-900">${order.total_amount?.toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {order.items?.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1">
                                {item.product?.image_url && (
                                  <img src={item.product.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                                )}
                                <span className="text-sm text-slate-600 truncate max-w-32">
                                  {item.product?.title || item.product_id}
                                </span>
                                <span className="text-xs text-slate-400">x{item.quantity}</span>
                              </div>
                            ))}
                            {order.items?.length > 3 && (
                              <span className="text-sm text-slate-400">+{order.items.length - 3} more</span>
                            )}
                          </div>
                          
                          {order.shipment && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Truck className="w-4 h-4" />
                              <span>{order.shipment.carrier}</span>
                              {order.shipment.tracking_number && (
                                <span className="text-indigo-600">#{order.shipment.tracking_number}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Wishlist Tab */}
              {activeTab === 'wishlist' && (
                <div data-testid="wishlist-content">
                  {wishlist.length === 0 ? (
                    <div className="text-center py-16">
                      <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Your wishlist is empty</h3>
                      <p className="text-slate-500 mb-4">Start adding products you love</p>
                      <Button onClick={() => navigate('/search')}>Browse Products</Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {wishlist.map(item => item.product && (
                        <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors" data-testid={`wishlist-item-${item.product_id}`}>
                          <img 
                            src={item.product.image_url} 
                            alt={item.product.title}
                            className="w-16 h-16 object-cover rounded-xl cursor-pointer"
                            onClick={() => navigate(`/product/${item.product_id}`)}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 
                              className="font-semibold text-slate-900 truncate cursor-pointer hover:text-indigo-600"
                              onClick={() => navigate(`/product/${item.product_id}`)}
                            >
                              {item.product.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-bold text-indigo-600">${item.product.price.toFixed(2)}</span>
                              {item.product.original_price > item.product.price && (
                                <span className="text-sm text-slate-400 line-through">
                                  ${item.product.original_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeFromWishlist(item.product_id)}>
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && (
                <div data-testid="alerts-content">
                  {alerts.length === 0 ? (
                    <div className="text-center py-16">
                      <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No price alerts</h3>
                      <p className="text-slate-500 mb-4">Set alerts to get notified when prices drop</p>
                      <Button onClick={() => navigate('/search')}>Browse Products</Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {alerts.map(alert => alert.product && (
                        <div key={alert.id} className="flex items-center gap-4 p-4 hover:bg-slate-50" data-testid={`alert-${alert.id}`}>
                          <img 
                            src={alert.product.image_url} 
                            alt={alert.product.title}
                            className="w-14 h-14 object-cover rounded-xl cursor-pointer"
                            onClick={() => navigate(`/product/${alert.product_id}`)}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate">{alert.product.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm">
                              <span>Current: <span className="font-medium">${alert.product.price.toFixed(2)}</span></span>
                              <span>Target: <span className="font-medium text-green-600">${alert.target_price.toFixed(2)}</span></span>
                            </div>
                          </div>
                          <Badge className={alert.product.price <= alert.target_price ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                            {alert.product.price <= alert.target_price ? 'Hit!' : 'Watching'}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => deleteAlert(alert.id)}>
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Saved Searches Tab */}
              {activeTab === 'searches' && (
                <div data-testid="searches-content">
                  {savedSearches.length === 0 ? (
                    <div className="text-center py-16">
                      <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No saved searches</h3>
                      <p className="text-slate-500 mb-4">Save your searches to access them later</p>
                      <Button onClick={() => navigate('/search')}>Start Searching</Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {savedSearches.map(search => (
                        <div 
                          key={search.id} 
                          className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer"
                          onClick={() => navigate(`/search?q=${encodeURIComponent(search.query)}`)}
                          data-testid={`search-${search.id}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Bookmark className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{search.query}</h4>
                            <p className="text-sm text-slate-500">Saved {new Date(search.created_at).toLocaleDateString()}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteSavedSearch(search.id); }}>
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                data-testid="profile-name-input"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={profileForm.phone}
                onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
                data-testid="profile-phone-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={saving} data-testid="save-profile-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Address Dialog */}
      <Dialog open={editingAddress} onOpenChange={setEditingAddress}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Shipping Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={addressForm.full_name}
                onChange={(e) => setAddressForm({...addressForm, full_name: e.target.value})}
                data-testid="address-name-input"
              />
            </div>
            <div>
              <Label>Address Line 1</Label>
              <Input
                value={addressForm.address_line1}
                onChange={(e) => setAddressForm({...addressForm, address_line1: e.target.value})}
                placeholder="Street address"
                data-testid="address-line1-input"
              />
            </div>
            <div>
              <Label>Address Line 2 (Optional)</Label>
              <Input
                value={addressForm.address_line2}
                onChange={(e) => setAddressForm({...addressForm, address_line2: e.target.value})}
                placeholder="Apt, suite, unit, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                  data-testid="address-city-input"
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                  data-testid="address-state-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ZIP Code</Label>
                <Input
                  value={addressForm.zip_code}
                  onChange={(e) => setAddressForm({...addressForm, zip_code: e.target.value})}
                  data-testid="address-zip-input"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({...addressForm, country: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={addressForm.phone}
                onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAddress(false)}>Cancel</Button>
            <Button onClick={saveAddress} disabled={saving} data-testid="save-address-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editingPayment} onOpenChange={setEditingPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Card Holder Name</Label>
              <Input
                value={paymentForm.card_holder_name}
                onChange={(e) => setPaymentForm({...paymentForm, card_holder_name: e.target.value})}
                placeholder="John Doe"
                data-testid="payment-name-input"
              />
            </div>
            <div>
              <Label>Card Brand</Label>
              <Input
                value={paymentForm.card_brand}
                onChange={(e) => setPaymentForm({...paymentForm, card_brand: e.target.value})}
                placeholder="Visa, Mastercard, Amex, etc."
                data-testid="payment-brand-input"
              />
            </div>
            <div>
              <Label>Last 4 Digits</Label>
              <Input
                value={paymentForm.card_last_four}
                onChange={(e) => setPaymentForm({...paymentForm, card_last_four: e.target.value.slice(0, 4)})}
                placeholder="1234"
                maxLength={4}
                data-testid="payment-last4-input"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Expiry Month</Label>
                <Input
                  value={paymentForm.expiry_month}
                  onChange={(e) => setPaymentForm({...paymentForm, expiry_month: e.target.value.slice(0, 2)})}
                  placeholder="MM"
                  maxLength={2}
                  data-testid="payment-month-input"
                />
              </div>
              <div>
                <Label>Expiry Year</Label>
                <Input
                  value={paymentForm.expiry_year}
                  onChange={(e) => setPaymentForm({...paymentForm, expiry_year: e.target.value.slice(0, 4)})}
                  placeholder="YYYY"
                  maxLength={4}
                  data-testid="payment-year-input"
                />
              </div>
              <div>
                <Label>Billing ZIP</Label>
                <Input
                  value={paymentForm.billing_zip}
                  onChange={(e) => setPaymentForm({...paymentForm, billing_zip: e.target.value})}
                  placeholder="12345"
                  data-testid="payment-zip-input"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Note: For security, we only store the last 4 digits of your card. Full payment processing happens at checkout.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={saving} data-testid="save-payment-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
