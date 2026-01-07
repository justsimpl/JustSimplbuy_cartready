import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import axios from 'axios';
import { Laptop, Book, Shirt, Home as HomeIcon, Dumbbell, Sparkles, Gamepad2, Car, Heart, Flower, ChevronRight, Loader2 } from 'lucide-react';

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

const CATEGORY_COLORS = {
  electronics: 'from-blue-500 to-indigo-600',
  books: 'from-amber-500 to-orange-600',
  fashion: 'from-pink-500 to-rose-600',
  home: 'from-green-500 to-emerald-600',
  sports: 'from-cyan-500 to-teal-600',
  beauty: 'from-purple-500 to-violet-600',
  toys: 'from-red-500 to-rose-600',
  automotive: 'from-slate-500 to-gray-600',
  health: 'from-rose-500 to-pink-600',
  garden: 'from-lime-500 to-green-600',
};

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

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

  return (
    <div className="min-h-screen bg-white" data-testid="categories-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 
          className="text-4xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          All Categories
        </h1>
        <p className="text-slate-500 mb-12">
          Browse products across all Amazon categories
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const IconComponent = CATEGORY_ICONS[category.id] || Laptop;
            const gradient = CATEGORY_COLORS[category.id] || 'from-indigo-500 to-purple-600';
            
            return (
              <Link
                key={category.id}
                to={`/search?category=${category.id}`}
                className={`group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br ${gradient} text-white card-hover animate-fade-in-up stagger-${index % 5 + 1}`}
                data-testid={`category-card-${category.id}`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full transform translate-x-16 -translate-y-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full transform -translate-x-12 translate-y-12" />
                </div>
                
                <div className="relative">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {category.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
                    <span>Browse products</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
