import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import SEOHelmet from '../utils/seoHelmet';

const ReturnPolicyPage = () => {
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
        title="Return Policy | Panstellia"
        description="Learn about Panstellia's return and refund policy. 2-day return window for unworn items."
        keywords="return policy, refund policy, Panstellia returns"
        canonical="https://panstellia.com/return"
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
              <RefreshCcw className="w-16 h-16 text-gold-500" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold bg-gradient-to-r from-gold-600 to-amber-600 bg-clip-text text-transparent">
              Refund Policy
            </h1>
            <p className="text-luxury-600 mt-2 text-lg">Hassle-free returns and refunds</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 space-y-8 text-luxury-800 leading-relaxed">
          <section>
            <p className="text-lg">
              At <strong className="text-luxury-900">PANSTELLIA</strong>, we strive to ensure you love every piece you receive. However, if something isn’t right, we’re here to help.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Return Window</h2>
            <p className="text-lg text-luxury-700 mb-4">
              We have a 2-day return policy, which means you have 2 days after receiving your item to request a return.
            </p>
            <p className="text-lg text-luxury-700">
              To be eligible for a return, your item must be in the same condition that you received it—unworn or unused, with tags, in its original packaging, and accompanied by the receipt or proof of purchase.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Return Process</h2>
            <p className="text-lg text-luxury-700 mb-4">
              To start a return, contact us at <a href="mailto:support@panstellia.com" className="text-gold-600 hover:underline">support@panstellia.com</a>. Please mention your Order ID and the reason for your return request.
            </p>
            <div className="bg-luxury-50 p-6 rounded-xl border border-luxury-200 mt-4">
              <h3 className="font-semibold text-luxury-900 mb-2">Return Address:</h3>
              <address className="text-luxury-700 not-italic">
                PANSTELLIA<br />
                9A, Indra Nagar,<br />
                Neyveli, Cuddalore,<br />
                Tamil Nadu, India
              </address>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Reverse Pickup</h2>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700 list-disc">
              <li>Reverse pickup may be arranged based on your location.</li>
              <li>If reverse pickup is unavailable, you may be required to self-ship the product.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Damages and Issues</h2>
            <p className="text-lg text-luxury-700">
              Please inspect your order upon delivery and contact us immediately if the item is defective, damaged, or if you receive the wrong item. We will evaluate the issue and do our best to resolve the issue promptly.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Exceptions / Non-Returnable Items</h2>
            <p className="text-lg text-luxury-700 mb-4">
              Certain types of items cannot be returned, including:
            </p>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700 list-disc mb-4">
              <li>Perishable goods (such as food, flowers, or plants)</li>
              <li>Custom or personalized products</li>
              <li>Personal care products</li>
              <li>Hazardous materials, flammable liquids, or gases</li>
            </ul>
            <p className="text-lg text-luxury-700 mb-4">
              If you have any questions about whether your item is eligible for return, please contact us before initiating the return.
            </p>
            <p className="text-lg text-luxury-700 font-medium">
              Unfortunately, sale items and gift cards are not eligible for returns or refunds.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Refunds</h2>
            <p className="text-lg text-luxury-700 mb-4">
              Once we receive and inspect your returned item, we will notify you whether your refund has been approved.
            </p>
            <p className="text-lg text-luxury-700">
              If approved, the refund will be processed to your original payment method within 10 business days. Please note that your bank or credit card provider may require additional time to process and reflect the refund.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4 text-luxury-900">Contact Us</h2>
            <p className="text-lg text-luxury-700 mb-4">
              For any questions regarding returns or refunds, please contact us at:
            </p>
            <ul className="space-y-3 text-lg ml-6 text-luxury-700">
              <li>📧 <strong>Email:</strong> <a href="mailto:support@panstellia.com" className="text-gold-600 hover:underline">support@panstellia.com</a></li>
            </ul>
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

export default ReturnPolicyPage;
