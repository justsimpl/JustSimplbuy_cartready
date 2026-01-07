import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    } else if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    </div>
  );
}
