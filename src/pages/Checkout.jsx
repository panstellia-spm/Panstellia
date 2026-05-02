import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, ChevronLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { loadRazorpay } from '../services/payment';
import { getDirectImageUrl } from '../utils/imageUtils';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, subtotal, shipping, tax, total, clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.phone || !formData.address) {
        throw new Error('Please fill in all required fields');
      }

      // Initialize Razorpay payment
      const razorpay = await loadRazorpay();
      
      if (!razorpay) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order data
      const orderData = {
        amount: total * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        userId: user.uid,
        items: cartItems,
        shippingAddress: formData
      };

      // Open Razorpay checkout
      // Note: In production, you would create an order on your server first
      // and use the order_id here. This is a demo implementation.
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'YOUR_KEY_ID',
        amount: total * 100,
        currency: 'INR',
        name: 'Panstellia',
        description: 'Purchase of necklace jewelry',
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200',
        handler: async (response) => {
          // Payment successful
          toast.success('Payment successful!', {
            position: 'bottom-right'
          });
          
          // Clear cart
          await clearCart();
          
          // Navigate to success page
          navigate('/order-success', {
            state: {
              orderId: response.razorpay_payment_id,
              items: cartItems,
              total
            }
          });
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#db912d'
        }
      };

      const rzp = new razorpay(options);
      rzp.open();
      
    } catch (error) {
      toast.error(error.message || 'Payment failed', {
        position: 'bottom-right'
      });
    }

    setLoading(false);
  };

  if (!user || cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/cart" className="inline-flex items-center text-luxury-600 hover:text-gold-600 mb-6">
          <ChevronLeft className="w-5 h-5" />
          Back to Cart
        </Link>

        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-luxury-900 mb-6">
                Shipping Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-luxury-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-luxury-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-luxury-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+91 98765 43210"
                    className="input-field"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-sm font-medium text-luxury-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="400001"
                    className="input-field"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-luxury-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="input-field"
                    placeholder="Flat No., Building Name, Street Name"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-luxury-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Mumbai"
                    className="input-field"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-luxury-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Maharashtra"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Payment Section */}
              <div className="mt-8 pt-8 border-t border-luxury-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl font-bold text-luxury-900">
                    Payment
                  </h2>
                  <div className="flex items-center text-green-600 text-sm">
                    <Lock className="w-4 h-4 mr-1" />
                    Secure Payment
                  </div>
                </div>
                
                <div className="bg-luxury-50 rounded-lg p-4 flex items-center">
                  <CreditCard className="w-8 h-8 text-gold-600 mr-3" />
                  <div>
                    <p className="font-medium text-luxury-900">Pay with Razorpay</p>
                    <p className="text-sm text-luxury-500">All major cards accepted</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full btn-primary flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Pay ₹{total.toLocaleString()}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="font-serif text-xl font-bold text-luxury-900 mb-4">
                Order Summary
              </h2>
              
              <div className="space-y-4">
                {cartItems.map(item => (
<div key={item.id} className="flex gap-3">
                    <img
                      src={getDirectImageUrl(item.image)}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-luxury-900 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-sm text-luxury-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-luxury-900">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-luxury-200 space-y-2">
                <div className="flex justify-between text-luxury-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-luxury-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                </div>
                <div className="flex justify-between text-luxury-600">
                  <span>Tax</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-luxury-900 pt-2 border-t border-luxury-200">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
