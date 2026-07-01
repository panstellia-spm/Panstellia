import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Truck, Clock, PackageCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import SEOHelmet from '../utils/seoHelmet';
import { useCart } from '../context/CartContext';

const ShippingPolicyPage = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { shippingSettings } = useCart();

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <SEOHelmet 
        title="Shipping Policy | Panstellia"
        description="Learn about Panstellia's shipping policy, delivery times, and shipping costs. Free shipping on orders above ₹1000."
        keywords="shipping policy, delivery, shipping costs, free shipping"
        canonical="https://panstellia.com/shipping"
      />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-luxury-200 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-luxury-50 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-luxury-600" />
            </button>
            <div className="flex items-center gap-3">
              <Link to="/products" className="flex items-center gap-2 text-luxury-600 hover:text-gold-600 text-sm font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Shop
              </Link>
            </div>
          </div>
          <div className="text-center mt-4">
            <div className="flex justify-center mb-4">
              <Truck className="w-16 h-16 text-gold-500" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold bg-gradient-to-r from-gold-600 to-amber-600 bg-clip-text text-transparent">
              Shipping Policy
            </h1>
            <p className="text-luxury-600 mt-2 text-lg">Fast, secure delivery across India</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 space-y-8 text-luxury-800 leading-relaxed">
          <section>
            <p className="text-lg">
              At <strong className="text-luxury-900">PANSTELLIA</strong>, we are committed to delivering your jewellery safely and efficiently.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Order Processing</h2>
            <p className="text-lg text-luxury-700">
              All orders are processed within 24–48 hours (excluding weekends and public holidays). Once your order is processed, it is handed over to our logistics partner for dispatch.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Shipping Timeline</h2>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700">
              <li>• <strong className="text-luxury-900">Across India:</strong> 2–4 business days</li>
            </ul>
            <p className="mt-4 text-lg text-luxury-700">
              Please note that delivery timelines may vary depending on your location and unforeseen logistical delays.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Shipping Charges</h2>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700">
              <li>• <strong className="text-luxury-900">Free Shipping:</strong> Available on all prepaid orders across India.</li>
              <li>• <strong className="text-luxury-900">Cash on Delivery (if applicable):</strong> Additional charges may apply.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Order Tracking</h2>
            <p className="text-lg text-luxury-700">
              Once your order is shipped, you will receive a tracking link via email/SMS, allowing you to track your package in real time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Delivery Partners</h2>
            <p className="text-lg text-luxury-700">
              We work with trusted courier partners to ensure safe and timely delivery of your orders.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Delays & Exceptions</h2>
            <p className="text-lg text-luxury-700 mb-4">
              While we strive to deliver your order within the estimated timeframe, delays may occur due to:
            </p>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700">
              <li>• Weather conditions</li>
              <li>• Public holidays</li>
              <li>• High order volumes</li>
              <li>• Unexpected courier delays</li>
            </ul>
            <p className="mt-4 text-lg text-luxury-700">
              In such cases, we appreciate your patience and understanding.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Incorrect Address</h2>
            <p className="text-lg text-luxury-700">
              Please ensure that the shipping address provided is accurate. <strong className="text-luxury-900">PANSTELLIA</strong> will not be responsible for orders delivered to incorrect or incomplete addresses provided by the customer.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Damaged or Tampered Package</h2>
            <p className="text-lg text-luxury-700 mb-4">
              If your package appears to be tampered with or damaged, please:
            </p>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700">
              <li>• Do not accept the delivery.</li>
              <li>• Contact us immediately at our support email.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Contact Us</h2>
            <p className="text-lg text-luxury-700 mb-4">
              For any shipping-related queries, feel free to reach out to us:
            </p>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700">
              <li>📧 <strong>Email:</strong> <a href="mailto:support@panstellia.com" className="text-gold-600 hover:underline">support@panstellia.com</a></li>
              <li>📱 <strong>Response Time:</strong> Within 24–48 hours</li>
            </ul>
            <p className="mt-6 text-lg font-medium text-luxury-900">
              ✨ Thank you for choosing PANSTELLIA. We appreciate your trust in us.
            </p>
          </section>

          <section className="border-t border-luxury-200 pt-8 mt-8 flex justify-center">
            <Link 
              to="/products" 
              className="inline-flex items-center gap-2 bg-gold-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-gold-600 transition-all shadow-lg"
            >
              Continue Shopping
            </Link>
          </section>
        </div>
      </motion.div>
    </motion.div>
    </>
  );
};

export default ShippingPolicyPage;

