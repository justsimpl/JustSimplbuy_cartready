import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Heart, Bell, Bookmark, TrendingUp, DollarSign, Package, 
  Trash2, ExternalLink, Loader2, ChevronRight 
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  
  const [wishlist, setWishlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wishlist');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [wishlistRes, alertsRes, searchesRes] = await Promise.all([
        axios.get(`${API}/wishlist`, { headers: getAuthHeader() }),
        axios.get(`${API}/alerts`, { headers: getAuthHeader() }),
        axios.get(`${API}/saved-searches`, { headers: getAuthHeader() })
      ]);
      
      setWishlist(wishlistRes.data);
      setAlerts(alertsRes.data);
      setSavedSearches(searchesRes.data);
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
          <p className="text-slate-500">Track your wishlist, price alerts, and saved searches</p>
        </div>

        {/* Stats Grid - Bento Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="stats-grid">
          <div className="dashboard-stat-card col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm text-slate-500">Wishlist Items</span>
            </div>
            <div className="dashboard-stat-value" data-testid="wishlist-count">{wishlist.length}</div>
          </div>
          
          <div className="dashboard-stat-card bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">Active Alerts</span>
            </div>
            <div className="dashboard-stat-value" data-testid="alerts-count">{alerts.length}</div>
          </div>
          
          <div className="dashboard-stat-card bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-slate-500">Total Savings</span>
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
              <span className="text-sm text-slate-500">Saved Searches</span>
            </div>
            <div className="dashboard-stat-value" data-testid="searches-count">{savedSearches.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
          {[
            { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlist.length },
            { id: 'alerts', label: 'Price Alerts', icon: Bell, count: alerts.length },
            { id: 'searches', label: 'Saved Searches', icon: Bookmark, count: savedSearches.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
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
                        className="w-20 h-20 object-cover rounded-xl cursor-pointer"
                        onClick={() => navigate(`/product/${item.product_id}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="font-semibold text-slate-900 truncate cursor-pointer hover:text-indigo-600"
                          onClick={() => navigate(`/product/${item.product_id}`)}
                        >
                          {item.product.title}
                        </h4>
                        <p className="text-sm text-slate-500">{item.product.brand}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-indigo-600 mono">${item.product.price.toFixed(2)}</span>
                          {item.product.original_price > item.product.price && (
                            <span className="text-sm text-slate-400 line-through mono">
                              ${item.product.original_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Mini sparkline */}
                      <div className="hidden sm:block w-24 h-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={item.product.price_history?.slice(-7).map(p => ({ price: p.price }))}>
                            <Line type="monotone" dataKey="price" stroke="#4F46E5" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="amazon-btn text-xs"
                          onClick={() => window.open(item.product.affiliate_url, '_blank')}
                        >
                          Buy <ExternalLink className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromWishlist(item.product_id)}
                          data-testid={`remove-wishlist-${item.product_id}`}
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                        </Button>
                      </div>
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
                    <div key={alert.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors" data-testid={`alert-item-${alert.id}`}>
                      <img 
                        src={alert.product.image_url} 
                        alt={alert.product.title}
                        className="w-16 h-16 object-cover rounded-xl cursor-pointer"
                        onClick={() => navigate(`/product/${alert.product_id}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="font-semibold text-slate-900 truncate cursor-pointer hover:text-indigo-600"
                          onClick={() => navigate(`/product/${alert.product_id}`)}
                        >
                          {alert.product.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="text-slate-500">
                            Current: <span className="font-medium text-slate-700">${alert.product.price.toFixed(2)}</span>
                          </span>
                          <span className="text-slate-500">
                            Target: <span className="font-medium text-green-600">${alert.target_price.toFixed(2)}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        alert.product.price <= alert.target_price 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {alert.product.price <= alert.target_price ? 'Price Hit!' : 'Watching'}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAlert(alert.id)}
                        data-testid={`delete-alert-${alert.id}`}
                      >
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
                  <p className="text-slate-500 mb-4">Save your searches to quickly access them later</p>
                  <Button onClick={() => navigate('/search')}>Start Searching</Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {savedSearches.map(search => (
                    <div 
                      key={search.id} 
                      className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(search.query)}`)}
                      data-testid={`saved-search-${search.id}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Bookmark className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{search.query}</h4>
                        <p className="text-sm text-slate-500">
                          Saved on {new Date(search.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); deleteSavedSearch(search.id); }}
                        data-testid={`delete-search-${search.id}`}
                      >
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
  );
}
