import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, User, Menu, X, Search, LogOut, Home, Store, Gem, CircleDot, Crown, Sparkles, Diamond } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useProducts } from '../../context/ProductContext';
import { getCategoryLabel } from '../../utils/categoryLabels';
import CartDrawer from '../UI/CartDrawer';

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const currentCategory = new URLSearchParams(location.search).get('category');
  const navItems = [
    { to: '/', label: 'Home', icon: Home, isActive: location.pathname === '/' },
    { to: '/products', label: 'Shop', icon: Store, isActive: location.pathname === '/products' && !currentCategory },
    { to: '/products?category=Gold', label: getCategoryLabel('Gold'), icon: Gem, isActive: location.pathname === '/products' && currentCategory === 'Gold' },
    { to: '/products?category=Silver', label: getCategoryLabel('Silver'), icon: CircleDot, isActive: location.pathname === '/products' && currentCategory === 'Silver' },
    { to: '/products?category=Lux Wear', label: getCategoryLabel('Lux Wear'), icon: Crown, isActive: location.pathname === '/products' && currentCategory === 'Lux Wear' },
    { to: '/category/elegant-spark', label: getCategoryLabel('Elegant Spark'), icon: Sparkles, isActive: location.pathname === '/category/elegant-spark' },
    { to: '/products?category=Piercings', label: getCategoryLabel('Piercings'), icon: Diamond, isActive: location.pathname === '/products' && currentCategory === 'Piercings' }
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-150 ease-out ${
        scrolled ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              {/* Expandable Search Input (Desktop/Mobile) */}
              <div className="relative flex items-center">
                <button 
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 text-luxury-600 hover:text-gold-600 transition-colors"
                  type="button"
                  aria-label="Toggle search"
                >
                  <Search className="w-5 h-5" />
                </button>
                
                <motion.form 
                  onSubmit={handleSearch}
                  initial={{ width: 0 }}
                  animate={{ width: searchOpen ? 160 : 0 }}
                  className="overflow-hidden flex items-center"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="Search..."
                    className="w-full text-xs px-2.5 py-1 border border-luxury-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500 bg-white"
                  />
                </motion.form>

                {/* Autocomplete Card */}
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white shadow-2xl rounded-xl border border-luxury-100 p-2 z-50">
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
                        <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded bg-luxury-100 flex-shrink-0" />
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
                <div className="relative group">
                  <button className="p-2 text-luxury-600 hover:text-gold-600 transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <p className="px-4 py-2 text-sm text-luxury-600 border-b truncate">
                        {user.email}
                      </p>
                      <Link to="/orders" className="block px-4 py-2 text-sm text-luxury-700 hover:bg-luxury-50">
                        My Orders
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="block px-4 py-2 text-sm text-luxury-700 hover:bg-luxury-50">
                          Admin Panel
                        </Link>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 inline mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
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
                    <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 font-bold flex-shrink-0">
                      {user.email?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-luxury-500 uppercase font-semibold">Logged in</p>
                      <p className="text-xs font-semibold text-luxury-800 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Link 
                      to="/orders" 
                      onClick={() => setIsOpen(false)} 
                      className="text-xs text-luxury-700 hover:text-gold-500 font-medium py-1"
                    >
                      My Orders
                    </Link>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsOpen(false)} 
                        className="text-xs text-luxury-700 hover:text-gold-500 font-medium py-1"
                      >
                        Admin Panel
                      </Link>
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
