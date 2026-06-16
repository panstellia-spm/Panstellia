import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Heart, Star, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { getProductImageUrls } from '../../utils/imageUtils';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { toast } from 'react-toastify';

const QuickViewModal = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const imageUrls = useMemo(() => (product ? getProductImageUrls(product) : []), [product]);
  const wishlisted = product ? isInWishlist(product.id) : false;

  if (!isOpen || !product) return null;

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addToCart(product);
      toast.success(`${product.name} added to cart!`, {
        position: 'bottom-right',
      });
    } catch (error) {
      toast.error('Failed to add to cart', {
        position: 'bottom-right',
      });
    }
    setIsAdding(false);
  };

  const handleWishlist = () => {
    if (wishlisted) {
      removeFromWishlist(product.id);
      toast.info('Removed from wishlist', {
        position: 'bottom-right',
      });
    } else {
      addToWishlist(product);
      toast.success('Added to wishlist!', {
        position: 'bottom-right',
      });
    }
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl max-w-2xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl z-10 max-h-[90vh] md:max-h-[80vh]"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-luxury-800 hover:text-gold-600 transition-colors shadow-md border border-luxury-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Column: Image Carousel */}
          <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto md:h-full bg-luxury-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {imageUrls.length > 0 ? (
              <img
                src={imageUrls[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-luxury-100 flex items-center justify-center text-luxury-400">
                No Image
              </div>
            )}

            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                -{discount}% OFF
              </span>
            )}

            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-luxury-800 shadow-md border border-luxury-100 hover:text-gold-600 transition-colors z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev + 1) % imageUrls.length)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-luxury-800 shadow-md border border-luxury-100 hover:text-gold-600 transition-colors z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  {imageUrls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        activeImageIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Info */}
          <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto max-h-[45vh] md:max-h-full">
            <div>
              <p className="text-xs text-gold-600 font-semibold tracking-wider uppercase mb-1">
                {getCategoryLabel(product.category)}
              </p>
              <h2 className="font-serif text-2xl font-bold text-luxury-900 leading-tight mb-2">
                {product.name}
              </h2>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mb-4">
                <div className="flex text-gold-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.ratings || 4.5) ? 'fill-current' : ''
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-luxury-500">
                  ({product.reviews || 0} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold text-luxury-900">
                  ₹{product.price?.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-luxury-400 line-through">
                    ₹{product.originalPrice?.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-luxury-600 leading-relaxed mb-6 line-clamp-4">
                {product.description}
              </p>

              {/* Tags / Material */}
              {product.baseMaterial && (
                <div className="mb-6">
                  <span className="text-xs font-semibold text-luxury-700 block mb-1.5">Material</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs bg-luxury-100 text-luxury-800 px-2.5 py-1 rounded-full font-medium">
                      {product.baseMaterial}
                    </span>
                    {product.platingType && (
                      <span className="text-xs bg-luxury-100 text-luxury-800 px-2.5 py-1 rounded-full font-medium">
                        {product.platingType}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-luxury-100">
              <div className="flex gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {isAdding ? 'Adding...' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleWishlist}
                  className={`p-2.5 rounded-lg border flex items-center justify-center transition-colors ${
                    wishlisted
                      ? 'border-red-500 bg-red-50 text-red-500'
                      : 'border-luxury-200 text-luxury-500 hover:text-red-500 hover:border-red-500'
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              <Link
                to={`/product/${product.id}`}
                onClick={onClose}
                className="w-full btn-secondary text-center flex items-center justify-center gap-2 text-sm py-2"
              >
                <Eye className="w-4 h-4" />
                View Full Details
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QuickViewModal;
