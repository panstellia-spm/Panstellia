import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, ChevronLeft, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { createRazorpayOrder, verifyPayment, openCheckout, markPaymentFailed } from '../services/payment';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendOrderNotifications, formatOrderDataForEmail } from '../services/orderNotifications';

import { getOptimizedImageUrl } from '../utils/imageUtils';
import SEOHelmet from '../utils/seoHelmet';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, subtotal, shipping, tax, total, clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('razorpay');
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

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.phone || !formData.address) {
        throw new Error('Please fill in all required fields');
      }

      // COD flow (no gateway verification)
      if (selectedPaymentMethod === 'cod') {
        try {
          const paymentMethod = 'cod';
          const shortCode = Math.random().toString(36).slice(2, 8).toUpperCase();
          const orderId = `COD-${shortCode}`;

          const paymentItems = cartItems.map((ci) => ({
            name: ci.name,
            price: ci.price,
            quantity: ci.quantity,
            image: ci.image,
          }));

          // Persist COD as a payment record
          await addDoc(collection(db, 'payments'), {
            orderId: orderId,
            customerName: formData.name,
            phone: formData.phone,
            amount: total * 100, // keep paise
            paymentMethod,
            paymentStatus: 'Pending',
            createdAt: serverTimestamp(),
            items: paymentItems,
            userId: user.uid,
            shippingAddress: formData.address,
            shippingCity: formData.city,
            shippingState: formData.state,
            shippingPincode: formData.pincode,
            customerOrderId: orderId,
          });

          // Persist order so it appears in the user dashboard (/orders and /order/:id)
          await addDoc(collection(db, 'orders'), {
            userId: user.uid,
            orderId,
            customerName: formData.name,
            phone: formData.phone,
            total,
            items: paymentItems,
            status: 'processing',
            createdAt: serverTimestamp(),
            paymentMethod,
            paymentStatus: 'Pending',
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
          });

          // Send order confirmation and admin notification emails
          try {
            const emailData = formatOrderDataForEmail({
              orderId,
              customerName: formData.name,
              customerEmail: formData.email,
              customerPhone: formData.phone,
              paymentMethod,
              shippingAddress: formData.address,
              shippingCity: formData.city,
              shippingState: formData.state,
              shippingPincode: formData.pincode,
              cartItems: paymentItems,
              total,
              tax: 0,
              shipping: 0,
            });

            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@panstellia.com';
            const emailResults = await sendOrderNotifications(emailData, adminEmail);

            if (emailResults.customerEmail.sent) {
              console.log('✅ Customer confirmation email sent');
            }
            if (emailResults.adminEmail.sent) {
              console.log('✅ Admin notification email sent');
            }
          } catch (emailError) {
            console.error('⚠️ Email sending error (order still placed):', emailError);
          }

          await clearCart();

          toast.success('Order placed. Cash on Delivery selected!', {
            position: 'bottom-right',
          });

          navigate('/order-success', {
            state: {
              orderId,
              items: cartItems,
              total,
            },
          });
        } catch (e) {
          console.error('Failed to store COD payment record in Firestore:', e);
          toast.error('Failed to place COD order. Please try again.', {
            position: 'bottom-right',
          });
          return;
        }

        return;
      }

      // Razorpay flow
      const amountInPaise = Math.round(total * 100);
      const authToken = await user.getIdToken();
      const cartItemsSnapshot = cartItems.map((ci) => ({
        id: ci.id,
        name: ci.name,
        price: ci.price,
        quantity: ci.quantity,
        image: ci.image,
        category: ci.category,
      }));

      if (amountInPaise < 100) {
        throw new Error('Minimum order amount is ₹1');
      }

      const orderData = await createRazorpayOrder(amountInPaise, 'INR', {
        receipt: `order_${Date.now()}`,
        authToken,
        notes: {
          userId: user.uid,
          customerEmail: formData.email,
          customerName: formData.name,
        },
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        },
        items: cartItemsSnapshot,
        totals: {
          subtotal,
          shipping,
          tax,
          total,
        },
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
      });

      const { order_id, order_number } = orderData;

      const markCurrentPaymentFailed = async (reason, paymentId) => {
        try {
          await markPaymentFailed(order_id, {
            authToken,
            paymentId,
            reason,
          });
        } catch (statusError) {
          console.error('Failed to update failed payment status:', statusError);
        }
      };

      const razorpayOptions = {
        amount: amountInPaise,
        currency: 'INR',
        name: 'Panstellia',
        description: `Panstellia jewellery order ${order_number || order_id}`,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200',
        order_id: order_id,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#db912d',
        },
        onSuccess: async (response) => {
          try {
            const verificationResult = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              { authToken }
            );

            if (verificationResult.verified) {
              toast.success('Payment successful!', {
                position: 'bottom-right',
              });

              try {
                const orderId = verificationResult.order_number || order_number || response.razorpay_order_id;
                const emailData = formatOrderDataForEmail({
                  orderId,
                  customerName: formData.name,
                  customerEmail: formData.email,
                  customerPhone: formData.phone,
                  paymentMethod: 'razorpay',
                  shippingAddress: formData.address,
                  shippingCity: formData.city,
                  shippingState: formData.state,
                  shippingPincode: formData.pincode,
                  cartItems: cartItemsSnapshot,
                  total,
                  tax,
                  shipping,
                });

                const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@panstellia.com';
                const emailResults = await sendOrderNotifications(emailData, adminEmail);

                if (emailResults.customerEmail.sent) {
                  console.log('✅ Customer confirmation email sent');
                }
                if (emailResults.adminEmail.sent) {
                  console.log('✅ Admin notification email sent');
                }
              } catch (emailError) {
                console.error('⚠️ Email sending error (order still placed):', emailError);
              }

              await clearCart();

              navigate('/order-success', {
                state: {
                  orderId: verificationResult.order_number || order_number || response.razorpay_order_id,
                  items: cartItemsSnapshot,
                  total,
                },
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            await markCurrentPaymentFailed(error.message || 'Payment verification failed', response.razorpay_payment_id);
            toast.error('Payment verification failed. Please contact support.', {
              position: 'bottom-right',
            });
          }
        },
        onFailure: async (response) => {
          const paymentId = response?.error?.metadata?.payment_id;
          const reason = response?.error?.description || response?.error?.reason || 'Payment failed';
          await markCurrentPaymentFailed(reason, paymentId);
          toast.error(reason, {
            position: 'bottom-right',
          });
        },
        onDismiss: async () => {
          await markCurrentPaymentFailed('Payment cancelled by customer');
          toast.info('Payment cancelled', {
            position: 'bottom-right',
          });
        },
      };

      await openCheckout(razorpayOptions);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed', {
        position: 'bottom-right',
      });
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handlePayment();
  };

  if (!user || cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet 
        title="Secure Checkout | Panstellia"
        description="Complete your jewelry purchase securely. Fast checkout with Razorpay payment gateway."
        keywords="checkout, payment, secure payment, jewelry purchase"
        canonical="https://panstellia.com/checkout"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-8">
        <Link to="/cart" className="inline-flex items-center text-luxury-600 hover:text-gold-600 mb-6 text-sm font-semibold uppercase tracking-wider">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Cart
        </Link>

        {/* Step Progress Indicator */}
        <div className="max-w-md mx-auto mb-10 mt-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-luxury-200 z-0" />
            <div className="absolute left-0 w-1/2 top-1/2 -translate-y-1/2 h-0.5 bg-gold-500 z-0" />

            {/* Step 1: Bag */}
            <div className="flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full bg-gold-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                ✓
              </div>
              <span className="text-[10px] uppercase font-bold text-gold-600 mt-2 tracking-wider">Bag</span>
            </div>

            {/* Step 2: Shipping */}
            <div className="flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full bg-gold-500 text-white border border-gold-500 flex items-center justify-center font-bold text-xs shadow-md">
                2
              </div>
              <span className="text-[10px] uppercase font-bold text-gold-600 mt-2 tracking-wider">Shipping</span>
            </div>

            {/* Step 3: Payment */}
            <div className="flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full bg-white text-luxury-400 border border-luxury-200 flex items-center justify-center font-semibold text-xs shadow-sm">
                3
              </div>
              <span className="text-[10px] uppercase font-bold text-luxury-450 mt-2 tracking-wider">Payment</span>
            </div>
          </div>
        </div>

        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8 text-center md:text-left">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 border border-luxury-100">
              <h2 className="font-serif text-xl font-bold text-luxury-900 mb-6">
                Shipping Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+91 98765 43210"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Email (Full Width) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Address (Full Width) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="input-field py-2.5 text-sm"
                    placeholder="Flat No., Building Name, Street Name"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Mumbai"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Maharashtra"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Pincode (Full Width) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="400001"
                    className="input-field py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Payment Section */}
              <div className="mt-8 pt-8 border-t border-luxury-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-xl font-bold text-luxury-900">
                    Payment Method
                  </h2>
                  <div className="flex items-center text-green-600 text-xs font-semibold uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    Secure Checkout
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Razorpay Card */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('razorpay')}
                    className={`rounded-xl p-4 flex items-center border-2 transition-all text-left ${
                      selectedPaymentMethod === 'razorpay' 
                        ? 'border-gold-500 bg-gold-50/10' 
                        : 'border-luxury-100 bg-white hover:border-luxury-300'
                    }`}
                  >
                    <CreditCard className="w-8 h-8 text-gold-600 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-luxury-900">Pay with Razorpay</p>
                      <p className="text-xs text-luxury-500 mt-0.5">Pay securely with cards, UPI, wallets</p>
                    </div>
                  </button>

                  {/* COD Card */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('cod')}
                    className={`rounded-xl p-4 flex items-center border-2 transition-all text-left ${
                      selectedPaymentMethod === 'cod' 
                        ? 'border-gold-500 bg-gold-50/10' 
                        : 'border-luxury-100 bg-white hover:border-luxury-300'
                    }`}
                  >
                    <Truck className="w-8 h-8 text-gold-600 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-luxury-900">Cash on Delivery</p>
                      <p className="text-xs text-luxury-500 mt-0.5">Pay when your order arrives</p>
                    </div>
                  </button>
                </div>
                
                <div className="mt-4 text-xs text-luxury-500 font-medium">
                  {selectedPaymentMethod === 'cod' ? (
                    <span>COD orders will show as <span className="font-bold text-luxury-700">Pending</span> until payment is received.</span>
                  ) : (
                    <span>Secure Razorpay payment. You will be redirected to Razorpay checkout.</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full btn-primary py-3 flex items-center justify-center font-bold tracking-wider text-sm shadow-md"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {selectedPaymentMethod === 'cod'
                      ? `Place COD Order ₹${total.toLocaleString()}`
                      : `Pay ₹${total.toLocaleString()}`}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sticky Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24 border border-luxury-100 flex flex-col gap-6">
              <div>
                <h2 className="font-serif text-xl font-bold text-luxury-900 mb-4">
                  Order Summary
                </h2>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={getOptimizedImageUrl(item.image, { width: 120, quality: 60 })}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-lg bg-luxury-50 border border-luxury-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-luxury-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-luxury-500 font-medium mt-0.5">Qty: {item.quantity}</p>
                        <p className="text-xs font-bold text-luxury-800 mt-1">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-luxury-150 space-y-2.5">
                <div className="flex justify-between text-xs text-luxury-600 font-medium">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-luxury-600 font-medium">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                </div>
                <div className="flex justify-between text-xs text-luxury-600 font-medium">
                  <span>Tax</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-luxury-900 pt-3 border-t border-luxury-150">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-luxury-150 flex items-center justify-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50/50 py-2 rounded-lg">
                <Lock className="w-3.5 h-3.5" />
                Payments secured by Razorpay
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
