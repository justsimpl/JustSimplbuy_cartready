import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Search, User, Heart, Bell, Menu, X, TrendingUp, LogOut, LayoutDashboard } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-200/50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
              PriceWise
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, brands, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-12 pr-4 rounded-full border-2 border-slate-200 focus:border-indigo-500 focus:outline-none search-glow transition-all text-sm"
                data-testid="nav-search-input"
              />
            </div>
          </form>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/categories" className="nav-link" data-testid="nav-categories">
              Categories
            </Link>
            <Link to="/compare" className="nav-link" data-testid="nav-compare">
              Compare
            </Link>

            {user ? (
              <>
                <Link to="/wishlist" className="p-2 rounded-lg hover:bg-slate-100 transition-colors" data-testid="nav-wishlist">
                  <Heart className="w-5 h-5 text-slate-600" />
                </Link>
                <Link to="/alerts" className="p-2 rounded-lg hover:bg-slate-100 transition-colors" data-testid="nav-alerts">
                  <Bell className="w-5 h-5 text-slate-600" />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2" data-testid="nav-user-menu">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium">{user.name?.split(' ')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="nav-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/wishlist')} data-testid="nav-wishlist-menu">
                      <Heart className="w-4 h-4 mr-2" />
                      Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/alerts')} data-testid="nav-alerts-menu">
                      <Bell className="w-4 h-4 mr-2" />
                      Price Alerts
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="nav-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/login')} data-testid="nav-login">
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6"
                  data-testid="nav-register"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="nav-mobile-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200" data-testid="nav-mobile-menu">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-12 pr-4 rounded-full border-2 border-slate-200 focus:border-indigo-500 focus:outline-none"
                  data-testid="nav-mobile-search"
                />
              </div>
            </form>
            <div className="flex flex-col gap-2">
              <Link to="/categories" className="px-4 py-2 hover:bg-slate-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Categories
              </Link>
              <Link to="/compare" className="px-4 py-2 hover:bg-slate-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Compare
              </Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="px-4 py-2 hover:bg-slate-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/wishlist" className="px-4 py-2 hover:bg-slate-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    Wishlist
                  </Link>
                  <Link to="/alerts" className="px-4 py-2 hover:bg-slate-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    Price Alerts
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="px-4 py-2 text-left hover:bg-slate-100 rounded-lg text-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-2 hover:bg-slate-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                  <Link to="/register" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-center" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
