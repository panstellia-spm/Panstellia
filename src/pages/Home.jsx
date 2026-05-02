import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Star, Truck, Shield, RefreshCw } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/UI/ProductCard';

const HomePage = () => {
  const { getFeaturedProducts, products, loading } = useProducts();

  const categories = [
    {
      name: 'Gold',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
      count: products.filter(p => p.category === 'Gold').length
    },
    {
      name: 'Silver',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
      count: products.filter(p => p.category === 'Silver').length
    },
    {
      name: 'Bridal',
      image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400',
      count: products.filter(p => p.category === 'Bridal').length
    },
    {
      name: 'Party Wear',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
      count: products.filter(p => p.category === 'Party Wear').length
    }
  ];

  const features = [
    {
      icon: Truck,
      title: 'Free Shipping',
      description: 'On orders above ₹1000'
    },
    {
      icon: Shield,
      title: 'Secure Payment',
      description: '100% secure transactions'
    },
    {
      icon: RefreshCw,
      title: 'Easy Returns',
      description: '10-day return policy'
    },
    {
      icon: Star,
      title: 'Quality Guaranteed',
      description: 'Authentic materials only'
    }
  ];

  const featuredProducts = getFeaturedProducts();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center bg-gradient-to-r from-luxury-100 via-luxury-50 to-gold-50 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center px-4 py-2 bg-gold-100 rounded-full text-gold-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                New Collection 2026
              </div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-luxury-900 leading-tight">
                Elegance in
                <span className="text-gradient block">Every Necklace</span>
              </h1>
              <p className="mt-6 text-lg text-luxury-600 max-w-lg">
                Discover our exquisite collection of necklaces - from bridal elegance to party glamour. 
                Each piece crafted to make you shine.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/products" className="btn-primary inline-flex items-center justify-center">
                  Shop Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <Link to="/products?category=Bridal" className="btn-secondary inline-flex items-center justify-center">
                  Bridal Collection
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-gold-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
                <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-luxury-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
                <img 
                  src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800" 
                  alt="Featured Necklace" 
                  className="relative rounded-2xl shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="py-8 bg-white shadow-md relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-gold-600" />
                </div>
                <div>
                  <h4 className="font-medium text-luxury-900">{feature.title}</h4>
                  <p className="text-sm text-luxury-500">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-luxury-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">Shop by Category</h2>
            <p className="mt-4 text-luxury-600">Find the perfect piece for every occasion</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/products?category=${category.name}`} className="group block">
                  <div className="relative overflow-hidden rounded-xl aspect-[3/4]">
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-serif text-xl font-semibold">{category.name}</h3>
                      <p className="text-white/80 text-sm">{category.count} Products</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">Featured Collections</h2>
              <p className="mt-4 text-luxury-600">Our most loved pieces</p>
            </div>
            <Link to="/products" className="hidden md:inline-flex btn-secondary">
              View All
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden">
                  <div className="skeleton aspect-[3/4]"></div>
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4"></div>
                    <div className="skeleton h-4 w-1/2"></div>
                  </div>
                </div>
              ))
            ) : (
              featuredProducts.slice(0, 8).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))
            )}
          </div>

          <div className="mt-8 text-center md:hidden w-full max-w-sm mx-auto">
            <Link to="/products" className="btn-secondary inline-flex items-center justify-center">
              View All
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Banner Section */}
      <section className="py-16 bg-gradient-to-r from-gold-500 to-gold-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="font-serif text-3xl md:text-4xl font-bold">
                Wedding Season Special
              </h2>
              <p className="mt-4 text-white/90 text-lg">
                Get upto 25% off on our bridal collection. Make your special day even more memorable with our exquisite designs.
              </p>
              <Link 
                to="/products?category=Bridal" 
                className="mt-6 inline-flex items-center px-6 py-3 bg-white text-gold-600 rounded-lg font-medium hover:bg-luxury-50 transition-colors"
              >
                Shop Bridal
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600" 
                alt="Bridal Collection"
                className="rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-luxury-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">Stay Updated</h2>
            <p className="mt-4 text-luxury-600">
              Subscribe to our newsletter for exclusive offers and new arrivals
            </p>
            <form className="mt-6 flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <button type="submit" className="btn-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
