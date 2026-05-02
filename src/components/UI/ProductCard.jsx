import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useState } from 'react';
import { toast } from 'react-toastify';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  
  const wishlisted = isInWishlist(product.id);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="card">
        {/* Image Container */}
        <div className="relative overflow-hidden aspect-[3/4]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-3 left-3 badge badge-error">
              -{discount}%
            </div>
          )}
          
          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${
              wishlisted ? 'text-red-500' : 'text-luxury-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
          </button>
          
          {/* Quick Add Button */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="w-full bg-white text-luxury-900 py-2 rounded-lg font-medium flex items-center justify-center hover:bg-gold-50 transition-colors disabled:opacity-50"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              {isAdding ? 'Adding...' : 'Quick Add'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Category */}
          <p className="text-xs text-gold-600 font-medium uppercase tracking-wider">
            {product.category}
          </p>
          
          {/* Name */}
          <h3 className="mt-1 text-luxury-900 font-medium line-clamp-2 group-hover:text-gold-600 transition-colors">
            {product.name}
          </h3>
          
          {/* Rating */}
          <div className="mt-2 flex items-center">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.ratings || 0)
                      ? 'fill-gold-400 text-gold-400'
                      : 'fill-luxury-200 text-luxury-200'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-luxury-500">
              ({product.reviews || 0})
            </span>
          </div>
          
          {/* Price */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-semibold text-luxury-900">
              ₹{product.price?.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-luxury-400 line-through">
                ₹{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
