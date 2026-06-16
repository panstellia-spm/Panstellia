import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, ShoppingBag, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, Check, Plus, Minus } from 'lucide-react';
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

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, products } = useProducts();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [openAccordion, setOpenAccordion] = useState(0); // Default to first open

  const touchStartXRef = useRef(null);
  const MAX_GALLERY_THUMBS = 6;

  useEffect(() => {
    const foundProduct = getProductById(id);
    if (foundProduct) {
      setProduct(foundProduct);
      setSelectedImage(0);
      setQuantity(1);
    } else {
      navigate('/products');
    }
  }, [id, getProductById, navigate]);

  const wishlisted = product ? isInWishlist(product.id) : false;
  const discount = product?.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Full-size URLs for the main image stage (800px)
  const imageUrls = useMemo(() => {
    const urls = product ? getProductImageUrls(product, { width: 900, quality: 88 }) : [];
    return urls.slice(0, MAX_GALLERY_THUMBS);
  }, [product]);

  // Small URLs for the thumbnail strip (120px) — much less data to download
  const thumbUrls = useMemo(() => {
    const urls = product ? getProductImageUrls(product, { width: 120, quality: 60 }) : [];
    return urls.slice(0, MAX_GALLERY_THUMBS);
  }, [product]);

  // Preload gallery images 2–6 after a short delay so they're ready when
  // the user clicks the thumbnail strip, without competing with the main image.
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addToCart(product, quantity);
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

  const handleZoomMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    });
  };

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
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
          rating: product.rating || 4.5,
          reviewCount: product.reviewCount || 0,
          sku: product.id
        })}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-luxury-500 mb-8 uppercase tracking-wider">
          <Link to="/" className="hover:text-gold-600">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-gold-600">Shop</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category}`} className="hover:text-gold-600">{getCategoryLabel(product.category)}</Link>
          <span>/</span>
          <span className="text-luxury-800">{product.name}</span>
        </nav>

        {/* Product Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery with vertical thumbnails on desktop, horizontal scroll on mobile */}
          <div className="flex flex-col md:flex-row gap-4 h-fit">
            {/* Thumbnails */}
            <div className="order-2 md:order-1 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto scrollbar-hide py-1 md:py-0 md:max-h-[500px]">
              {thumbUrls.map((thumb, index) => {
                const isActive = safeSelectedImage === index;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all p-0.5 ${
                      isActive 
                        ? 'border-gold-500 shadow-md bg-white' 
                        : 'border-transparent bg-luxury-100 hover:border-gold-300'
                    }`}
                    aria-label={`Select image ${index + 1}`}
                  >
                    <OptimizedImage
                      src={thumb}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full rounded-md"
                    />
                  </button>
                );
              })}
            </div>

            {/* Main Image Stage */}
            <div className="order-1 md:order-2 flex-1 relative bg-white rounded-xl shadow-md border border-luxury-100 overflow-hidden aspect-[4/5]">
              <div
                className="w-full h-full relative cursor-crosshair overflow-hidden group"
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleZoomMove}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-full h-full"
                  >
                    <OptimizedImage
                      src={imageUrl}
                      alt={product.name}
                      priority={true}
                      className="w-full h-full"
                    />
                  </motion.div>
                </AnimatePresence>

                {discount > 0 && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white font-bold text-xs uppercase px-3.5 py-1.5 rounded-full shadow-sm z-10">
                    -{discount}% OFF
                  </div>
                )}

                {isZooming && (
                  <div
                    className="hidden lg:block absolute z-20 w-40 h-40 -translate-x-1/2 -translate-y-1/2 border border-white/80 bg-white/25 shadow-lg backdrop-blur-[1px] pointer-events-none"
                    style={{
                      left: `${zoomPosition.x}%`,
                      top: `${zoomPosition.y}%`
                    }}
                  />
                )}

                {/* Arrow Controls */}
                {imageUrls.length > 1 && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 z-10">
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                      }}
                      className="pointer-events-auto rounded-full bg-white/80 hover:bg-white text-luxury-900 shadow border border-luxury-100 hover:text-gold-600 transition-colors p-2"
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
                      className="pointer-events-auto rounded-full bg-white/80 hover:bg-white text-luxury-900 shadow border border-luxury-100 hover:text-gold-600 transition-colors p-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Luxury glass overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-gold-500/5 via-transparent to-gold-600/5" />
              </div>

              {/* Side zoom preview (Desktop) */}
              {isZooming && (
                <div
                  className="hidden lg:block absolute left-full top-0 ml-4 z-30 w-full h-full rounded-xl border border-luxury-100 bg-white shadow-2xl pointer-events-none"
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '220%',
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`
                  }}
                />
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="flex flex-col justify-start">
            <span className="text-gold-600 font-bold uppercase tracking-wider text-xs block mb-1">
              {getCategoryLabel(product.category)}
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900 leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center mt-3 gap-1">
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
              <span className="ml-1 text-xs text-luxury-500 font-semibold">
                {product.ratings || 4.5} ({product.reviews || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-luxury-900">
                ₹{product.price?.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-luxury-400 line-through font-medium">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="mt-3 flex items-center gap-2">
              {product.inStock ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 text-xs font-bold uppercase tracking-wider">In Stock</span>
                </>
              ) : (
                <span className="text-red-650 text-xs font-bold uppercase tracking-wider">Out of Stock</span>
              )}
            </div>

            {/* Description */}
            <p className="mt-5 text-sm text-luxury-600 leading-relaxed">
              {product.description}
            </p>

            {/* Quantity Selector & Buy Buttons */}
            <div className="mt-6 space-y-4">
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
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 btn-primary py-3 flex items-center justify-center font-bold tracking-wide shadow-md"
                >
                  <ShoppingBag className="w-4.5 h-4.5 mr-2" />
                  {isAdding ? 'Adding...' : 'Add to Cart'}
                </button>

                <button
                  onClick={handleWishlist}
                  className={`px-6 py-3 rounded-lg font-semibold border flex items-center justify-center transition-all shadow-sm ${
                    wishlisted 
                      ? 'bg-red-50 text-red-500 border-red-500' 
                      : 'bg-white border-luxury-200 text-luxury-700 hover:border-gold-500 hover:text-gold-600'
                  }`}
                >
                  <Heart className={`w-4.5 h-4.5 mr-2 ${wishlisted ? 'fill-current' : ''}`} />
                  {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                </button>
              </div>
            </div>

            {/* Trust Badges Bar */}
            <div className="flex gap-6 mt-6 py-4 border-y border-luxury-100 text-[10px] font-bold text-luxury-600 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-gold-500" /> Secure Payment</span>
              <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-gold-500" /> Free Shipping</span>
              <span className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4 text-gold-500" /> Easy Returns</span>
            </div>

            {/* Accordions */}
            <div className="mt-8 border-t border-luxury-200">
              {[
                {
                  title: 'Product Details',
                  content: (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      {[
                        ['Base Material', product.baseMaterial],
                        ['Stone Color', product.stoneColor],
                        ['Plating Type', product.platingType],
                        ['Finish Type', product.finishType],
                        ['Occasion', product.occasion],
                        ['SKU Code', product.skuCode],
                        ['Country of Origin', product.countryOfOrigin || 'India']
                      ]
                        .filter(([, v]) => v != null && String(v).trim() !== '')
                        .map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-luxury-400 font-medium">{label}</dt>
                            <dd className="text-luxury-800 font-semibold mt-0.5">{String(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  )
                },
                {
                  title: 'Shipping Info',
                  content: (
                    <div className="text-xs text-luxury-600 space-y-1.5">
                      <p>✨ Free Shipping on all orders above ₹999 across India.</p>
                      <p>📦 Standard delivery takes 3-7 business days.</p>
                      <p>🔄 Hassle-free 5-day return policy on unused items.</p>
                    </div>
                  )
                },
                {
                  title: 'Care Instructions',
                  content: (
                    <div className="text-xs text-luxury-600 space-y-1.5 leading-relaxed">
                      <p>⚠️ Keep your jewelry dry and away from perfume, chemicals, and cosmetics.</p>
                      <p>💎 Store each piece separately in an air-tight pouch or ziplock bag.</p>
                      <p>✨ Wipe with a dry, soft microfiber cloth after use to retain its premium gold/silver shine.</p>
                    </div>
                  )
                }
              ].map((accordion, idx) => {
                const isOpen = openAccordion === idx;
                return (
                  <div key={idx} className="border-b border-luxury-200 py-3">
                    <button
                      onClick={() => toggleAccordion(idx)}
                      type="button"
                      className="w-full flex items-center justify-between text-left font-serif text-sm font-bold text-luxury-900 py-1"
                    >
                      <span>{accordion.title}</span>
                      {isOpen ? <Minus className="w-4 h-4 text-gold-550" /> : <Plus className="w-4 h-4 text-gold-550" />}
                    </button>
                    
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 pb-2">
                        {accordion.content}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* You May Also Like Section (Using ProductCard components) */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 border-t border-luxury-200 pt-12">
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
      </div>
    </div>
  );
};

export default ProductDetailPage;
