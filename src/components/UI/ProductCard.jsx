import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Check, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getProductImageUrls } from '../../utils/imageUtils';
import { getCategoryLabel } from '../../utils/categoryLabels';
import QuickViewModal from './QuickViewModal';
import OptimizedImage from './OptimizedImage';

const ProductCard = ({ product, priority = false }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
  const wishlisted = isInWishlist(product.id);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addToCart(product);
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

  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const imageUrls = useMemo(
    () => getProductImageUrls(product, { width: 480, quality: 80 }),
    [product]
  );
  const imageUrl = imageUrls[activeImageIndex] || imageUrls[0] || '';

  useEffect(() => {
    if (!isHovered || imageUrls.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % imageUrls.length);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [isHovered, imageUrls.length]);

  // Prefetch ALL hover images the moment the user hovers
  useEffect(() => {
    if (!isHovered || imageUrls.length <= 1) return;
    imageUrls.slice(1).forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'image';
      document.head.appendChild(link);
    });
  }, [isHovered, imageUrls]);

  useEffect(() => {
    if (activeImageIndex >= imageUrls.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, imageUrls.length]);

  const productStatus = product.productStatus || 'available';

  const statusBadge = (
    <div
      className={`absolute top-3 left-3 badge pointer-events-none z-15 ${
        productStatus === 'available'
          ? 'badge-success'
          : productStatus === 'shipped'
            ? 'badge-warning'
            : 'badge-error'
      }`}
    >
      {productStatus}
    </div>
  );

  return (
    <>
      <div
        className="block h-full cursor-pointer relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setActiveImageIndex(0);
        }}
      >
        <div className="card relative flex h-full flex-col overflow-hidden group transition-transform duration-300 hover:-translate-y-1">
          {/* Image Container */}
          <div className="block relative overflow-hidden aspect-[4/5] bg-gradient-to-br from-luxury-100 to-luxury-200">
            {statusBadge}
            <Link to={`/product/${product.id}`} className="block w-full h-full">
              <OptimizedImage
                src={imageUrl}
                alt={product.name}
                priority={priority}
                className={`w-full h-full transition-transform duration-500 ${
                  isHovered ? 'scale-105' : 'scale-100'
                }`}
              />
            </Link>

            {imageUrls.length > 1 && (
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                {imageUrls.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeImageIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
                    }`}
                  />
                ))}
              </div>
            )}
            
            {/* Discount Badge */}
            {discount > 0 && (
              <div className="absolute top-3 left-3 badge badge-error pointer-events-none z-10 text-[10px] font-bold shadow-sm">
                -{discount}%
              </div>
            )}

            {/* Stock Warning Badge */}
            {product.stock != null && product.stock > 0 && product.stock < 5 && (
              <div className="absolute top-10 left-3 bg-red-650 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm animate-pulse-slow">
                Only {product.stock} left
              </div>
            )}

            {/* Quick View — shows on hover, inside image */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsQuickViewOpen(true);
              }}
              type="button"
              className={`absolute top-3 right-14 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-10 border border-luxury-100/50 text-luxury-500 hover:text-gold-600 ${
                isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              }`}
              aria-label="Quick view"
            >
              <Eye className="w-4.5 h-4.5" />
            </button>
          </div>
          
          {/* Wishlist Button */}
          <motion.button
            whileTap={{ scale: 1.4 }}
            onClick={handleWishlist}
            type="button"
            className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-115 z-10 border border-luxury-100/50 ${
              wishlisted ? 'text-red-500' : 'text-luxury-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
          </motion.button>

          {/* Content */}
          <Link to={`/product/${product.id}`} className="flex flex-1 flex-col p-4 hover:opacity-90 transition-opacity">
            {/* Category */}
            <p className="min-h-[1rem] line-clamp-1 text-[10px] text-gold-600 font-bold uppercase tracking-wider">
              {getCategoryLabel(product.category)}
            </p>
            
            {/* Name */}
            <h3 className="mt-1 min-h-[2.75rem] text-luxury-900 font-medium leading-snug line-clamp-2 group-hover:text-gold-600 transition-colors text-sm">
              {product.name}
            </h3>
            
            {/* Rating */}
            <div className="mt-2 flex items-center">
              <div className="flex items-center text-gold-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.ratings || 4.5)
                        ? 'fill-current'
                        : 'text-luxury-200'
                    }`}
                  />
                ))}
              </div>
              <span className="ml-2 text-xs text-luxury-500">
                ({product.reviews || 0})
              </span>
            </div>
            
            {/* Price — no overflow hidden, no fixed height */}
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-base font-bold text-luxury-900">
                ₹{product.price?.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-luxury-400 line-through">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
              {discount > 0 && (
                <span className="text-[10px] font-bold text-green-600">
                  {discount}% off
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="mt-auto flex items-center gap-2 pt-2 border-t border-luxury-50/50">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-xs text-green-600 font-semibold">
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
          </Link>

          {/* Quick Add Button — BELOW content, always visible */}
          <div className="px-4 pb-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={isAdding}
              type="button"
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center hover:from-gold-600 hover:to-gold-700 transition-all disabled:opacity-50 text-xs shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal 
        product={product} 
        isOpen={isQuickViewOpen} 
        onClose={() => setIsQuickViewOpen(false)} 
      />
    </>
  );
};

export default ProductCard;
