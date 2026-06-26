import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Heart, User, Menu, X, Search, LogOut, Home, Store, 
  Gem, CircleDot, Crown, Sparkles, Diamond, Gift, BadgePercent, Star, Shield 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useProducts } from '../../context/ProductContext';
import { getCategoryLabel } from '../../utils/categoryLabels';
import CartDrawer from '../UI/CartDrawer';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { cartItems } = useCart();
  const { wishlistItems } = useWishlist();
  const { searchProducts } = useProducts();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Detect if currently on admin panel routes for dynamic menu label
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      // Close profile dropdown when scrolling
      setIsProfileDropdownOpen(false);
      // Close search popup when scrolling
      setSearchOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSearchInput = (value) => {
    setSearchQuery(value);
    if (value.trim().length > 0) {
      const results = searchProducts(value).slice(0, 5);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const [dbNavItems, setDbNavItems] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'cms'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().navigation) {
        setDbNavItems(snapshot.data().navigation);
      }
    }, (err) => console.error("Error reading nav links:", err));
    return () => unsub();
  }, []);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const currentCategory = new URLSearchParams(location.search).get('category');

  const ICON_MAP = {
    Home, Store, Gem, CircleDot, Crown, Sparkles, Diamond, Gift, BadgePercent, Star, Shield
  };

  const navItems = dbNavItems.length > 0 
    ? dbNavItems.map(item => {
        const IconComponent = ICON_MAP[item.icon] || Gem;
        let toUrl = item.to;
        if (toUrl === '/products?category=Piercings') {
          toUrl = '/products?category=Party%20Wear';
        }

        let isActive = false;
        if (toUrl === '/') {
          isActive = location.pathname === '/';
        } else if (toUrl === '/products') {
          isActive = location.pathname === '/products' && !currentCategory;
        } else {
          const targetCat = new URLSearchParams(toUrl.split('?')[1]).get('category');
          if (targetCat) {
            isActive = location.pathname === '/products' && currentCategory === targetCat;
          } else {
            isActive = location.pathname === toUrl;
          }
        }

        let label = item.label;
        if (label === 'Gold Collection') label = 'Luxe Ring';
        if (label === 'Silver Collection') label = 'Royal Bracelets';

        return {
          to: toUrl,
          label: label,
          icon: IconComponent,
          isActive
        };
      })
    : [
        { to: '/', label: 'Home', icon: Home, isActive: location.pathname === '/' },
        { to: '/products', label: 'Shop', icon: Store, isActive: location.pathname === '/products' && !currentCategory },
        { to: '/products?category=Gold', label: getCategoryLabel('Gold'), icon: Gem, isActive: location.pathname === '/products' && currentCategory === 'Gold' },
        { to: '/products?category=Silver', label: getCategoryLabel('Silver'), icon: CircleDot, isActive: location.pathname === '/products' && currentCategory === 'Silver' },
        { to: '/products?category=Lux Wear', label: getCategoryLabel('Lux Wear'), icon: Crown, isActive: location.pathname === '/products' && currentCategory === 'Lux Wear' },
        { to: '/category/elegant-spark', label: getCategoryLabel('Elegant Spark'), icon: Sparkles, isActive: location.pathname === '/category/elegant-spark' },
        { to: '/products?category=Party%20Wear', label: getCategoryLabel('Party Wear'), icon: Diamond, isActive: location.pathname === '/products' && currentCategory === 'Party Wear' }
      ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-150 ease-out ${
        scrolled ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className={`flex items-center justify-between transition-all duration-150 ease-out ${scrolled ? 'h-14' : 'h-20'}`}>
            {/* Logo */}
            <Link to="/" className="flex items-center md:gap-2">
              <img 
                src="/favicon.svg" 
                alt="Panstellia" 
                className={`transition-all duration-150 ease-out w-auto ${scrolled ? 'h-8 md:h-10' : 'h-10 md:h-14'}`} 
              />
              <span className="hidden md:block font-serif text-xl md:text-2xl font-bold text-luxury-800">Panstellia</span>
            </Link>

            {/* Mobile Navigation Icons (Home & Shop) */}
            <div className="flex md:hidden items-center space-x-1">
              <Link 
                to="/" 
                className="p-2 text-luxury-600 hover:text-gold-600 transition-colors"
                aria-label="Home"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link 
                to="/products" 
                className="p-2 text-luxury-600 hover:text-gold-600 transition-colors"
                aria-label="Shop"
              >
                <Store className="w-5 h-5" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              {navItems.map(({ to, label, icon: Icon, isActive }) => {
                if (label === 'Shop') {
                  return (
                    <div key={to} className="relative group py-2">
                      <Link
                        to={to}
                        className={`nav-glow-link ${isActive ? 'nav-glow-link--active' : ''}`}
                        aria-label={label}
                      >
                        <Icon className="relative z-10 w-5 h-5" />
                        {isActive ? <span className="nav-active-label">{label}</span> : <span className="nav-tooltip">{label}</span>}
                      </Link>
                      
                      {/* Mega Menu Dropdown */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 pt-2 w-80 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 z-50">
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          className="bg-white shadow-2xl rounded-b-xl border border-luxury-100 p-6"
                        >
                          <h4 className="font-serif text-sm font-bold text-luxury-900 border-b border-luxury-100 pb-2 mb-3">Shop Collections</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { name: 'Gold', to: '/products?category=Gold' },
                              { name: 'Silver', to: '/products?category=Silver' },
                              { name: 'Lux Wear', to: '/products?category=Lux%20Wear' },
                              { name: 'Party Wear', to: '/products?category=Party%20Wear' },
                              { name: 'Elegant Spark', to: '/products?category=Elegant%20Spark' }
                            ].map((cat) => (
                              <Link
                                key={cat.name}
                                to={cat.to}
                                className="text-xs text-luxury-600 hover:text-gold-500 font-semibold transition-colors py-1.5 px-2 hover:bg-luxury-50 rounded"
                              >
                                {getCategoryLabel(cat.name)}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={to}
                    to={to}
                    className={`nav-glow-link ${isActive ? 'nav-glow-link--active' : ''}`}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="relative z-10 w-5 h-5" />
                    {isActive && <span className="nav-active-label">{label}</span>}
                    {!isActive && <span className="nav-tooltip">{label}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Search & Icons */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Expandable Search Input (Desktop & Mobile) */}
              <div className="flex items-center">
                <button 
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 text-luxury-600 hover:text-gold-600 transition-colors"
                  type="button"
                  aria-label="Toggle search"
                >
                  <Search className="w-5 h-5" />
                </button>
                
                {/* Search Popup */}
                {searchOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    />
                    <motion.form 
                      onSubmit={handleSearch}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="fixed left-4 right-4 sm:left-auto sm:right-6 lg:right-8 top-20 md:top-16 w-[calc(100vw-2rem)] sm:w-80 bg-white shadow-2xl rounded-xl border border-luxury-100 p-4 z-50"
                    >
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        placeholder="Search products..."
                        className="w-full text-sm px-3 py-2 border border-luxury-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500 bg-white"
                        autoFocus
                      />
                    </motion.form>
                  </>
                )}

                {/* Autocomplete Card */}
                {searchOpen && searchResults.length > 0 && (
                  <div className="fixed left-4 right-4 sm:left-auto sm:right-6 lg:right-8 top-32 md:top-28 w-[calc(100vw-2rem)] sm:w-80 bg-white shadow-2xl rounded-xl border border-luxury-100 p-2 z-50">
                    {searchResults.map(product => (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-3 p-2 hover:bg-luxury-50 rounded-lg transition-colors"
                      >
                        <img src={getOptimizedImageUrl(product.image, { width: 100, quality: 60 })} alt={product.name} className="w-10 h-10 object-cover rounded bg-luxury-100 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs text-luxury-800 truncate">{product.name}</p>
                          <p className="text-[11px] text-gold-600 font-semibold">₹{product.price.toLocaleString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <Link to="/wishlist" className="p-2 text-luxury-600 hover:text-gold-600 transition-colors relative">
                <Heart className="w-5 h-5" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-white text-xs rounded-full flex items-center justify-center">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="p-2 text-luxury-600 hover:text-gold-600 transition-colors relative"
                aria-label="Open cart drawer"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gold-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse-slow">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="relative p-2 text-luxury-600 hover:text-gold-600 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    {/* Admin badge indicator */}
                    {isAdmin && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gold-500 rounded-full border-2 border-white flex items-center justify-center" title="Admin">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                    )}
                  </button>
                  {isProfileDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl z-50 border border-luxury-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="py-2">
                          {/* User info header */}
                          <div className="px-4 py-2.5 border-b border-luxury-100">
                            <p className="text-xs text-luxury-500 truncate">{user.email}</p>
                            {isAdmin && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-gold-50 border border-gold-200 rounded-full text-[10px] font-bold text-gold-700 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                                Administrator
                              </span>
                            )}
                          </div>
                          <Link 
                            to="/profile" 
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="block px-4 py-2.5 text-sm text-luxury-700 hover:bg-luxury-50 transition-colors"
                          >
                            My Profile
                          </Link>
                          <Link 
                            to="/orders" 
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="block px-4 py-2.5 text-sm text-luxury-700 hover:bg-luxury-50 transition-colors"
                          >
                            My Orders
                          </Link>
                          {isAdmin && (
                            isAdminRoute ? (
                              <Link
                                to="/"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="block px-4 py-2.5 text-sm text-luxury-700 hover:bg-luxury-50 transition-colors flex items-center gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Official Platform
                              </Link>
                            ) : (
                              <Link
                                to="/admin"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="block px-4 py-2.5 text-sm text-luxury-700 hover:bg-luxury-50 transition-colors flex items-center gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                                Admin Panel
                              </Link>
                            )
                          )}
                          <button 
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              handleLogout();
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link to="/login" className="p-2 text-luxury-600 hover:text-gold-600 transition-colors">
                  <User className="w-5 h-5" />
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 text-luxury-600 hover:text-gold-600 transition-colors"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-40 md:hidden" 
            onClick={() => setIsOpen(false)} 
          />
        )}

        {/* Mobile Slide-in Drawer */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: isOpen ? 0 : '-100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 md:hidden flex flex-col justify-between"
        >
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Drawer Top */}
              <div className="p-6 border-b border-luxury-100 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <img src="/favicon.svg" alt="Panstellia" className="h-10 w-auto" />
                  <span className="font-serif text-lg font-bold text-luxury-800">Panstellia</span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-luxury-50 text-luxury-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Nav Items */}
              <div className="p-4 space-y-1 overflow-y-auto">
                {navItems.map(({ to, label, icon: Icon, isActive }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 min-h-[48px] rounded-lg transition-all ${
                      isActive 
                        ? 'bg-gold-500 text-white font-medium shadow-md' 
                        : 'text-luxury-600 hover:bg-luxury-50 hover:text-gold-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Drawer User Info Bottom */}
            <div className="p-6 border-t border-luxury-100 bg-luxury-50/50">
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 font-bold flex-shrink-0">
                      {user.email?.slice(0, 2).toUpperCase()}
                      {/* Admin badge on avatar */}
                      {isAdmin && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gold-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-luxury-500 uppercase font-semibold">
                        {isAdmin ? 'Administrator' : 'Logged in'}
                      </p>
                      <p className="text-xs font-semibold text-luxury-800 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Link 
                      to="/profile" 
                      onClick={() => setIsOpen(false)} 
                      className="text-xs text-luxury-700 hover:text-gold-500 font-medium py-1"
                    >
                      My Profile
                    </Link>
                    <Link 
                      to="/orders" 
                      onClick={() => setIsOpen(false)} 
                      className="text-xs text-luxury-700 hover:text-gold-500 font-medium py-1"
                    >
                      My Orders
                    </Link>
                    {isAdmin && (
                      isAdminRoute ? (
                        <Link 
                          to="/" 
                          onClick={() => setIsOpen(false)} 
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium py-1 flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Official Platform
                        </Link>
                      ) : (
                        <Link 
                          to="/admin" 
                          onClick={() => setIsOpen(false)} 
                          className="text-xs text-gold-600 hover:text-gold-700 font-medium py-1 flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                          Admin Panel
                        </Link>
                      )
                    )}
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="w-full btn-secondary text-red-650 hover:bg-red-50 text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full btn-primary py-2.5 flex items-center justify-center text-sm font-medium"
                >
                  <User className="w-4 h-4 mr-2" />
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </nav>

      {/* Right Side Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Navbar;
