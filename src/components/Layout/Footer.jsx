import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Phone, MapPin, Plus, Minus } from 'lucide-react';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const Footer = () => {
  const [openSection, setOpenSection] = useState({
    quickLinks: false,
    customerService: false,
    contact: false
  });
  const [email, setEmail] = useState('');

  const toggleSection = (section) => {
    setOpenSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      toast.success('Subscribed successfully! Welcome to the family.', {
        position: 'bottom-right'
      });
      setEmail('');
    }
  };

  return (
    <footer className="bg-luxury-900 text-white border-t border-luxury-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="flex flex-col justify-start">
            <img src="/favicon.svg" alt="Panstellia" className="h-12 w-auto mb-4 self-start" />
            <p className="text-luxury-300 text-sm leading-relaxed">
              Discover exquisite necklace jewelry for every occasion. From Elite Series elegance to piercing glamour, we bring you the finest pieces.
            </p>
            <div className="flex space-x-4 mt-5">
              <a href="https://www.instagram.com/panstellia" target="_blank" rel="noopener noreferrer" className="text-luxury-300 hover:text-gold-400 hover:scale-110 transition-all duration-200" aria-label="Follow us on Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/people/Panstellia-PS/61581753914404/" target="_blank" rel="noopener noreferrer" className="text-luxury-300 hover:text-gold-400 hover:scale-110 transition-all duration-200" aria-label="Follow us on Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              {/* Pinterest SVG Icon */}
              <a href="https://www.pinterest.com/panstellia" target="_blank" rel="noopener noreferrer" className="text-luxury-300 hover:text-gold-400 hover:scale-110 transition-all duration-200" aria-label="Follow us on Pinterest">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.4 7.63 11.16-.1-.95-.2-2.4.04-3.43.22-.93 1.4-5.93 1.4-5.93s-.36-.72-.36-1.77c0-1.66.96-2.9 2.17-2.9 1.02 0 1.51.77 1.51 1.69 0 1.03-.65 2.57-.99 4-.28 1.19.6 2.16 1.77 2.16 2.12 0 3.76-2.24 3.76-5.47 0-2.86-2.06-4.86-5-4.86-3.4 0-5.4 2.56-5.4 5.2 0 1.03.4 2.13.9 2.73.1.12.11.23.08.35-.1.39-.3.1.37.13-.1.04-.13-.08-.13-.08a3.72 3.72 0 0 1-.95-2.27c0-3.69 2.68-7.07 7.72-7.07 4.05 0 7.2 2.89 7.2 6.74 0 4.02-2.54 7.26-6.07 7.26-1.18 0-2.3-.61-2.68-1.34l-.73 2.79c-.26 1.02-.98 2.3-1.46 3.08A12 12 0 1 0 12 0z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <button
              onClick={() => toggleSection('quickLinks')}
              type="button"
              className="w-full md:pointer-events-none flex justify-between items-center md:block font-serif text-base font-bold text-white mb-3 md:mb-4 text-left border-b border-luxury-800 pb-2 md:border-b-0 md:pb-0"
            >
              <span>Quick Links</span>
              <span className="md:hidden text-gold-500">
                {openSection.quickLinks ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
            </button>

            <div className={`md:block overflow-hidden transition-all duration-300 ${
              openSection.quickLinks ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 md:max-h-full md:opacity-100'
            }`}>
              <ul className="space-y-2 mt-2 md:mt-0 text-sm">
                <li>
                  <Link to="/" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/products" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    Shop
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=Gold" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    {getCategoryLabel('Gold')} Collection
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=Lux Wear" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    {getCategoryLabel('Lux Wear')} Collection
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=Party%20Wear" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    {getCategoryLabel('Party Wear')}
                  </Link>
                </li>
                <li>
                  <Link to="/category/elegant-spark" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    {getCategoryLabel('Elegant Spark')} Collection
                  </Link>
                </li>
                <li>
                  <Link to="/about-us" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Customer Service Column */}
          <div>
            <button
              onClick={() => toggleSection('customerService')}
              type="button"
              className="w-full md:pointer-events-none flex justify-between items-center md:block font-serif text-base font-bold text-white mb-3 md:mb-4 text-left border-b border-luxury-800 pb-2 md:border-b-0 md:pb-0"
            >
              <span>Customer Service</span>
              <span className="md:hidden text-gold-500">
                {openSection.customerService ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
            </button>

            <div className={`md:block overflow-hidden transition-all duration-300 ${
              openSection.customerService ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 md:max-h-full md:opacity-100'
            }`}>
              <ul className="space-y-2 mt-2 md:mt-0 text-sm">
                <li>
                  <Link to="/orders" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    Shopping Cart
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-luxury-300 hover:text-gold-400 transition-colors">
                    Login / Signup
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 4: Newsletter + Contact details */}
          <div>
            <button
              onClick={() => toggleSection('contact')}
              type="button"
              className="w-full md:pointer-events-none flex justify-between items-center md:block font-serif text-base font-bold text-white mb-3 md:mb-4 text-left border-b border-luxury-800 pb-2 md:border-b-0 md:pb-0"
            >
              <span>Contact & Offers</span>
              <span className="md:hidden text-gold-500">
                {openSection.contact ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
            </button>

            <div className={`md:block overflow-hidden transition-all duration-300 ${
              openSection.contact ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 md:max-h-full md:opacity-100'
            }`}>
              <div className="mt-2 md:mt-0 space-y-4">
                {/* Newsletter Sign up form */}
                <div>
                  <p className="text-xs text-luxury-300 mb-2 font-semibold uppercase tracking-wider">Get exclusive offers:</p>
                  <form onSubmit={handleSubscribe} className="flex">
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email" 
                      required
                      className="flex-1 bg-luxury-800 text-white text-xs px-3 py-2 rounded-l-lg border border-luxury-700 outline-none focus:border-gold-500" 
                    />
                    <button type="submit" className="bg-gold-500 text-white px-3.5 py-2 rounded-r-lg text-xs font-bold hover:bg-gold-650 transition-colors">→</button>
                  </form>
                </div>

                <ul className="space-y-3 text-sm pt-2 border-t border-luxury-800 md:border-t-0 md:pt-0">
                  <li className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2.5 mt-0.5 text-gold-500 flex-shrink-0" />
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=9A+Indhira+Nagar+Neyveli+Cuddalore+TamilNadu+India"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-luxury-300 hover:text-gold-400 transition-colors underline-offset-2 hover:underline"
                    >
                      9A, Indhira Nagar, Neyveli, Cuddalore, TamilNadu, India
                    </a>
                  </li>
                  <li className="flex items-center">
                    <Phone className="w-4 h-4 mr-2.5 text-gold-500 flex-shrink-0" />
                    <span className="flex flex-wrap gap-x-1 text-luxury-300">
                      <a href="tel:+917810032622" className="hover:text-gold-400 transition-colors underline-offset-2 hover:underline">+91 78100 32622</a>,
                      <a href="tel:+919080232622" className="hover:text-gold-400 transition-colors underline-offset-2 hover:underline">+91 90802 32622</a>
                    </span>
                  </li>
                  <li className="flex items-center">
                    <Mail className="w-4 h-4 mr-2.5 text-gold-500 flex-shrink-0" />
                    <a
                      href="mailto:support@panstellia.com"
                      className="text-luxury-300 hover:text-gold-400 transition-colors underline-offset-2 hover:underline"
                    >
                      support@panstellia.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-luxury-800 mt-10 pt-8 flex flex-col items-center">
          {/* Payment Method Logo Strip */}
          <div className="flex gap-4 justify-center mb-6 opacity-50 text-[10px] text-luxury-400 tracking-widest font-bold uppercase select-none">
            VISA · MASTERCARD · UPI · RAZORPAY · COD
          </div>

          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-luxury-400 text-xs text-center md:text-left">
              © {new Date().getFullYear()} Panstellia. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs">
              <Link to="/privacy" className="text-luxury-400 hover:text-gold-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-luxury-400 hover:text-gold-400 transition-colors">
                Terms & Conditions
              </Link>
              <Link to="/shipping" className="text-luxury-400 hover:text-gold-400 transition-colors">
                Shipping Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
