import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, TrendingUp, Star, Shield, Bell, ArrowRight, Laptop, Book, Shirt, Home as HomeIcon, Dumbbell, Sparkles, Gamepad2, Car, Heart, Flower } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ProductCard } from '../components/ProductCard';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  electronics: Laptop,
  books: Book,
  fashion: Shirt,
  home: HomeIcon,
  sports: Dumbbell,
  beauty: Sparkles,
  toys: Gamepad2,
  automotive: Car,
  health: Heart,
  garden: Flower,
};

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/products?limit=8&sort_by=rating`)
        ]);
        setCategories(categoriesRes.data);
        setFeaturedProducts(productsRes.data.products);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-gradient py-20 px-4" data-testid="hero-section">
        <div className="max-w-4xl mx-auto text-center">
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <span className="gradient-text">Buy Now Pay Later</span> any item on Amazon
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            We offer several financing options including leasing payments through Acima.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input
                type="text"
                placeholder="Search for products, brands, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 pl-16 pr-40 rounded-full border-2 border-slate-200 focus:border-indigo-500 focus:outline-none search-glow transition-all text-lg shadow-lg"
                data-testid="hero-search-input"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-12 font-semibold shadow-lg shadow-indigo-500/30 btn-hover-lift"
                data-testid="hero-search-btn"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span>10M+ Products Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span>4.9 User Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>100% Safe & Secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 bg-white" data-testid="categories-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Browse Categories
            </h2>
            <Link to="/categories" className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((category, index) => {
              const IconComponent = CATEGORY_ICONS[category.id] || Laptop;
              return (
                <Link
                  key={category.id}
                  to={`/search?category=${category.id}`}
                  className={`category-pill flex flex-col items-center py-6 animate-fade-in-up stagger-${index % 5 + 1}`}
                  data-testid={`category-${category.id}`}
                >
                  <IconComponent className="w-8 h-8 mb-2 text-indigo-600" />
                  <span>{category.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 bg-slate-50" data-testid="featured-section">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Top Rated Products
            </h2>
            <Link to="/search?sort_by=rating" className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="product-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton h-96 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="product-grid">
              {featuredProducts.map((product, index) => (
                <div key={product.id} className={`stagger-${index % 5 + 1}`}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12" style={{ fontFamily: 'var(--font-heading)' }}>
            Why Choose PriceWise?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-slate-50 card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Price History Tracking
              </h3>
              <p className="text-slate-600">
                See price trends over time and know when it's the best time to buy.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-slate-50 card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Price Drop Alerts
              </h3>
              <p className="text-slate-600">
                Set your target price and get notified when products drop to your desired price.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-slate-50 card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
                <Star className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Smart Comparisons
              </h3>
              <p className="text-slate-600">
                Compare up to 4 products side-by-side with detailed specs and pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-violet-600" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Start Saving Money Today
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Join thousands of smart shoppers who save money with PriceWise.
          </p>
          <Button
            onClick={() => navigate('/register')}
            className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-full px-10 py-6 text-lg font-bold shadow-xl btn-hover-lift"
            data-testid="cta-signup-btn"
          >
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                PriceWise
              </span>
            </div>
            <p className="text-sm">
              © 2024 PriceWise. Powered by Amazon PA-API. All product data is mocked for demo purposes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
