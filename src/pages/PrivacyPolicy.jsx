import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { motion } from 'framer-motion';
import SEOHelmet from '../utils/seoHelmet';

const PrivacyPolicyPage = () => {
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
        title="Privacy Policy | Panstellia"
        description="Privacy policy for Panstellia. Learn how we collect, use, and protect your personal data."
        keywords="privacy policy, data protection, privacy"
        canonical="https://panstellia.com/privacy"
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
              Privacy Policy
            </h1>
            <p className="text-luxury-600 mt-2 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 space-y-8 text-luxury-800 leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">1. Information We Collect</h2>
            <p className="text-lg mb-6">
              We collect personal information that you provide to us when you register, place an order, 
              contact customer service, or participate in any promotions or surveys.
            </p>
            <ul className="space-y-2 ml-6">
              <li>• Full name, email address, phone number, shipping/billing address</li>
              <li>• Payment information (processed securely by third-party gateways)</li>
              <li>• Product preferences and purchase history</li>
              <li>• Device information, IP address, browser type (for analytics)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">2. How We Use Your Information</h2>
            <p className="text-lg mb-6">
              We use your information to process orders, provide customer service, improve our website, 
              send promotional emails (with opt-out), and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">3. Cookies & Tracking</h2>
            <p className="text-lg mb-6">
              We use essential cookies for site functionality and analytics cookies for performance tracking. 
              You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">4. Data Sharing</h2>
            <p className="text-lg mb-6">
              We share information with shipping partners, payment processors, and service providers. 
              We never sell your personal data. Data may be shared if required by law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">5. Your Rights</h2>
            <ul className="grid md:grid-cols-2 gap-4 text-lg">
              <li><strong>Access:</strong> Request copy of your data</li>
              <li><strong>Rectification:</strong> Correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request data removal (subject to legal obligations)</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">6. Data Security</h2>
            <p className="text-lg mb-6">
              We implement industry-standard security measures including SSL encryption, secure servers, 
              and regular security audits to protect your information.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">7. Changes to Policy</h2>
            <p className="text-lg mb-6">
              We may update this policy periodically. Significant changes will be notified via email 
              or site banner. Continued use constitutes acceptance.
            </p>
          </section>

          <section className="border-t border-luxury-200 pt-8">
            <p className="text-sm text-luxury-500 mb-4">Questions? Contact us at <a href="mailto:support@panstellia.com" className="text-gold-600 hover:underline">support@panstellia.com</a></p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-gold-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-gold-600 transition-all shadow-lg"
            >
              Back to Shopping
            </Link>
          </section>
        </div>
      </motion.div>
    </motion.div>
    </>
  );
};

export default PrivacyPolicyPage;

