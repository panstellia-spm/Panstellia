import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Heart, ShoppingBag, Truck, Shield, RefreshCw, 
  ChevronLeft, ChevronRight, Check, Plus, Minus, 
  Share2, Copy, MapPin, Calendar, Box, ShieldCheck, 
  Award, Sparkles, Gift, Droplet, Archive, Feather, Eye, ZoomIn, ZoomOut, Maximize2, X, Banknote, Bell
} from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'react-toastify';
import { getProductImageUrls } from '../utils/imageUtils';
import { getCategoryLabel } from '../utils/categoryLabels';
import ProductCard from '../components/UI/ProductCard';
import OptimizedImage from '../components/UI/OptimizedImage';
import SEOHelmet from '../utils/seoHelmet';
import { getProductSchema } from '../utils/structuredData';
import NotifyMeModal from '../components/UI/NotifyMeModal';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, products } = useProducts();
  const { addToCart, shippingSettings } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isBuyNowAdding, setIsBuyNowAdding] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);

  // Gallery zoom & Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Variant states
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Pincode state
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [estDeliveryDate, setEstDeliveryDate] = useState('');
  const [pincodeError, setPincodeError] = useState('');

  // Floating Purchase Bar state
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  // Recently Viewed State
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const mainSectionRef = useRef(null);
  const touchStartXRef = useRef(null);
  const MAX_GALLERY_THUMBS = 6;

  useEffect(() => {
    const foundProduct = getProductById(id);
    if (foundProduct) {
      setProduct(foundProduct);
      setSelectedImage(0);
      setLightboxIndex(0);
      setQuantity(1);
      // Set default variants if available
      setSelectedColor(foundProduct.color || foundProduct.stoneColor || 'Gold');
      setSelectedSize('Standard Size');
    } else {
      navigate('/products');
    }
  }, [id, getProductById, navigate]);

  // Track Recently Viewed
  useEffect(() => {
    if (!product) return;
    try {
      const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const filtered = stored.filter(item => item !== product.id);
      filtered.unshift(product.id);
      const updated = filtered.slice(0, 8);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating recently viewed:', e);
    }
  }, [product]);

  // Load Recently Viewed from products data
  useEffect(() => {
    if (!product || !products.length) return;
    try {
      const storedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const viewedProducts = storedIds
        .filter(storedId => storedId !== product.id)
        .map(storedId => products.find(p => p.id === storedId))
        .filter(Boolean)
        .slice(0, 4);
      setRecentlyViewed(viewedProducts);
    } catch (e) {
      console.error('Error loading recently viewed:', e);
    }
  }, [product, products]);

  // Floating Purchase Bar scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 750) {
        setShowFloatingBar(true);
      } else {
        setShowFloatingBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const wishlisted = product ? isInWishlist(product.id) : false;
  const discount = product?.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Full-size URLs for the main image stage (800px)
  const imageUrls = useMemo(() => {
    const urls = product ? getProductImageUrls(product, { width: 900, quality: 88 }) : [];
    return urls.slice(0, MAX_GALLERY_THUMBS);
  }, [product]);

  // Small URLs for the thumbnail strip (120px)
  const thumbUrls = useMemo(() => {
    const urls = product ? getProductImageUrls(product, { width: 120, quality: 60 }) : [];
    return urls.slice(0, MAX_GALLERY_THUMBS);
  }, [product]);

  // Preload gallery images
  useEffect(() => {
    if (!imageUrls.length) return;
    const timer = setTimeout(() => {
      imageUrls.slice(1).forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [imageUrls]);

  const safeSelectedImage = Math.min(Math.max(selectedImage, 0), Math.max(0, imageUrls.length - 1));
  const imageUrl = imageUrls[safeSelectedImage] || imageUrls[0] || '';

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-50">
        <div className="animate-spin w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  // Compute stock status
  const stockCount = typeof product.stock === 'number' ? product.stock : (product.stockCount ?? null);
  let stockStatus = { label: product.inStock ? 'In Stock' : 'Out of Stock', color: 'green' };
  if (stockCount !== null) {
    if (stockCount === 0) {
      stockStatus = { label: 'Out of Stock', color: 'red' };
    } else if (stockCount <= 10) {
      stockStatus = { label: 'Low Stock', color: 'orange' };
    } else {
      stockStatus = { label: 'In Stock', color: 'green' };
    }
  } else {
    stockStatus = product.inStock ? { label: 'In Stock', color: 'green' } : { label: 'Out of Stock', color: 'red' };
  }

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addToCart(product, quantity);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
      toast.success(`${product.name} added to cart!`, {
        position: 'bottom-right'
      });
    } catch (error) {
      toast.error('Failed to add to cart', {
        position: 'bottom-right'
      });
    }
    setIsAdding(false);
  };

  const handleBuyNow = async () => {
    setIsBuyNowAdding(true);
    try {
      await addToCart(product, quantity);
      navigate('/checkout');
    } catch (error) {
      toast.error('Failed to proceed to buy', {
        position: 'bottom-right'
      });
    }
    setIsBuyNowAdding(false);
  };

  const handleWishlist = () => {
    if (wishlisted) {
      removeFromWishlist(product.id);
      toast.info('Removed from wishlist', {
        position: 'bottom-right'
      });
    } else {
      addToWishlist(product);
      toast.success('Added to wishlist!', {
        position: 'bottom-right'
      });
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Product link copied to clipboard!', {
        position: 'bottom-right'
      });
    }
  };

  const handlePincodeCheck = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeError('Please enter a valid 6-digit pincode');
      setPincodeChecked(false);
      return;
    }
    setPincodeError('');
    // Mock delivery dates based on standard logistics
    const date = new Date();
    date.setDate(date.getDate() + 3);
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    setEstDeliveryDate(date.toLocaleDateString('en-IN', options));
    setPincodeChecked(true);
  };

  // Mock colors & sizes for selectable swatches
  const availableColors = product.colors || [
    { name: 'Gold', value: '#d4af37', image: imageUrls[0] },
    { name: 'Silver', value: '#c0c0c0', image: imageUrls[1] || imageUrls[0] },
    { name: 'Rose Gold', value: '#b76e79', image: imageUrls[2] || imageUrls[0] }
  ].slice(0, imageUrls.length > 1 ? 3 : 1);

  const availableSizes = ['Standard Size', 'Choker Fit (14")', 'Princess Fit (16")', 'Matinee Fit (20")'];

  return (
    <div className="min-h-screen bg-luxury-50 py-8" ref={mainSectionRef}>
      <SEOHelmet 
        title={`${product.name} | Buy at Panstellia`}
        description={product.description || `Shop ${product.name} - Premium ${getCategoryLabel(product.category)} jewelry from Panstellia. ${product.inStock ? 'In stock' : 'Out of stock'}.`}
        keywords={`${product.name}, ${getCategoryLabel(product.category)} necklace, jewelry`}
        canonical={`https://panstellia.com/product/${product.id}`}
        ogImage={imageUrl}
        preloadImages={[imageUrl]}
        structuredData={getProductSchema({
          name: product.name,
          description: product.description,
          image: imageUrl,
          price: product.price,
          inStock: product.inStock,
          rating: product.ratings || 4.5,
          reviewCount: product.reviews || 0,
          sku: product.sku || product.id
        })}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-luxury-500 mb-8 uppercase tracking-wider">
          <Link to="/" className="hover:text-gold-600 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-gold-600 transition-colors">Shop</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category}`} className="hover:text-gold-600 transition-colors">{getCategoryLabel(product.category)}</Link>
          <span>/</span>
          <span className="text-luxury-800 truncate max-w-[150px] sm:max-w-none">{product.name}</span>
        </nav>

        {/* Product Details Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative">
          
          {/* Sticky Left Column: Image Gallery */}
          <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-24 flex flex-col md:flex-row gap-4 h-fit">
            
            {/* Gallery Thumbnails */}
            <div className="order-2 md:order-1 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto scrollbar-hide py-1 md:py-0 md:max-h-[500px]">
              {thumbUrls.map((thumb, index) => {
                const isActive = safeSelectedImage === index;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedImage(index);
                      setLightboxIndex(index);
                    }}
                    aria-pressed={isActive}
                    aria-label={`Select image ${index + 1}`}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all p-0.5 focus:outline-none ${
                      isActive
                        ? 'ring-2 ring-gold-500 bg-white shadow-md'
                        : 'border border-transparent bg-luxury-100 hover:border-gold-300'
                    }`}
                  >
                    <OptimizedImage
                      src={thumb}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className={`w-full h-full rounded-sm object-cover transition-transform duration-300 ${isActive ? 'scale-105' : ''}`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Main Stage Image */}
            <div className="order-1 md:order-2 flex-1 relative bg-white rounded-xl shadow-md border border-luxury-100 overflow-hidden aspect-[4/5]">
              <div
                className="w-full h-full relative overflow-hidden group cursor-zoom-in"
                onClick={() => setIsLightboxOpen(true)}
                onTouchStart={(e) => {
                  touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  const startX = touchStartXRef.current;
                  const endX = e.changedTouches?.[0]?.clientX ?? null;
                  touchStartXRef.current = null;
                  if (startX == null || endX == null) return;
                  const dx = endX - startX;
                  const SWIPE_THRESHOLD = 50;
                  if (Math.abs(dx) < SWIPE_THRESHOLD) return;

                  if (dx > 0) {
                    setSelectedImage((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                  } else {
                    setSelectedImage((prev) => (prev + 1) % imageUrls.length);
                  }
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={imageUrl}
                    initial={{ opacity: 0, scale: 0.995 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-full h-full"
                  >
                    <OptimizedImage
                      src={imageUrl}
                      alt={product.name}
                      priority={true}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Overlays */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
                  {discount > 0 && (
                    <div className="bg-red-500 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-md">
                      -{discount}% OFF
                    </div>
                  )}
                  {product.featured && (
                    <div className="bg-gold-500 text-white font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow-md tracking-wider">
                      Featured
                    </div>
                  )}
                </div>

                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWishlist();
                    }}
                    className={`p-2.5 rounded-full shadow-md transition-all hover:scale-110 border ${
                      wishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-luxury-100 text-luxury-500 hover:text-red-500'
                    }`}
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-4.5 h-4.5 ${wishlisted ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                    className="p-2.5 rounded-full bg-white shadow-md transition-all hover:scale-110 border border-luxury-100 text-luxury-500 hover:text-gold-600"
                    aria-label="Share product"
                  >
                    <Share2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Navigation Arrows */}
                {imageUrls.length > 1 && (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 z-10 pointer-events-none">
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                      }}
                      className="pointer-events-auto rounded-full bg-white/90 hover:bg-white text-luxury-900 shadow hover:text-gold-600 transition-colors p-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage((prev) => (prev + 1) % imageUrls.length);
                      }}
                      className="pointer-events-auto rounded-full bg-white/90 hover:bg-white text-luxury-900 shadow hover:text-gold-600 transition-colors p-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Counter Badge */}
                <div className="absolute bottom-4 right-4 bg-luxury-900/70 backdrop-blur-sm text-white px-2.5 py-1 rounded text-[10px] font-bold z-10 tracking-widest uppercase">
                  {safeSelectedImage + 1} / {imageUrls.length}
                </div>

                {/* Hover zoom cue */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black/10 flex items-center justify-center">
                  <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-xs font-bold shadow text-luxury-800 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" /> Click to Expand
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Restructured Product Info */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-start">
            
            {/* Category Breadcrumb/Label */}
            <span className="text-gold-600 font-bold uppercase tracking-wider text-xs block mb-1">
              {getCategoryLabel(product.category)}
            </span>

            {/* Product Name */}
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900 leading-tight">
              {product.name}
            </h1>

            {/* Ratings, Reviews, Sold Info */}
            <div className="flex flex-wrap items-center mt-3 gap-3 divide-x divide-luxury-200">
              <div className="flex items-center gap-1">
                <div className="flex text-gold-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.ratings || 4.5) ? 'fill-current' : 'text-luxury-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-luxury-900 font-bold ml-1">
                  {product.ratings || 4.5}
                </span>
              </div>
              <span className="pl-3 text-xs text-luxury-500 font-semibold hover:text-gold-600 cursor-pointer transition-colors">
                {product.reviews || 0} reviews
              </span>
              <span className="pl-3 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {product.sales ?? (10 + (product.id ? product.id.length * 7 : 45))}+ sold recently
              </span>
            </div>

            {/* Pricing Section */}
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-extrabold text-luxury-900">
                ₹{product.price?.toLocaleString()}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-luxury-400 line-through font-medium">
                    ₹{product.originalPrice.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-red-500 bg-red-55 px-2 py-0.5 rounded">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {/* Tax and Tax Info */}
            <p className="text-xs font-semibold text-luxury-400 mt-1.5 italic">
              * Inclusive of all taxes.{' '}
              {!shippingSettings.shippingEnabled ? (
                'Free shipping available.'
              ) : shippingSettings.freeShippingEnabled ? (
                shippingSettings.freeShippingThreshold === 0 ? (
                  'Free shipping on all orders!'
                ) : (
                  `Free shipping on orders above ₹${shippingSettings.freeShippingThreshold}.`
                )
              ) : (
                `Standard shipping charge: ₹${shippingSettings.shippingCharge}.`
              )}
            </p>

            {/* Stock, Availability & SKU */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse-slow ${
                  stockStatus.color === 'green' ? 'bg-green-500' : stockStatus.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                }`} />
                <span className="text-xs font-bold uppercase tracking-wider text-luxury-800">{stockStatus.label}</span>
              </div>
              <span className="text-xs font-medium text-luxury-500">
                SKU: <strong className="font-bold text-luxury-850">{product.sku || product.skuCode || product.id}</strong>
              </span>
            </div>

            {/* Short Description */}
            <p className="mt-5 text-sm text-luxury-600 leading-relaxed font-medium">
              {product.description || 'Experience the classic allure of this premium crafted luxury jewelry design. Perfectly polished to radiate light, hypoallergenic, and ideal for any gifting or party wear occasion.'}
            </p>

            {/* Premium Colors Swatches Selector */}
            <div className="mt-6">
              <span className="text-xs font-bold text-luxury-700 uppercase tracking-wider block mb-2.5">
                Select Color: <strong className="text-luxury-900 font-bold">{selectedColor}</strong>
              </span>
              <div className="flex items-center gap-3">
                {availableColors.map((color) => {
                  const isColorActive = selectedColor === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`relative flex items-center justify-between border rounded-xl p-1.5 transition-all w-24 hover:shadow focus:outline-none bg-white ${
                        isColorActive 
                          ? 'border-gold-500 ring-1 ring-gold-500 shadow-md scale-102' 
                          : 'border-luxury-200 hover:border-gold-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden border border-luxury-100">
                        <img src={color.image} alt={color.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-bold text-luxury-800 flex-1 text-center truncate px-1">
                        {color.name}
                      </span>
                      {isColorActive && (
                        <div className="absolute -top-1.5 -right-1.5 bg-gold-500 text-white rounded-full p-0.5 shadow">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Premium Size Pills Selector */}
            <div className="mt-6">
              <span className="text-xs font-bold text-luxury-700 uppercase tracking-wider block mb-2">
                Select Size: <strong className="text-luxury-900 font-bold">{selectedSize}</strong>
              </span>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const isSizeActive = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 text-xs font-bold border rounded-lg transition-all focus:outline-none ${
                        isSizeActive
                          ? 'bg-gold-500 border-gold-500 text-white shadow-md'
                          : 'bg-white border-luxury-200 text-luxury-750 hover:border-gold-350 hover:bg-luxury-50'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-luxury-700 uppercase tracking-wider">Quantity:</span>
                <div className="flex items-center border border-luxury-200 rounded-lg bg-white shadow-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-luxury-600 hover:bg-luxury-50 transition-colors rounded-l-lg"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-luxury-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-luxury-600 hover:bg-luxury-50 transition-colors rounded-r-lg"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {stockStatus.label === 'Out of Stock' ? (
                  <button
                    onClick={() => setIsNotifyOpen(true)}
                    className="flex-1 btn-primary py-3 flex items-center justify-center font-bold tracking-wide shadow-md bg-gradient-to-r from-gold-500 to-gold-600"
                  >
                    <Bell className="w-4.5 h-4.5 mr-2" />
                    Notify Me
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding || isAdded}
                    className={`flex-1 py-3 flex items-center justify-center font-bold tracking-wide shadow-md rounded-lg transition-all ${
                      isAdded
                        ? 'bg-green-500 text-white'
                        : 'btn-primary'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4.5 h-4.5 mr-2" />
                        Added!
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4.5 h-4.5 mr-2" />
                        {isAdding ? 'Adding...' : 'Add to Cart'}
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleBuyNow}
                  disabled={isBuyNowAdding}
                  className="flex-1 bg-luxury-900 text-white hover:bg-luxury-800 rounded-lg py-3 flex items-center justify-center font-bold tracking-wide shadow-md active:scale-[0.99] transition-all"
                >
                  <ShoppingBag className="w-4.5 h-4.5 mr-2 text-gold-400" />
                  {isBuyNowAdding ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            </div>

            {/* Delivery Pincode Checker (Amazon Style) */}
            <div className="mt-8 bg-white border border-luxury-100 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold text-luxury-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <MapPin className="w-4 h-4 text-gold-500" /> Deliver To
              </span>
              <form onSubmit={handlePincodeCheck} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit Pincode"
                    className="w-full text-xs px-3.5 py-2.5 border border-luxury-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800 font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs px-4 rounded-lg transition-colors"
                >
                  Check
                </button>
              </form>
              {pincodeError && (
                <p className="text-red-500 text-xs font-semibold mt-2">{pincodeError}</p>
              )}
              {pincodeChecked && (
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50/50 p-2 rounded border border-emerald-100">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Estimated Delivery by {estDeliveryDate}</span>
                </div>
              )}

              {/* Feature Badges (Amazon Style) */}
              <div className="mt-6 pt-5 border-t border-luxury-100">
                <div className="flex items-start justify-between gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {[
                    { title: 'Pay on Delivery', icon: Banknote },
                    { title: '10 days Returnable', icon: RefreshCw },
                    { title: 'Panstellia Delivered', icon: Truck },
                    { title: 'Free Delivery', icon: Box },
                    { title: 'Secure transaction', icon: ShieldCheck }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 text-center min-w-[72px] sm:min-w-[80px]">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-luxury-100/60 flex items-center justify-center shrink-0 border border-luxury-200">
                        <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gold-500" strokeWidth={1.5} />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-luxury-600 leading-tight">
                        {feature.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Specifications and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mt-12">
          
          {/* Product Specifications Panel */}
          <div className="lg:col-span-6 xl:col-span-7 bg-white border border-luxury-100 rounded-xl p-6 shadow-sm">
            <span className="text-base font-bold text-luxury-800 uppercase tracking-wider flex items-center gap-1.5 mb-5 pb-3 border-b border-luxury-100">
              <Award className="w-5 h-5 text-gold-500" /> Product Specifications
            </span>
            
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm text-luxury-700">
                {[
                  ['Product Name', product.name],
                  ['Category', getCategoryLabel(product.category)],
                  ['Product Type', product.productType || 'Pendant Necklace'],
                  ['SKU', product.sku || product.skuCode || product.id],
                  ['Barcode', product.barcode || 'To Be Assigned'],
                  ['Brand', product.brand || 'PANSTELLIA'],
                  ['Collection', product.collection || product.collectionName || 'Elegant Spark Collections'],
                  ['Gender', product.gender || 'Female'],
                  ['Age Group', product.ageGroup || 'Adult'],
                  ['Occasion', product.occasion || 'Perfect for every occasion'],
                  ['Country Of Origin', product.countryOfOrigin || 'Korea'],
                  ['Base Material', product.baseMaterial || product.material || 'Premium Stainless Steel Alloy'],
                  ['Primary Stone', product.primaryStone || 'Crystal Stone'],
                  ['Stone Type', product.stoneType || 'High-Grade Cubic Zirconia (CZ)'],
                  ['Stone Color', product.stoneColor || product.color || 'Crystal White'],
                  ['Plating Type', product.platingType || '24K Gold Plated'],
                  ['Plating Thickness', product.platingThickness || 'Premium Micron Plating'],
                  ['Finish', product.finishType || product.finish || 'High Polish Mirror Finish'],
                  ['Weight', product.weight ? `${product.weight} g` : '—'],
                  ['Dimensions', product.dimensions || '—'],
                  ['Warranty', product.warranty || '6 Months Brand Warranty']
                ].map(([label, value]) => {
                  if (!value) return null;
                  return (
                    <div key={label} className="flex flex-col border-b border-luxury-50/50 pb-2">
                      <dt className="text-luxury-400 font-bold uppercase tracking-wide text-[11px]">{label}</dt>
                      <dd className="font-semibold text-luxury-800 mt-1 text-sm">{String(value)}</dd>
                    </div>
                  );
                })}
              </dl>

              {/* Special Attribute Badges */}
              <div className="flex flex-wrap gap-2.5 mt-5 pt-3 border-t border-luxury-100">
                {(product.nickelFree ?? true) && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <Check className="w-3 h-3 text-emerald-600" /> Nickel Free
                  </span>
                )}
                {(product.hypoallergenic ?? true) && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <Check className="w-3 h-3 text-emerald-600" /> Hypoallergenic
                  </span>
                )}
                {(product.tarnishResistant ?? true) && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <Check className="w-3 h-3 text-emerald-600" /> Tarnish Resistant
                  </span>
                )}
                {(product.waterproof ?? false) && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <Check className="w-3 h-3 text-emerald-600" /> Waterproof
                  </span>
                )}
                {(product.lightweight ?? true) && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Lightweight
                  </span>
                )}
              </div>
            </div>

          {/* Accordions: Highlights, Care, Shipping */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-start border-t lg:border-t-0 border-luxury-200">
            <div className="space-y-2">
              {[
                {
                  title: 'Product Highlights',
                  icon: Sparkles,
                  content: (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { title: 'Premium Finish', desc: 'Superior mirror gloss shine', icon: Sparkles },
                        { title: 'Luxury Packaging', desc: 'Elegant velvet-lined gift case', icon: Gift },
                        { title: 'Anti Tarnish', desc: 'Resistant to oxidation', icon: Shield },
                        { title: 'Nickel Free', desc: 'Safe for sensitive skin types', icon: Check }
                      ].map((hl) => (
                        <div key={hl.title} className="flex gap-2.5 p-3 rounded-xl border border-luxury-100 bg-white">
                          <hl.icon className="w-4.5 h-4.5 text-gold-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-luxury-800">{hl.title}</h4>
                            <p className="text-[10px] text-luxury-500 leading-snug">{hl.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                },
                {
                  title: 'Care Instructions',
                  icon: Droplet,
                  content: (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { title: 'Keep Away from Water', desc: 'Avoid baths or swimming pools', icon: Droplet },
                        { title: 'Avoid Perfumes', desc: 'Apply cosmetics beforehand', icon: Feather },
                        { title: 'Store in Pouch', desc: 'Keep inside sealed air-tight bag', icon: Archive },
                        { title: 'Clean Gently', desc: 'Wipe down using soft flannel cloth', icon: Sparkles }
                      ].map((care) => (
                        <div key={care.title} className="flex gap-2.5 p-3 rounded-xl border border-luxury-100 bg-white">
                          <care.icon className="w-4.5 h-4.5 text-gold-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-luxury-800">{care.title}</h4>
                            <p className="text-[10px] text-luxury-500 leading-snug">{care.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                },
                {
                  title: 'Shipping & Logistics',
                  icon: Truck,
                  content: (
                    <div className="bg-white border border-luxury-100 rounded-xl p-4 text-xs text-luxury-700 space-y-3">
                      <div className="flex justify-between border-b border-luxury-50 pb-2">
                        <span className="font-bold text-luxury-500">Dispatch Time:</span>
                        <span className="font-semibold text-luxury-800">Within 24-48 Hours</span>
                      </div>
                      <div className="flex justify-between border-b border-luxury-50 pb-2">
                        <span className="font-bold text-luxury-500">Estimated Arrival:</span>
                        <span className="font-semibold text-luxury-800">3-6 Business Days</span>
                      </div>
                      <div className="flex justify-between border-b border-luxury-50 pb-2">
                        <span className="font-bold text-luxury-500">Return Window:</span>
                        <span className="font-semibold text-luxury-800">3-Day Easy Replacement</span>
                      </div>
                      <div className="space-y-2">
                        <span className="font-bold text-luxury-500">Warranty Coverage:</span>
                        <span className="font-semibold text-luxury-800">
                          Only products from the Elite Series are covered under a 3 Months Brand Warranty against manufacturing defects. All other product collections are not eligible for warranty coverage.
                        </span>
                      </div>
                    </div>
                  )
                }
              ].map((accordion, idx) => {
                // Shift accordion idx to avoid collision with standard openAccordion state
                const isAccordionOpen = false; // We can control them locally or have a toggler
                return (
                  <div key={idx} className="border-b border-luxury-200 py-3.5">
                    <details className="group">
                      <summary className="w-full flex items-center justify-between text-left font-serif text-sm font-bold text-luxury-900 py-1.5 cursor-pointer list-none focus:outline-none">
                        <span className="flex items-center gap-2">
                          <accordion.icon className="w-4 h-4 text-gold-500" />
                          {accordion.title}
                        </span>
                        <Plus className="w-4 h-4 text-gold-550 group-open:hidden" />
                        <Minus className="w-4 h-4 text-gold-550 hidden group-open:block" />
                      </summary>
                      <div className="pt-4 pb-2 transition-all duration-300">
                        {accordion.content}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* You May Also Like Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-luxury-200 pt-12">
            <h2 className="font-serif text-2xl font-bold text-luxury-900 mb-8 text-center">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed Section */}
        {recentlyViewed.length > 0 && (
          <div className="mt-16 border-t border-luxury-200 pt-12">
            <h2 className="font-serif text-2xl font-bold text-luxury-900 mb-8 text-center">
              Recently Viewed Products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {recentlyViewed.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Floating Bottom Purchase Bar */}
      <AnimatePresence>
        {showFloatingBar && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-luxury-100 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] px-4 py-3 md:py-3.5 flex items-center justify-between"
          >
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-10 h-10 md:w-12 md:h-12 object-cover rounded bg-luxury-100 border border-luxury-50 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-luxury-900 truncate max-w-[120px] md:max-w-[240px]">
                    {product.name}
                  </h4>
                  <p className="text-xs font-extrabold text-gold-600">
                    ₹{product.price?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Floating Quantity Controls */}
                <div className="hidden sm:flex items-center border border-luxury-200 rounded-lg bg-white shrink-0 mr-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-luxury-600 hover:bg-luxury-50 transition-colors rounded-l-lg"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-bold text-xs text-luxury-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-luxury-600 hover:bg-luxury-50 transition-colors rounded-r-lg"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs px-3.5 md:px-5 py-2 md:py-2.5 rounded-lg shadow-sm transition-colors uppercase tracking-wider flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Add to Cart</span>
                </button>
                
                <button
                  onClick={handleBuyNow}
                  disabled={isBuyNowAdding}
                  className="bg-luxury-900 hover:bg-luxury-800 text-white font-bold text-xs px-3.5 md:px-5 py-2 md:py-2.5 rounded-lg shadow-sm transition-colors uppercase tracking-wider flex items-center gap-1.5"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl h-[85vh] flex flex-col items-center justify-between"
            >
              {/* Top Bar Controls */}
              <div className="w-full flex items-center justify-between text-white pb-2 z-10">
                <span className="text-xs font-bold tracking-widest">
                  {lightboxIndex + 1} / {imageUrls.length}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLightboxZoom(prev => Math.max(1, prev - 0.5))}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setLightboxZoom(prev => Math.min(3, prev + 0.5))}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsLightboxOpen(false);
                      setLightboxZoom(1);
                    }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Close fullscreen"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Lightbox Image Stage */}
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative">
                <motion.img
                  key={lightboxIndex + '-' + lightboxZoom}
                  src={imageUrls[lightboxIndex]}
                  alt={`${product.name} fullscreen`}
                  className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
                  style={{ transform: `scale(${lightboxZoom})` }}
                />

                {/* Left/Right Navigation inside Modal */}
                {imageUrls.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        setLightboxIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length);
                        setLightboxZoom(1);
                      }}
                      className="absolute left-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => {
                        setLightboxIndex(prev => (prev + 1) % imageUrls.length);
                        setLightboxZoom(1);
                      }}
                      className="absolute right-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              <div className="w-full flex justify-center gap-2 overflow-x-auto py-2 z-10 scrollbar-hide">
                {thumbUrls.map((thumb, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxZoom(1);
                    }}
                    className={`w-12 h-12 rounded border p-0.5 bg-white transition-all ${
                      lightboxIndex === idx ? 'border-gold-500 scale-105' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={thumb} alt="Preview" className="w-full h-full object-cover rounded-sm" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notify Me Modal */}
      <NotifyMeModal
        product={product}
        isOpen={isNotifyOpen}
        onClose={() => setIsNotifyOpen(false)}
      />
    </div>
  );
};

export default ProductDetailPage;
