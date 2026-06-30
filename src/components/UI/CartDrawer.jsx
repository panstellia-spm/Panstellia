import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../context/ProductContext';

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, subtotal, updateQuantity, removeFromCart, shippingSettings } = useCart();
  const { resolveWarrantyForProduct } = useProducts();
  const navigate = useNavigate();

  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="w-screen max-w-md bg-white flex flex-col shadow-2xl h-full"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-luxury-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-gold-500" />
                  <h2 className="font-serif text-lg font-bold text-luxury-900">
                    Your Bag ({totalItemsCount})
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full hover:bg-luxury-50 text-luxury-500 hover:text-luxury-800 transition-colors"
                  aria-label="Close cart"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Free Shipping Meter */}
              {shippingSettings.shippingEnabled && shippingSettings.freeShippingEnabled && (
                <div className="px-6 py-4 bg-luxury-50/50 border-b border-luxury-100 flex-shrink-0">
                  {subtotal >= shippingSettings.freeShippingThreshold || shippingSettings.freeShippingThreshold === 0 ? (
                    <div className="text-xs font-medium text-green-700">
                      🎉 You qualify for <span className="font-bold">Free Shipping</span>!
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-luxury-700">
                      You&apos;re <span className="font-bold text-gold-600">₹{Math.max(0, shippingSettings.freeShippingThreshold - subtotal)}</span> away from free shipping
                    </div>
                  )}
                  <div className="w-full bg-luxury-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-gold-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (subtotal / (shippingSettings.freeShippingThreshold || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingBag className="w-16 h-16 text-luxury-200 mb-4" />
                    <p className="text-luxury-600 font-medium">Your bag is empty</p>
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/products');
                      }}
                      className="mt-4 text-sm text-gold-600 hover:text-gold-700 font-semibold"
                    >
                      Start Shopping &rarr;
                    </button>
                  </div>
                ) : (
                  cartItems.map((item) => {
                    const warranty = resolveWarrantyForProduct(item);
                    return (
                      <div key={item.id} className="flex gap-4 items-start pb-6 border-b border-luxury-50 last:border-b-0 last:pb-0">
                        {/* Image */}
                        <img
                          src={getOptimizedImageUrl(item.image, { width: 120, quality: 60 })}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg bg-luxury-100 flex-shrink-0"
                        />

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-gold-600 font-bold uppercase tracking-wider block mb-0.5">
                          {getCategoryLabel(item.category)} {warranty && `• 🛡️ ${warranty.duration}`}
                        </span>
                        <h3 className="text-sm font-medium text-luxury-900 truncate mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm font-semibold text-luxury-900 mb-2">
                          ₹{item.price?.toLocaleString()}
                        </p>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-luxury-200 rounded-md">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 text-luxury-500 hover:bg-luxury-50 rounded-l-md transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-semibold text-luxury-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-luxury-500 hover:bg-luxury-50 rounded-r-md transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-luxury-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Total price for item */}
                      <p className="text-sm font-semibold text-luxury-900 self-start">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-luxury-100 bg-white flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-luxury-600">Subtotal</span>
                    <span className="text-lg font-bold text-luxury-900">
                      ₹{subtotal.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-luxury-400 mb-4">
                    Shipping and taxes calculated at checkout.
                  </p>
                  <button
                    onClick={handleCheckout}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-medium"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
