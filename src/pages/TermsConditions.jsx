import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { motion } from 'framer-motion';
import SEOHelmet from '../utils/seoHelmet';

const TermsConditionsPage = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <SEOHelmet 
        title="Terms & Conditions | Panstellia"
        description="Terms and conditions for using Panstellia website and services. Please read carefully before making purchases."
        keywords="terms and conditions, terms of service, legal terms"
        canonical="https://panstellia.com/terms"
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
              <Link to="/" className="flex items-center gap-2 text-luxury-600 hover:text-gold-600 text-sm font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>
          <div className="text-center mt-4">
            <h1 className="font-serif text-3xl md:text-4xl font-bold bg-gradient-to-r from-gold-600 to-amber-600 bg-clip-text text-transparent">
              Terms & Conditions
            </h1>
            <p className="text-luxury-600 mt-2 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 space-y-8 text-luxury-800 leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">1. Acceptance of Terms</h2>
            <p className="text-lg mb-6">
              By accessing and using Panstellia.com, you agree to be bound by these Terms & Conditions. 
              If you do not agree, please do not use the site.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">2. Use of Site</h2>
            <p className="text-lg mb-6">
              Content is for informational purposes. You agree not to reproduce, distribute, or 
              modify without permission. We reserve the right to terminate access at our discretion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">3. Orders & Payments</h2>
            <ul className="space-y-2 ml-6 mb-6">
              <li>• All orders are subject to availability and approval</li>
              <li>• Prices include taxes where applicable; final price shown at checkout</li>
              <li>• Payments processed securely via trusted gateways</li>
              <li>• Order confirmation sent via email</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">4. Shipping & Delivery</h2>
            <p className="text-lg mb-6">See our <Link to="/shipping" className="text-gold-600 hover:underline font-medium">Shipping Policy</Link> for details.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">5. Returns & Refunds</h2>
            <ul className="space-y-2 ml-6 mb-6">
              <li>• 7-day return window for unused items in original packaging</li>
              <li>• Return shipping paid by customer (except defective items)</li>
              <li>• Refunds processed within 5-7 business days</li>
              <li>• No returns on custom/engraved jewelry</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">6. Product Information</h2>
            <p className="text-lg mb-6">
              We strive for accuracy, but colors may vary due to screen settings. All jewelry is 
              certified and hallmarked where applicable.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">7. Limitation of Liability</h2>
            <p className="text-lg mb-6">
              Our liability is limited to the purchase price. We are not responsible for indirect 
              damages or misuse of products.
            </p>
          </section>

          <section className="border-t border-luxury-200 pt-8">
            <p className="text-sm text-luxury-500 mb-4">Questions? Contact us at <a href="mailto:support@panstellia.com" className="text-gold-600 hover:underline">support@panstellia.com</a></p>
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
    </>
  );
};

export default TermsConditionsPage;

