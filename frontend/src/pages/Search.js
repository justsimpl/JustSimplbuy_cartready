import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Filter, X, ChevronLeft, ChevronRight, Loader2, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter states
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'relevance');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [primeOnly, setPrimeOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (category) params.append('category', category);
        if (priceRange[0] > 0) params.append('min_price', priceRange[0]);
        if (priceRange[1] < 2000) params.append('max_price', priceRange[1]);
        if (minRating) params.append('min_rating', minRating);
        if (sortBy) params.append('sort_by', sortBy);
        params.append('page', page);
        params.append('limit', 12);

        const response = await axios.get(`${API}/products?${params.toString()}`);
        let filteredProducts = response.data.products;
        
        if (primeOnly) {
          filteredProducts = filteredProducts.filter(p => p.prime_eligible);
        }
        if (inStockOnly) {
          filteredProducts = filteredProducts.filter(p => p.in_stock);
        }
        
        setProducts(filteredProducts);
        setTotalResults(response.data.total);
        setTotalPages(response.data.total_pages);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [query, category, priceRange, minRating, sortBy, page, primeOnly, inStockOnly]);

  const handleSaveSearch = async () => {
    if (!user) {
      toast.error('Please sign in to save searches');
      return;
    }

    try {
      await axios.post(`${API}/saved-searches`, {
        query: query || 'All Products',
        filters: { category, minRating, sortBy, priceRange }
      }, { headers: getAuthHeader() });
      toast.success('Search saved!');
    } catch (error) {
      toast.error('Failed to save search');
    }
  };

  const clearFilters = () => {
    setCategory('');
    setPriceRange([0, 2000]);
    setMinRating('');
    setPrimeOnly(false);
    setInStockOnly(false);
    setPage(1);
  };

  const FilterSidebar = () => (
    <div className={`filter-sidebar ${sidebarOpen ? 'open' : ''}`} data-testid="filter-sidebar">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
          Filters
        </h3>
        <button onClick={clearFilters} className="text-sm text-indigo-600 hover:underline" data-testid="clear-filters-btn">
          Clear All
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-700 mb-3">Category</h4>
        <Select value={category} onValueChange={setCategory} data-testid="category-select">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-700 mb-3">Price Range</h4>
        <div className="px-2">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={0}
            max={2000}
            step={10}
            className="mb-2"
            data-testid="price-slider"
          />
          <div className="flex justify-between text-sm text-slate-500">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Rating Filter */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-700 mb-3">Minimum Rating</h4>
        <Select value={minRating} onValueChange={setMinRating} data-testid="rating-select">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any Rating</SelectItem>
            <SelectItem value="4">4+ Stars</SelectItem>
            <SelectItem value="4.5">4.5+ Stars</SelectItem>
            <SelectItem value="4.7">4.7+ Stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="prime"
            checked={primeOnly}
            onCheckedChange={setPrimeOnly}
            data-testid="prime-checkbox"
          />
          <label htmlFor="prime" className="text-sm text-slate-700 cursor-pointer">
            Prime Eligible Only
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="instock"
            checked={inStockOnly}
            onCheckedChange={setInStockOnly}
            data-testid="instock-checkbox"
          />
          <label htmlFor="instock" className="text-sm text-slate-700 cursor-pointer">
            In Stock Only
          </label>
        </div>
      </div>

      {/* Mobile Close Button */}
      <button
        className="lg:hidden absolute top-4 right-4 p-2"
        onClick={() => setSidebarOpen(false)}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" data-testid="search-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {query ? `Results for "${query}"` : category ? `${categories.find(c => c.id === category)?.name || 'Category'}` : 'All Products'}
            </h1>
            <p className="text-slate-500 mt-1">{totalResults} products found</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-filter-btn"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>

            {/* Save Search */}
            <Button
              variant="outline"
              onClick={handleSaveSearch}
              data-testid="save-search-btn"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save Search
            </Button>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy} data-testid="sort-select">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block">
            <FilterSidebar />
          </div>

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
              <div onClick={e => e.stopPropagation()}>
                <FilterSidebar />
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20" data-testid="no-results">
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No products found</h3>
                <p className="text-slate-500 mb-4">Try adjusting your filters or search terms</p>
                <Button onClick={clearFilters}>Clear Filters</Button>
              </div>
            ) : (
              <>
                <div className="product-grid" data-testid="products-grid">
                  {products.map((product, index) => (
                    <div key={product.id} className={`stagger-${index % 5 + 1}`}>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination mt-8" data-testid="pagination">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      data-testid="prev-page-btn"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      data-testid="next-page-btn"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
