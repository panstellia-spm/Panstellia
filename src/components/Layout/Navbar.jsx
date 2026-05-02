import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User, Menu, X, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useProducts } from '../../context/ProductContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { cartItems } = useCart();
  const { wishlistItems } = useWishlist();
  const { searchProducts } = useProducts();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);

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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
{/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/favicon.svg" alt="Panstellia" className="h-16 w-auto" />
            <span className="font-serif text-2xl font-bold text-luxury-800 ml-2">Panstellia</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-luxury-700 hover:text-gold-600 transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-luxury-700 hover:text-gold-600 transition-colors">
              Shop
            </Link>
            <Link to="/products?category=Gold" className="text-luxury-700 hover:text-gold-600 transition-colors">
              Gold
            </Link>
            <Link to="/products?category=Silver" className="text-luxury-700 hover:text-gold-600 transition-colors">
              Silver
            </Link>
            <Link to="/products?category=Bridal" className="text-luxury-700 hover:text-gold-600 transition-colors">
              Bridal
            </Link>
          </div>

          {/* Search & Icons */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-luxury-600 hover:text-gold-600 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

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
            <Link to="/cart" className="p-2 text-luxury-600 hover:text-gold-600 transition-colors relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative group">
                <button className="p-2 text-luxury-600 hover:text-gold-600 transition-colors">
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    <p className="px-4 py-2 text-sm text-luxury-600 border-b">
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
              className="md:hidden p-2 text-luxury-600"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Dropdown */}
      {searchOpen && (
        <div className="absolute top-20 left-0 right-0 bg-white shadow-lg p-4 animate-slide-down">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search necklaces..."
                className="w-full px-4 py-3 border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <button type="submit" className="absolute right-2 top-2 bg-gold-500 text-white px-4 py-1 rounded-md">
                Search
              </button>
            </div>
          </form>
          {searchResults.length > 0 && (
            <div className="max-w-2xl mx-auto mt-2">
              {searchResults.map(product => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-4 p-2 hover:bg-luxury-50 rounded-lg"
                >
                  <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                  <div>
                    <p className="font-medium text-luxury-800">{product.name}</p>
                    <p className="text-sm text-gold-600">₹{product.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-lg animate-slide-up">
          <div className="px-4 py-4 space-y-4">
            <Link to="/" className="block text-luxury-700 hover:text-gold-600" onClick={() => setIsOpen(false)}>
              Home
            </Link>
            <Link to="/products" className="block text-luxury-700 hover:text-gold-600" onClick={() => setIsOpen(false)}>
              Shop
            </Link>
            <Link to="/products?category=Gold" className="block text-luxury-700 hover:text-gold-600" onClick={() => setIsOpen(false)}>
              Gold
            </Link>
            <Link to="/products?category=Silver" className="block text-luxury-700 hover:text-gold-600" onClick={() => setIsOpen(false)}>
              Silver
            </Link>
            <Link to="/products?category=Bridal" className="block text-luxury-700 hover:text-gold-600" onClick={() => setIsOpen(false)}>
              Bridal
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
