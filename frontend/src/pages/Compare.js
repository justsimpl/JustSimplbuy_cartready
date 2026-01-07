import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Plus, X, Star, Check, Minus, ShoppingCart, Search, Loader2, ExternalLink 
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get initial product IDs from URL
  useEffect(() => {
    const productIds = searchParams.get('products')?.split(',').filter(Boolean) || [];
    if (productIds.length > 0) {
      fetchProducts(productIds);
    }
  }, [searchParams]);

  const fetchProducts = async (ids) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/compare`, ids);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await axios.get(`${API}/products?query=${encodeURIComponent(searchQuery)}&limit=5`);
      setSearchResults(response.data.products);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addProduct = (product) => {
    if (products.length >= 4) {
      toast.error('Maximum 4 products can be compared');
      return;
    }
    if (products.some(p => p.id === product.id)) {
      toast.error('Product already in comparison');
      return;
    }
    setProducts([...products, product]);
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Product added to comparison');
  };

  const removeProduct = (productId) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const getComparisonValue = (product, key) => {
    switch (key) {
      case 'price':
        return `$${product.price.toFixed(2)}`;
      case 'original_price':
        return `$${product.original_price.toFixed(2)}`;
      case 'rating':
        return product.rating;
      case 'reviews':
        return product.reviews_count.toLocaleString();
      case 'in_stock':
        return product.in_stock ? 'Yes' : 'No';
      case 'prime':
        return product.prime_eligible ? 'Yes' : 'No';
      default:
        return product[key] || '-';
    }
  };

  const comparisonFields = [
    { key: 'price', label: 'Current Price' },
    { key: 'original_price', label: 'Original Price' },
    { key: 'rating', label: 'Rating' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'brand', label: 'Brand' },
    { key: 'category', label: 'Category' },
    { key: 'in_stock', label: 'In Stock' },
    { key: 'prime', label: 'Prime Eligible' },
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="compare-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 
          className="text-3xl font-bold text-slate-900 mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Compare Products
        </h1>
        <p className="text-slate-500 mb-8">Compare up to 4 products side by side</p>

        {/* Add Product Search */}
        {products.length < 4 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8" data-testid="add-product-section">
            <h3 className="font-semibold text-slate-700 mb-4">Add Product to Compare</h3>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search for a product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12"
                  data-testid="compare-search-input"
                />
              </div>
              <Button type="submit" disabled={searching} data-testid="compare-search-btn">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2" data-testid="search-results">
                {searchResults.map(product => (
                  <div 
                    key={product.id}
                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => addProduct(product)}
                  >
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{product.title}</p>
                      <p className="text-sm text-slate-500">${product.price.toFixed(2)}</p>
                    </div>
                    <Plus className="w-5 h-5 text-indigo-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comparison Table */}
        {products.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="comparison-table">
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Product Images & Names */}
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-4 text-left font-semibold text-slate-500 w-48">Product</th>
                    {products.map(product => (
                      <th key={product.id} className="p-4 min-w-[200px]">
                        <div className="relative">
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="absolute -top-2 -right-2 p-1 bg-slate-100 hover:bg-slate-200 rounded-full"
                            data-testid={`remove-${product.id}`}
                          >
                            <X className="w-4 h-4 text-slate-500" />
                          </button>
                          <Link to={`/product/${product.id}`}>
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-32 h-32 object-cover rounded-xl mx-auto mb-3"
                            />
                            <p className="font-semibold text-slate-900 text-sm line-clamp-2 hover:text-indigo-600">
                              {product.title}
                            </p>
                          </Link>
                        </div>
                      </th>
                    ))}
                    {/* Empty slots */}
                    {[...Array(4 - products.length)].map((_, i) => (
                      <th key={`empty-${i}`} className="p-4 min-w-[200px]">
                        <div className="w-32 h-32 bg-slate-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                          <Plus className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400">Add product</p>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Comparison Rows */}
                <tbody>
                  {comparisonFields.map((field, index) => (
                    <tr key={field.key} className={index % 2 === 0 ? 'bg-slate-50' : ''}>
                      <td className="p-4 font-medium text-slate-600">{field.label}</td>
                      {products.map(product => {
                        const value = getComparisonValue(product, field.key);
                        const isBest = field.key === 'price' 
                          ? product.price === Math.min(...products.map(p => p.price))
                          : field.key === 'rating'
                          ? product.rating === Math.max(...products.map(p => p.rating))
                          : false;
                        
                        return (
                          <td 
                            key={product.id} 
                            className={`p-4 text-center ${isBest ? 'text-green-600 font-semibold' : 'text-slate-700'}`}
                          >
                            {field.key === 'rating' ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-amber-500 fill-current" />
                                {value}
                              </div>
                            ) : field.key === 'in_stock' || field.key === 'prime' ? (
                              value === 'Yes' ? (
                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <Minus className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : field.key === 'price' ? (
                              <span className="mono font-semibold text-lg">{value}</span>
                            ) : (
                              value
                            )}
                          </td>
                        );
                      })}
                      {/* Empty cells */}
                      {[...Array(4 - products.length)].map((_, i) => (
                        <td key={`empty-${i}`} className="p-4 text-center text-slate-300">-</td>
                      ))}
                    </tr>
                  ))}

                  {/* Features Row */}
                  <tr className="bg-slate-50">
                    <td className="p-4 font-medium text-slate-600 align-top">Key Features</td>
                    {products.map(product => (
                      <td key={product.id} className="p-4 text-left">
                        <ul className="space-y-1">
                          {product.features.slice(0, 4).map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                    {[...Array(4 - products.length)].map((_, i) => (
                      <td key={`empty-${i}`} className="p-4 text-slate-300">-</td>
                    ))}
                  </tr>

                  {/* Buy Buttons */}
                  <tr>
                    <td className="p-4"></td>
                    {products.map(product => (
                      <td key={product.id} className="p-4 text-center">
                        <Button
                          className="amazon-btn"
                          onClick={() => window.open(product.affiliate_url, '_blank')}
                          data-testid={`buy-${product.id}`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Buy on Amazon
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </td>
                    ))}
                    {[...Array(4 - products.length)].map((_, i) => (
                      <td key={`empty-${i}`} className="p-4"></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center" data-testid="empty-compare">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              No products to compare
            </h3>
            <p className="text-slate-500 mb-6">Search and add products above to start comparing</p>
            <Button onClick={() => navigate('/search')} data-testid="browse-products-btn">
              Browse Products
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
