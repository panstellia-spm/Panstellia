import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Bell, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToRestock } from '../../services/restockNotifications';
import { toast } from 'react-toastify';

const NotifyMeModal = ({ product, isOpen, onClose }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter a valid email address.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await subscribeToRestock(product.id, product.name, email, user?.uid || null);
      setIsSuccess(true);
      toast.success("You'll be notified when this item is back in stock!", {
        position: 'bottom-right'
      });
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 3000);
    } catch (err) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white/95 backdrop-blur-md rounded-2xl max-w-md w-full p-6 overflow-hidden shadow-2xl z-10 border border-luxury-100"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-luxury-100 text-luxury-500 hover:text-luxury-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-50 flex items-center justify-center text-gold-600 shadow-sm border border-gold-100">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-luxury-900">Notify Me</h3>
                  <p className="text-xs text-luxury-500 font-medium">Back in Stock Alert</p>
                </div>
              </div>

              <div className="py-2">
                <p className="text-sm text-luxury-700 leading-relaxed">
                  Get notified via email when <strong className="text-gold-700">{product.name}</strong> is back in stock.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-luxury-600 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all placeholder:text-luxury-400 text-sm bg-white/80"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center hover:from-gold-600 hover:to-gold-700 transition-all disabled:opacity-50 text-sm shadow-md active:scale-[0.98] mt-2"
              >
                {isSubmitting ? 'Subscribing...' : 'Notify Me When Available'}
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8 space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-luxury-900">Subscription Confirmed</h4>
                <p className="text-sm text-luxury-600 px-4 leading-relaxed">
                  You'll be notified at <strong className="text-luxury-800">{email}</strong> when this item is back in stock!
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotifyMeModal;
