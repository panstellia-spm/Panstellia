import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Truck, Clock, PackageCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const ShippingPolicyPage = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
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
              <Link to="/" className="flex items-center gap-2 text-luxury-600 hover:text-gold-600 text-sm font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
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
            <h2 className="font-serif text-2xl font-bold mb-6 text-luxury-900 flex items-center gap-3">
              <Truck className="w-7 h-7 text-gold-500 flex-shrink-0" />
              Free Shipping
            </h2>
            <div className="bg-gold-50 border border-gold-200 rounded-xl p-6 mb-8">
              <p className="text-xl font-bold text-gold-700 mb-2">On orders above ₹1,000</p>
              <p className="text-lg">Enjoy complimentary shipping across India for all orders over ₹1,000.</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Shipping Rates</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-luxury-50 p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-3">Standard Delivery</h3>
                <ul className="space-y-2 text-luxury-700">
                  <li className="flex items-center gap-2"><Clock className="w-5 h-5 text-gold-500" /> 3-5 business days</li>
                  <li className="flex items-center gap-2"><PackageCheck className="w-5 h-5 text-gold-500" /> ₹80 or FREE over ₹1,000</li>
                </ul>
              </div>
              <div className="bg-luxury-50 p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-3">Express Delivery</h3>
                <ul className="space-y-2 text-luxury-700">
                  <li className="flex items-center gap-2"><Clock className="w-5 h-5 text-gold-500" /> 1-2 business days</li>
                  <li><strong>₹150 flat rate</strong></li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Delivery Areas</h2>
            <p className="text-lg mb-6">
              We deliver across all pin codes in India. International shipping coming soon!
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-indigo-200">
              <h3 className="font-semibold text-lg mb-3">Major Cities (Metro)</h3>
              <p className="text-luxury-700">Same-day dispatch | Next-day delivery</p>
              <p className="text-sm text-luxury-600 mt-2">Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Order Processing</h2>
            <ul className="space-y-3 text-lg ml-6">
              <li>• Orders placed before 2 PM: Same-day dispatch (Mon-Sat)</li>
              <li>• After 2 PM / Sundays: Next business day dispatch</li>
              <li>• Delivery timeline starts from dispatch date</li>
              <li>• Tracking provided via SMS & email</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Shipping Partners</h2>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="text-center p-4 bg-white border rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-6 h-6 text-orange-600" />
                </div>
                <p className="font-semibold text-luxury-800">DTDC</p>
              </div>
              <div className="text-center p-4 bg-white border rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-semibold text-luxury-800">BlueDart</p>
              </div>
              <div className="text-center p-4 bg-white border rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-semibold text-luxury-800">Delhivery</p>
              </div>
            </div>
          </section>

          <section className="border-t border-luxury-200 pt-8">
            <p className="text-sm text-luxury-500 mb-4">
              For shipping queries: <a href="mailto:support@panstellia.com" className="text-gold-600 hover:underline">support@panstellia.com</a> or +91 78100 32622
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-gold-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-gold-600 transition-all shadow-lg"
            >
              Continue Shopping
            </Link>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ShippingPolicyPage;

