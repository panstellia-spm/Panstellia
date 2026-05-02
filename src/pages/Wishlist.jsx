import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';

const WishlistPage = () => {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product);
      removeFromWishlist(product.id);
      toast.success('Added to cart!', {
        position: 'bottom-right'
      });
    } catch (error) {
      toast.error('Failed to add to cart', {
        position: 'bottom-right'
      });
    }
  };

  const handleRemove = (productId) => {
    removeFromWishlist(productId);
    toast.info('Removed from wishlist', {
      position: 'bottom-right'
    });
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-luxury-100 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-12 h-12 text-luxury-400" />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-bold text-luxury-900">
            Your wishlist is empty
          </h2>
          <p className="mt-2 text-luxury-600">
            Save your favorite necklaces for later.
          </p>
          <Link to="/products" className="mt-6 btn-primary inline-flex items-center">
            Browse Products
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8">
          My Wishlist ({wishlistItems.length})
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlistItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              <Link to={`/product/${item.id}`}>
                <div className="relative overflow-hidden aspect-[3/4]">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
              <div className="p-4">
                <p className="text-xs text-gold-600 font-medium">{item.category}</p>
                <Link to={`/product/${item.id}`}>
                  <h3 className="mt-1 text-luxury-900 font-medium line-clamp-2 hover:text-gold-600">
                    {item.name}
                  </h3>
                </Link>
                <p className="mt-2 text-lg font-semibold text-luxury-900">
                  ₹{item.price?.toLocaleString()}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 btn-primary text-sm py-2 flex items-center justify-center"
                  >
                    <ShoppingBag className="w-4 h-4 mr-1" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
