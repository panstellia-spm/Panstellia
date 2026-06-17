import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ProductProvider } from './context/ProductContext';
import ErrorBoundary from './components/ErrorBoundary';

import Layout from './components/Layout/Layout';
import ScrollToTopOnNavigation from './components/ScrollToTopOnNavigation';


// Pages are split by route so the first visit only downloads the active page.
const HomePage = lazy(() => import('./pages/Home'));
const ProductsPage = lazy(() => import('./pages/Products'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetail'));
const LoginPage = lazy(() => import('./pages/Login'));
const SignupPage = lazy(() => import('./pages/Signup'));
const CartPage = lazy(() => import('./pages/Cart'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
const WishlistPage = lazy(() => import('./pages/Wishlist'));
const OrdersPage = lazy(() => import('./pages/Orders'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccess'));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetails'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'));
const AdminRouter = lazy(() => import('./pages/admin/index'));
const AboutUsPage = lazy(() => import('./pages/AboutUs'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicy'));
const TermsConditionsPage = lazy(() => import('./pages/TermsConditions'));
const ShippingPolicyPage = lazy(() => import('./pages/ShippingPolicy'));
const ElegantSparkPage = lazy(() => import('./pages/ElegantSpark'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));



import { useAuth } from './context/AuthContext';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ScrollToTopOnNavigation />
          <AuthProvider>

            <ProductProvider>
              <CartProvider>
                <WishlistProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="category/elegant-spark" element={<ElegantSparkPage />} />
                    <Route path="product/:id" element={<ProductDetailPage />} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="signup" element={<SignupPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="cart" element={<CartPage />} />

                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="about-us" element={<AboutUsPage />} />
                    <Route path="privacy" element={<PrivacyPolicyPage />} />
                    <Route path="terms" element={<TermsConditionsPage />} />
                    <Route path="shipping" element={<ShippingPolicyPage />} />
                    
                    {/* Protected Routes */}
                    <Route 
                      path="checkout" 
                      element={
                        <ProtectedRoute>
                          <CheckoutPage />
                        </ProtectedRoute>
                      } 
                    />

                    <Route 
                      path="orders" 
                      element={
                        <ProtectedRoute>
                          <OrdersPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="order/:id"
                      element={
                        <ProtectedRoute>
                          <OrderDetailsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route 
                      path="order-success"
                      element={
                        <ProtectedRoute>
                          <OrderSuccessPage />
                        </ProtectedRoute>
                      }
                    />

                    
                    {/* Admin Routes */}
                    <Route 
                      path="admin/*" 
                      element={
                        <AdminRoute>
                          <AdminRouter />
                        </AdminRoute>
                      } 
                    />
                  </Route>
                  
                  {/* Catch all - 404 page */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </WishlistProvider>
          </CartProvider>
        </ProductProvider>
      </AuthProvider>
      
      {/* Toast Notifications */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
