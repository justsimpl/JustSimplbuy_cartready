import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Star, ExternalLink, TrendingDown, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ProductCard = ({ product, onWishlistChange, isInWishlist = false }) => {
  const { user, getAuthHeader } = useAuth();
  const [inWishlist, setInWishlist] = useState(isInWishlist);
  const [loading, setLoading] = useState(false);

  const discount = Math.round(((product.original_price - product.price) / product.original_price) * 100);
  const sparklineData = product.price_history?.slice(-14).map(p => ({ price: p.price })) || [];

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to add items to wishlist');
      return;
    }

    setLoading(true);
    try {
      if (inWishlist) {
        await axios.delete(`${API}/wishlist/${product.id}`, {
          headers: getAuthHeader()
        });
        toast.success('Removed from wishlist');
      } else {
        await axios.post(`${API}/wishlist`, { product_id: product.id }, {
          headers: getAuthHeader()
        });
        toast.success('Added to wishlist');
      }
      setInWishlist(!inWishlist);
      onWishlistChange?.();
    } catch (error) {
      toast.error('Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="product-card group animate-fade-in-up"
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3">
            <Badge className="discount-badge flex items-center gap-1" data-testid={`product-discount-${product.id}`}>
              <TrendingDown className="w-3 h-3" />
              {discount}% OFF
            </Badge>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          disabled={loading}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
            inWishlist 
              ? 'bg-red-500 text-white' 
              : 'bg-white/90 text-slate-600 hover:bg-white hover:text-red-500'
          }`}
          data-testid={`wishlist-btn-${product.id}`}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Prime Badge */}
        {product.prime_eligible && (
          <div className="absolute bottom-3 left-3">
            <span className="prime-badge text-xs px-2 py-1 rounded font-bold">
              prime
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Brand & Category */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-indigo-600" data-testid={`product-brand-${product.id}`}>
            {product.brand}
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 capitalize">{product.category}</span>
        </div>

        {/* Title */}
        <h3 
          className="font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors"
          style={{ fontFamily: 'var(--font-heading)' }}
          data-testid={`product-title-${product.id}`}
        >
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'star-filled fill-current' : 'star-empty'}`}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">
            {product.rating} ({product.reviews_count.toLocaleString()})
          </span>
        </div>

        {/* Price History Sparkline */}
        {sparklineData.length > 0 && (
          <div className="sparkline-container mb-3">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="price-current text-xl" data-testid={`product-price-${product.id}`}>
            ${product.price.toFixed(2)}
          </span>
          {discount > 0 && (
            <span className="price-original text-sm">
              ${product.original_price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="flex items-center justify-between">
          <span className={`stock-badge ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
            {product.in_stock ? 'In Stock' : 'Out of Stock'}
          </span>
          
          <Button
            size="sm"
            className="amazon-btn text-xs px-3 py-1.5"
            onClick={(e) => {
              e.preventDefault();
              window.open(product.affiliate_url, '_blank');
            }}
            data-testid={`buy-btn-${product.id}`}
          >
            <ShoppingCart className="w-3 h-3" />
            Buy
          </Button>
        </div>
      </div>
    </Link>
  );
};
