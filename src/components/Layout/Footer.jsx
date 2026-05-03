import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-luxury-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
{/* Brand */}
          <div>
            <img src="/favicon.svg" alt="Panstellia" className="h-12 w-auto mb-4" />
            <p className="text-luxury-300 text-sm leading-relaxed">
              Discover exquisite necklace jewelry for every occasion. From Lux Wear elegance to party glamour, we bring you the finest pieces.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="https://www.instagram.com/panstellia" className="text-luxury-300 hover:text-gold-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-luxury-300 hover:text-gold-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
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
                  Gold Collection
                </Link>
              </li>
              <li>
                <Link to="/products?category=Lux Wear" className="text-luxury-300 hover:text-gold-400 transition-colors">
                  Lux Wear Collection
                </Link>
              </li>
              <li>
              <Link to="/products?category=Party%20Wear" className="text-luxury-300 hover:text-gold-400 transition-colors">
                  Party Wear
                </Link>
              </li>
              <li>
                <Link to="/about-us" className="text-luxury-300 hover:text-gold-400 transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>


          {/* Customer Service */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2">
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

          {/* Contact */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center text-luxury-300">
                <MapPin className="w-5 h-5 mr-2" />
                <span>9A, Indhira Nagar, Neyveli, Cuddlore, TamilNadu, India</span>
              </li>
              <li className="flex items-center text-luxury-300">
                <Phone className="w-5 h-5 mr-2" />
                <span>+91 78100 32622, +91 90802 32622</span>
              </li>
              <li className="flex items-center text-luxury-300">
                <Mail className="w-5 h-5 mr-2" />
                <span>support@panstellia.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-luxury-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-luxury-400 text-sm">
            © {new Date().getFullYear()} Panstellia. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy" className="text-luxury-400 text-sm hover:text-gold-400">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-luxury-400 text-sm hover:text-gold-400">
              Terms & Conditions
            </Link>
            <Link to="/shipping" className="text-luxury-400 text-sm hover:text-gold-400">
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
