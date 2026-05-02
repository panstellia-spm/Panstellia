import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { getDirectImageUrl } from '../utils/imageUtils';

const CartPage = () => {
  const { user } = useAuth();
  const { cartItems, subtotal, shipping, tax, total, updateQuantity, removeFromCart, clearCart } = useCart();

  const handleQuantityChange = async (productId, newQuantity) => {
    try {
      await updateQuantity(productId, newQuantity);
    } catch (error) {
      toast.error('Failed to update quantity', {
        position: 'bottom-right'
      });
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.info('Item removed from cart', {
        position: 'bottom-right'
      });
    } catch (error) {
      toast.error('Failed to remove item', {
        position: 'bottom-right'
      });
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-luxury-100 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-12 h-12 text-luxury-400" />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-bold text-luxury-900">
            Your cart is empty
          </h2>
          <p className="mt-2 text-luxury-600">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Link to="/products" className="mt-6 btn-primary inline-flex items-center">
            Continue Shopping
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-md p-4 flex gap-4">
<Link to={`/product/${item.id}`} className="w-24 h-24 flex-shrink-0">
                  <img
                    src={getDirectImageUrl(item.image)}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </Link>
                <div className="flex-1">
                  <Link to={`/product/${item.id}`} className="hover:text-gold-600">
                    <h3 className="font-medium text-luxury-900 line-clamp-2">{item.name}</h3>
                  </Link>
                  <p className="text-sm text-luxury-500 mt-1">{item.category}</p>
                  <p className="text-lg font-semibold text-luxury-900 mt-2">
                    ₹{item.price?.toLocaleString()}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-luxury-200 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-luxury-600 hover:bg-luxury-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-luxury-600 hover:bg-luxury-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="font-serif text-xl font-bold text-luxury-900 mb-4">
                Order Summary
              </h2>
              
              <div className="space-y-3 border-t border-luxury-200 pt-4">
                <div className="flex justify-between text-luxury-600">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-luxury-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                </div>
                <div className="flex justify-between text-luxury-600">
                  <span>Tax (5%)</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-luxury-900 pt-3 border-t border-luxury-200">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>

              {shipping > 0 && (
                <p className="mt-4 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                  Add ₹{1000 - subtotal} more for FREE shipping!
                </p>
              )}

              <Link
                to={user ? '/checkout' : '/login?redirect=/checkout'}
                className="mt-6 btn-primary w-full flex items-center justify-center"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>

              <Link
                to="/products"
                className="block mt-4 text-center text-gold-600 hover:text-gold-700"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
