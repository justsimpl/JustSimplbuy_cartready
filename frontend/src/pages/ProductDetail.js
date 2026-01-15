import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Star, Heart, Bell, ExternalLink, ShoppingCart, TrendingDown, 
  Check, ChevronLeft, Plus, Share2, Loader2 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API}/products/${id}`);
        setProduct(response.data);
        
        // Check wishlist and alerts if user is logged in
        if (user) {
          const [wishlistRes, alertsRes] = await Promise.all([
            axios.get(`${API}/wishlist`, { headers: getAuthHeader() }),
            axios.get(`${API}/alerts`, { headers: getAuthHeader() })
          ]);
          
          setInWishlist(wishlistRes.data.some(item => item.product_id === id));
          setHasAlert(alertsRes.data.some(alert => alert.product_id === id));
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Product not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, user, getAuthHeader, navigate]);

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      navigate('/login');
      return;
    }

    try {
      if (inWishlist) {
        await axios.delete(`${API}/wishlist/${id}`, { headers: getAuthHeader() });
        toast.success('Removed from wishlist');
      } else {
        await axios.post(`${API}/wishlist`, { product_id: id }, { headers: getAuthHeader() });
        toast.success('Added to wishlist');
      }
      setInWishlist(!inWishlist);
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleCreateAlert = async () => {
    if (!user) {
      toast.error('Please sign in to create alerts');
      navigate('/login');
      return;
    }

    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      toast.error('Please enter a valid target price');
      return;
    }

    try {
      await axios.post(`${API}/alerts`, {
        product_id: id,
        target_price: parseFloat(targetPrice)
      }, { headers: getAuthHeader() });
      
      toast.success(`Alert set for $${targetPrice}`);
      setHasAlert(true);
      setAlertDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create alert');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;
  const priceHistory = product.price_history || [];
  const priceHistoryData = priceHistory.map(p => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: p.price
  }));

  const lowestPrice = priceHistory.length > 0 ? Math.min(...priceHistory.map(p => p.price)) : product.price;
  const highestPrice = priceHistory.length > 0 ? Math.max(...priceHistory.map(p => p.price)) : product.price;
  const avgPrice = priceHistory.length > 0 ? (priceHistory.reduce((acc, p) => acc + p.price, 0) / priceHistory.length).toFixed(2) : product.price.toFixed(2);

  return (
    <div className="min-h-screen bg-white" data-testid="product-detail-page">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
          data-testid="back-btn"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to results
        </button>
      </div>

      {/* Product Info */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover"
                data-testid="product-image"
              />
            </div>
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discount > 0 && (
                <Badge className="discount-badge flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {discount}% OFF
                </Badge>
              )}
              {product.prime_eligible && (
                <span className="prime-badge text-xs px-2 py-1 rounded font-bold">
                  prime
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            {/* Brand & Category */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-indigo-600" data-testid="product-brand">
                {product.brand}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-sm text-slate-500 capitalize">{product.category}</span>
            </div>

            {/* Title */}
            <h1 
              className="text-3xl font-bold text-slate-900 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
              data-testid="product-title"
            >
              {product.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'star-filled fill-current' : 'star-empty'}`}
                  />
                ))}
              </div>
              <span className="text-lg font-medium text-slate-700">{product.rating}</span>
              <span className="text-slate-500">({product.reviews_count.toLocaleString()} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4 mb-6">
              <span className="price-current text-4xl" data-testid="product-price">
                ${product.price.toFixed(2)}
              </span>
              {discount > 0 && (
                <>
                  <span className="price-original text-xl">
                    ${product.original_price.toFixed(2)}
                  </span>
                  <span className="text-green-600 font-semibold">
                    Save ${(product.original_price - product.price).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <span className={`stock-badge ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                {product.in_stock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {/* Description */}
            <p className="text-slate-600 mb-6" data-testid="product-description">
              {product.description}
            </p>

            {/* Features */}
            <div className="mb-8">
              <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Key Features
              </h3>
              <ul className="space-y-2">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <Check className="w-4 h-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 flex-1 sm:flex-none h-12"
                onClick={async () => {
                  if (!user) {
                    toast.error('Please sign in to add to cart');
                    navigate('/login');
                    return;
                  }
                  try {
                    const headers = getAuthHeader();
                    await axios.post(`${API}/cart/add`, { product_id: id, quantity: 1 }, { headers });
                    toast.success('Added to cart!');
                  } catch (error) {
                    console.error('Add to cart error:', error);
                    toast.error(error.response?.data?.detail || 'Failed to add to cart');
                  }
                }}
                disabled={!product?.in_stock}
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>

              <Button
                variant="outline"
                className={`rounded-full px-6 ${inWishlist ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                onClick={handleWishlistToggle}
                data-testid="wishlist-toggle-btn"
              >
                <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
              </Button>

              <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className={`rounded-full px-6 ${hasAlert ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}`}
                    data-testid="alert-btn"
                  >
                    <Bell className={`w-5 h-5 ${hasAlert ? 'fill-current' : ''}`} />
                    {hasAlert ? 'Alert Set' : 'Set Price Alert'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>
                      Set Price Alert
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <p className="text-slate-600">
                      Current price: <span className="font-semibold">${product.price.toFixed(2)}</span>
                    </p>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Notify me when price drops to:
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">$</span>
                        <Input
                          type="number"
                          placeholder="Enter target price"
                          value={targetPrice}
                          onChange={(e) => setTargetPrice(e.target.value)}
                          className="flex-1"
                          data-testid="target-price-input"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateAlert} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      data-testid="create-alert-btn"
                    >
                      Create Alert
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                className="rounded-full"
                onClick={handleShare}
                data-testid="share-btn"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Compare Button */}
            <Link to={`/compare?products=${product.id}`}>
              <Button variant="outline" className="w-full" data-testid="compare-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add to Compare
              </Button>
            </Link>
          </div>
        </div>

        {/* Price History */}
        <div className="mt-16" data-testid="price-history-section">
          <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Price History (Last 30 Days)
          </h2>
          
          {/* Price Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="dashboard-stat-card">
              <div className="text-sm text-slate-500 mb-1">Lowest</div>
              <div className="text-2xl font-bold text-green-600 mono">${lowestPrice.toFixed(2)}</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="text-sm text-slate-500 mb-1">Average</div>
              <div className="text-2xl font-bold text-slate-900 mono">${avgPrice}</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="text-sm text-slate-500 mb-1">Highest</div>
              <div className="text-2xl font-bold text-red-600 mono">${highestPrice.toFixed(2)}</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={priceHistoryData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                  domain={['dataMin - 20', 'dataMax + 20']}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ASIN Info */}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl text-sm text-slate-500">
          <span className="font-medium">ASIN:</span> {product.asin}
        </div>
      </div>
    </div>
  );
}
