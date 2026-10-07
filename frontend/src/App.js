import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { Navbar } from "./components/Navbar";
import { AdminRoute } from "./components/AdminRoute";

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

// Cart & Checkout Pages
import CartPage from "./pages/Cart";
import CheckoutPage from "./pages/Checkout";
import CheckoutSuccessPage from "./pages/CheckoutSuccess";
import CheckoutCancelPage from "./pages/CheckoutCancel";

// Admin Pages
import AdminLoginPage from "./pages/admin/AdminLogin";
import AdminForgotPasswordPage from "./pages/admin/AdminForgotPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminShipments from "./pages/admin/AdminShipments";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";

// Auth Pages
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";

// When Shopify is the store, shoppers are sent there and this app only serves /admin
const SHOPIFY_STORE_URL = process.env.REACT_APP_SHOPIFY_STORE_URL;

const ShopifyRedirect = () => {
  useEffect(() => {
    window.location.replace(SHOPIFY_STORE_URL);
  }, []);
  return null;
};

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
          {SHOPIFY_STORE_URL ? (
            <Route path="*" element={<ShopifyRedirect />} />
          ) : (
          <>
          {/* Pages with their own navbar or no navbar */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          
          {/* Cart & Checkout */}
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          
          {/* Auth pages - no navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </>
          )}

          {/* Admin login - public */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Password Reset - public */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />

          {/* Protected Admin pages */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
          <Route path="/admin/shipments" element={<AdminRoute><AdminShipments /></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
