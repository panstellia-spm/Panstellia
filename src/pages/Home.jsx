import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Star, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, BadgePercent, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/UI/ProductCard';
import SEOHelmet from '../utils/seoHelmet';
import { getOrganizationSchema } from '../utils/structuredData';
import { getCategoryLabel } from '../utils/categoryLabels';

const HomePage = () => {
  const { getFeaturedProducts, products, loading } = useProducts();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentHeroImageIndex, setCurrentHeroImageIndex] = useState(0);

  const heroImages = [
    'https://i.ibb.co/svsgC1qD/file-000000007ee87208b4727ab98f280ef7.png',
    'https://i.ibb.co/FbBwVw0x/file-000000001d907208abea67f9c539d069.png',
    'https://i.ibb.co/HTxTW4Mc/file-00000000f23871fabbbf324fd6b04d95.png',
    'https://i.ibb.co/tM3wvGWN/file-00000000996072079f2b1c3a294c96b1.png',
    'https://i.ibb.co/5WhvJJwq/file-00000000ca2471fa9a25e61fd0fccb26.png',
  ];

  const collectionImages = [
    'https://i.ibb.co/wFKPsvF3/file-0000000067f871faa8219b12c171e65f.png',
    'https://i.ibb.co/v6D0LrQG/file-0000000035cc71fa963321ed9c5ee32f.png',
    'https://i.ibb.co/HfHynYrb/file-00000000501871fabeb3ad48399d23bd.png',
    'https://i.ibb.co/4gRy3WYW/Use-AI-Image-May-19-2026-13-21-30.png',
    'https://i.ibb.co/DD38dQ8Q/file-000000008b207207972a2996aa7d3be3.png',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % collectionImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [collectionImages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const categories = [
    {
      name: 'Gold',
      image: 'https://i.ibb.co/4gRy3WYW/Use-AI-Image-May-19-2026-13-21-30.png',
      count: products.filter(p => p.category === 'Gold').length
    },
    {
      name: 'Silver',
      image: 'https://i.ibb.co/p6W1S5xB/1000092270-ezremove.png',
      count: products.filter(p => p.category === 'Silver').length
    },
    {
      name: 'Lux Wear',
      image: 'https://i.ibb.co/VcdqqHdc/1000092272-ezremove.png',
      count: products.filter(p => p.category === 'Lux Wear').length
    },
    {
      name: 'Party Wear',
      image: 'https://i.ibb.co/xtcV8FKd/1000092275-ezremove.png',
      count: products.filter(p => p.category === 'Party Wear').length
    }
    ,
    {
      name: 'Elegant Spark',
      image: 'https://i.ibb.co/DD38dQ8Q/file-000000008b207207972a2996aa7d3be3.png',
      count: products.filter(p => p.category === 'Elegant Spark').length
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
      description: '5-day return policy'
    },
    {
      icon: Star,
      title: 'Quality Guaranteed',
      description: 'Authentic materials only'
    }
  ];

  const offers = [
    {
      icon: BadgePercent,
      title: 'Starting ₹199',
      text: 'Daily wear jewellery picks',
      to: '/products?maxPrice=199&sortBy=price-low',
      tone: 'from-gold-500 to-gold-700'
    },
    {
      icon: Gift,
      title: 'Under ₹499',
      text: 'Gift-ready favourites',
      to: '/products?maxPrice=499&sortBy=price-low',
      tone: 'from-luxury-800 to-luxury-600'
    },
    {
      icon: Sparkles,
      title: '25% OFF',
      text: `${getCategoryLabel('Lux Wear')} collection`,
      to: '/products?category=Lux%20Wear',
      tone: 'from-rose-500 to-gold-600'
    },
    {
      icon: Star,
      title: 'Best Rated',
      text: 'Customer-loved pieces',
      to: '/products?sortBy=rating',
      tone: 'from-emerald-700 to-gold-600'
    }
  ];

  const featuredProducts = getFeaturedProducts();

  return (
    <div className="min-h-screen">
      <SEOHelmet 
        title="Panstellia | Luxury Necklace Jewelry Collections"
        description="Discover exquisite necklace jewelry collections from Panstellia. Premium Luxe Ring, Royal Braces, Elite Series, and Piercings pieces for weddings, parties, and everyday elegance."
        keywords="luxury necklaces, luxe ring necklaces, royal braces necklaces, elite series jewelry, piercing jewelry, handcrafted necklaces, jewelry store"
        canonical="https://panstellia.com"
        structuredData={getOrganizationSchema()}
        preloadImages={[heroImages[0]]}
      />
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center bg-gradient-to-r from-luxury-100 via-luxury-50 to-gold-50 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2"
            >
              <div className="inline-flex items-center px-4 py-2 bg-gold-100 rounded-full text-gold-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                New Collection 2026
              </div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-luxury-900 leading-tight">
                Elegance in
                <span className="text-gradient block">Every Jewellery</span>
              </h1>
              <p className="mt-6 text-lg text-luxury-600 max-w-lg">
                Discover our exquisite collection of necklaces - from Elite Series elegance to piercing glamour.
                Each piece crafted to make you shine.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/products" className="btn-primary inline-flex items-center justify-center">
                  Shop Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <Link to="/products?category=Lux Wear" className="btn-secondary inline-flex items-center justify-center">
                  {getCategoryLabel('Lux Wear')} Collection
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="block lg:col-span-3"
            >
              <div className="relative h-96 md:h-screen">
                <div className="absolute -top-4 -left-4 w-96 h-96 bg-gold-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
                <div className="absolute -bottom-4 -right-4 w-96 h-96 bg-luxury-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
                
                <div className="relative w-full h-full overflow-hidden rounded-2xl shadow-2xl">
                  {heroImages.map((img, index) => (
                    <motion.img
                      key={index}
                      src={img}
                      alt={`Featured Necklace ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index === 0 ? 'high' : 'low'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: index === currentHeroImageIndex ? 1 : 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ))}
                </div>
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

      {/* Offers */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">Today&apos;s Offers</h2>
              <p className="mt-3 text-luxury-600">Quick deals for every budget and occasion</p>
            </div>
            <Link to="/products?sortBy=price-low" className="hidden sm:inline-flex btn-secondary items-center">
              View Deals
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          <div className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4">
            {offers.map((offer, index) => (
              <motion.div
                key={offer.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="h-full"
              >
                <Link
                  to={offer.to}
                  className={`group relative flex h-36 overflow-hidden rounded-xl bg-gradient-to-br ${offer.tone} p-4 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:h-40 sm:p-5`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.34),transparent_38%)] opacity-80"></div>
                  <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <offer.icon className="h-6 w-6 shrink-0 drop-shadow sm:h-7 sm:w-7" />
                      <span className="rounded-full bg-white/18 px-2 py-1 text-[10px] font-semibold backdrop-blur-sm sm:px-3 sm:text-xs">
                        Limited
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-bold leading-tight sm:text-2xl">{offer.title}</h3>
                      <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs leading-4 text-white/85 sm:mt-2 sm:text-sm">
                        {offer.text}
                      </p>
                      <span className="mt-2 inline-flex items-center text-xs font-semibold sm:mt-4 sm:text-sm">
                        Shop now
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link to="/products?sortBy=price-low" className="btn-secondary inline-flex items-center justify-center">
              View Deals
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
                      alt={getCategoryLabel(category.name)}
                      loading={index < 5 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index < 5 ? 'high' : 'auto'}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-serif text-xl font-semibold">{getCategoryLabel(category.name)}</h3>
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                  <ProductCard product={product} priority={index < 4} />
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
                Trending Collections
              </h2>
              <p className="mt-4 text-white/90 text-lg">
                Get upto 25% off on our Premium collection. Make your special day even more memorable with our exquisite designs.
              </p>
              <Link 
                to="/products?category=Lux%20Wear" 
                className="mt-6 inline-flex items-center px-6 py-3 bg-white text-gold-600 rounded-lg font-medium hover:bg-luxury-50 transition-colors"
              >
                View Collection
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            <div className="flex items-center justify-center relative h-96 md:h-screen-1/2">
              <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl">
                {collectionImages.map((img, index) => (
                  <motion.img
                    key={index}
                    src={img}
                    alt={`Collection ${index + 1}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ))}
                
                {/* Navigation Buttons */}
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + collectionImages.length) % collectionImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gold-600 p-2 rounded-full transition-all z-10 shadow-lg"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % collectionImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gold-600 p-2 rounded-full transition-all z-10 shadow-lg"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Dot Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {collectionImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-6'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
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
