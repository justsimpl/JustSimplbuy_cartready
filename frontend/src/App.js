import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { Navbar } from "./components/Navbar";

// Pages
import HomePage from "./pages/Home";
import SearchPage from "./pages/Search";
import ProductDetailPage from "./pages/ProductDetail";
import ComparePage from "./pages/Compare";
import DashboardPage from "./pages/Dashboard";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import CategoriesPage from "./pages/Categories";
import WishlistPage from "./pages/Wishlist";
import AlertsPage from "./pages/Alerts";

// Layout component for pages that need navbar
const Layout = ({ children, showNavbar = true }) => {
  return (
    <div className="app-container">
      {showNavbar && <Navbar />}
      {children}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pages with their own navbar or no navbar */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          
          {/* Auth pages - no navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
