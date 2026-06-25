import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Star, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, 
  BadgePercent, Gift, Home, Store, Gem, CircleDot, Crown, Diamond, Heart, Search 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/UI/ProductCard';
import OptimizedImage from '../components/UI/OptimizedImage';
import ClientReviews from '../components/UI/ClientReviews';
import CustomerFeedback from '../components/UI/CustomerFeedback';
import SEOHelmet from '../utils/seoHelmet';
import { getOrganizationSchema, getSiteNavigationSchema, getWebSiteSchema } from '../utils/structuredData';
import { getCategoryLabel } from '../utils/categoryLabels';
import { toast } from 'react-toastify';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useCart } from '../context/CartContext';

const ICON_MAP = {
  Sparkles, ArrowRight, Star, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, 
  BadgePercent, Gift, Home, Store, Gem, CircleDot, Crown, Diamond, Heart, Search
};

const CATEGORY_IMAGE_MAP = {
  'Gold': 'https://i.ibb.co/4gRy3WYW/Use-AI-Image-May-19-2026-13-21-30.png',
  'Silver': 'https://i.ibb.co/p6W1S5xB/1000092270-ezremove.png',
  'Lux Wear': 'https://i.ibb.co/VcdqqHdc/1000092272-ezremove.png',
  'Party Wear': 'https://i.ibb.co/xtcV8FKd/1000092275-ezremove.png',
  'Elegant Spark': 'https://i.ibb.co/DD38dQ8Q/file-000000008b207207972a2996aa7d3be3.png'
};

const HomePage = () => {
  const { getFeaturedProducts, products, loading } = useProducts();
  const { shippingSettings } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentHeroImageIndex, setCurrentHeroImageIndex] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [layout, setLayout] = useState(null);
  const [hideEmptyCollections, setHideEmptyCollections] = useState(false);

  const RAW_HERO_IMAGES = [
    'https://i.ibb.co/wFKPsvF3/file-0000000067f871faa8219b12c171e65f.png',
    'https://i.ibb.co/FbBwVw0x/file-000000001d907208abea67f9c539d069.png',
    'https://i.ibb.co/HTxTW4Mc/file-00000000f23871fabbbf324fd6b04d95.png',
    'https://i.ibb.co/tM3wvGWN/file-00000000996072079f2b1c3a294c96b1.png',
    'https://i.ibb.co/5WhvJJwq/file-00000000ca2471fa9a25e61fd0fccb26.png',
  ];
  const heroImages = RAW_HERO_IMAGES.map((url) =>
    getOptimizedImageUrl(url, { width: 1920, quality: 90 })
  );

  const RAW_COLLECTION_IMAGES = [
    'https://i.ibb.co/wFKPsvF3/file-0000000067f871faa8219b12c171e65f.png',
    'https://i.ibb.co/v6D0LrQG/file-0000000035cc71fa963321ed9c5ee32f.png',
    'https://i.ibb.co/HfHynYrb/file-00000000501871fabeb3ad48399d23bd.png',
    'https://i.ibb.co/4gRy3WYW/Use-AI-Image-May-19-2026-13-21-30.png',
    'https://i.ibb.co/DD38dQ8Q/file-000000008b207207972a2996aa7d3be3.png',
  ];
  const collectionImages = RAW_COLLECTION_IMAGES.map((url) =>
    getOptimizedImageUrl(url, { width: 800, quality: 80 })
  );

  // Subscribe layout updates from firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'homepage_layout', 'active'), (snapshot) => {
      if (snapshot.exists()) {
        setLayout(snapshot.data());
      }
    }, (error) => {
      console.error("Error listening to homepage layout:", error);
    });
    
    const unsubFilters = onSnapshot(doc(db, 'system_settings', 'filters'), (snapshot) => {
      if (snapshot.exists()) {
        setHideEmptyCollections(snapshot.data().hideEmptyCollections || false);
      }
    }, (error) => {
      console.error("Error listening to filters:", error);
    });

    return () => {
      unsub();
      unsubFilters();
    };
  }, []);

  const activeSections = layout?.sections
    ? [...layout.sections]
        .filter((sec) => {
          if (sec.enabled === false) return false;
          const now = new Date();
          if (sec.startDate) {
            if (new Date(sec.startDate) > now) return false;
          }
          if (sec.endDate) {
            if (new Date(sec.endDate) < now) return false;
          }
          return true;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    : null;

  const slidesCount = activeSections?.find(s => s.type === 'hero')?.slides?.length || heroImages.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % collectionImages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [collectionImages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImageIndex((prev) => (prev + 1) % slidesCount);
    }, 4000);
    return () => clearInterval(interval);
  }, [slidesCount]);

  const categories = [
    {
      name: 'Gold',
      image: getOptimizedImageUrl('https://i.ibb.co/4gRy3WYW/Use-AI-Image-May-19-2026-13-21-30.png', { width: 600 }),
      count: products.filter(p => p.category === 'Gold').length
    },
    {
      name: 'Silver',
      image: getOptimizedImageUrl('https://i.ibb.co/p6W1S5xB/1000092270-ezremove.png', { width: 600 }),
      count: products.filter(p => p.category === 'Silver').length
    },
    {
      name: 'Lux Wear',
      image: getOptimizedImageUrl('https://i.ibb.co/VcdqqHdc/1000092272-ezremove.png', { width: 600 }),
      count: products.filter(p => p.category === 'Lux Wear').length
    },
    {
      name: 'Party Wear',
      image: getOptimizedImageUrl('https://i.ibb.co/xtcV8FKd/1000092275-ezremove.png', { width: 600 }),
      count: products.filter(p => p.category === 'Party Wear').length
    },
    {
      name: 'Elegant Spark',
      image: getOptimizedImageUrl('https://i.ibb.co/DD38dQ8Q/file-000000008b207207972a2996aa7d3be3.png', { width: 600 }),
      count: products.filter(p => p.category === 'Elegant Spark').length
    }
  ];

  const features = [
    {
      icon: Truck,
      title: 'Free Shipping',
      description: !shippingSettings.shippingEnabled
        ? 'Free shipping on all orders'
        : shippingSettings.freeShippingEnabled
        ? `On orders above ₹${shippingSettings.freeShippingThreshold}`
        : `Standard fee: ₹${shippingSettings.shippingCharge}`
    },
    {
      icon: Shield,
      title: 'Secure Payment',
      description: '100% secure transactions'
    },
    {
      icon: RefreshCw,
      title: 'Easy Returns',
      description: '3-4 days return policy'
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

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      toast.success('Thank you for subscribing! Check your email for your 10% off coupon code.', {
        position: 'bottom-right'
      });
      setNewsletterEmail('');
    }
  };

  const bestsellersContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const bestsellerCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  const marqueeFreeShippingText = !shippingSettings.shippingEnabled
    ? 'Free Shipping on all orders'
    : shippingSettings.freeShippingEnabled
    ? `Free Shipping on ₹${shippingSettings.freeShippingThreshold}+`
    : `Flat Shipping ₹${shippingSettings.shippingCharge}`;
  const marqueeText = `⭐ 4.6/5 Rating  |  2,000+ Happy Customers  |  ${marqueeFreeShippingText}  |  easy 3 -4 days return  |  handcrafted in korea  |  `;

  // Section Renderers
  const renderHeroSection = (sec) => {
    const slides = sec.slides || [];
    if (slides.length === 0) return null;
    return (
      <section className="relative h-[65vh] sm:h-[75vh] md:h-[85vh] lg:h-[90vh] w-full overflow-hidden bg-luxury-900 flex items-center justify-start">
        {/* Background Slideshow */}
        <div className="absolute inset-0 z-0">
          {slides.map((slide, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: index === currentHeroImageIndex % slides.length ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <OptimizedImage
                src={getOptimizedImageUrl(slide.image, { width: 1920, quality: 90 })}
                alt={slide.title || `Featured Necklace ${index + 1}`}
                priority={index === 0}
                className="absolute inset-0 w-full h-full"
                imgClassName="object-cover object-right"
              />
            </motion.div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-luxury-900/90 via-luxury-900/50 to-transparent z-10" />
        </div>
        
        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
          {slides.map((slide, index) => {
            if (index !== currentHeroImageIndex % slides.length) return null;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-xl text-left"
              >
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight break-words">
                  {slide.title}
                </h1>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-luxury-100 max-w-md break-words">
                  {slide.subtitle}
                </p>
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {slide.ctaText && slide.ctaLink && (
                    <Link to={slide.ctaLink} className="btn-primary inline-flex items-center justify-center py-3 px-8 text-sm">
                      {slide.ctaText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    );
  };

  const seoStructuredData = [
    getWebSiteSchema(),
    getOrganizationSchema(),
    getSiteNavigationSchema()
  ];

  const renderFeaturesSection = (sec) => {
    const items = sec.items || [];
    return (
      <section className="py-8 bg-white shadow-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {items.map((item, index) => {
              const IconComponent = ICON_MAP[item.icon] || Sparkles;
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-gold-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-luxury-900 text-sm md:text-base">{item.title}</h4>
                    <p className="text-xs text-luxury-500">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const renderOffersSection = (sec) => {
    const items = sec.items || [];
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">{sec.title || "Today's Offers"}</h2>
              <p className="mt-3 text-luxury-600 text-sm md:text-base">{sec.description || "Quick deals for every budget and occasion"}</p>
            </div>
            <Link to="/products?sortBy=price-low" className="hidden sm:inline-flex btn-secondary items-center">
              View Deals
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          <div className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4">
            {items.map((offer, index) => {
              const IconComponent = ICON_MAP[offer.icon] || Sparkles;
              return (
                <motion.div
                  key={offer.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="h-full"
                >
                  <Link
                    to={offer.to || "/products"}
                    className={`group relative flex min-h-[8.5rem] sm:min-h-[9.5rem] overflow-hidden rounded-xl bg-gradient-to-br ${offer.tone || 'from-gold-500 to-gold-700'} p-4 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-5`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.34),transparent_38%)] opacity-80" />
                    <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <IconComponent className="h-6 w-6 shrink-0 drop-shadow sm:h-7 sm:w-7" />
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
              );
            })}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link to="/products?sortBy=price-low" className="btn-secondary inline-flex items-center justify-center">
              View Deals
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    );
  };

  const renderCollectionsGridSection = (sec) => {
    const list = sec.categories || [];
    return (
      <section className="py-16 bg-luxury-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">{sec.title || "Shop by Collection"}</h2>
            <p className="mt-4 text-luxury-600 text-sm md:text-base">{sec.description || "Find the perfect piece for every occasion"}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {list.filter(catName => {
              const count = products.filter(p => p.category === catName).length;
              if (hideEmptyCollections && count === 0) return false;
              return true;
            }).map((catName, index) => {
              const imgUrl = CATEGORY_IMAGE_MAP[catName] || 'https://i.ibb.co/4gRy3WYW/Use-AI-Image-May-19-2026-13-21-30.png';
              const count = products.filter(p => p.category === catName).length;
              return (
                <motion.div
                  key={catName}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="relative rounded-xl overflow-hidden h-40 sm:h-48 cursor-pointer group shadow-lg"
                >
                  <Link to={`/products?category=${encodeURIComponent(catName)}`} className="block w-full h-full">
                    <OptimizedImage
                      src={getOptimizedImageUrl(imgUrl, { width: 600 })}
                      alt={getCategoryLabel(catName)}
                      className="w-full h-full transform group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-300" />
                    
                    {/* Category count badge */}
                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-luxury-900 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">
                      {count} items
                    </span>

                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-center">
                      <h3 className="text-white font-serif text-lg md:text-xl font-bold tracking-wide transition-all group-hover:scale-105 duration-300">
                        {getCategoryLabel(catName)}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const renderBestsellersSection = (sec) => {
    const limit = sec.limit || 4;
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900 mb-2">{sec.title || "Our Bestsellers"}</h2>
              <p className="text-luxury-600 text-sm md:text-base">{sec.description || "Our most loved and reviewed jewelry pieces"}</p>
            </div>
            <Link to="/products" className="hidden md:inline-flex btn-secondary">
              View All
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden">
                  <div className="skeleton aspect-[3/4] bg-luxury-100 animate-shimmer bg-gradient-to-r from-luxury-100 via-luxury-50 to-luxury-100 bg-[length:200%_100%] h-72" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4 bg-luxury-200" />
                    <div className="skeleton h-4 w-1/2 bg-luxury-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div 
              variants={bestsellersContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {featuredProducts.slice(0, limit).map((product, index) => (
                <motion.div
                  key={product.id}
                  variants={bestsellerCardVariants}
                >
                  <ProductCard product={product} priority={index < 2} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="mt-8 text-center md:hidden w-full max-w-sm mx-auto">
            <Link to="/products" className="btn-secondary inline-flex items-center justify-center">
              View All
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    );
  };

  const renderReviewsSection = () => {
    return <ClientReviews key="reviews-carousel" />;
  };

  const renderFeedbackSection = () => {
    return (
      <section key="feedback-section" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CustomerFeedback />
        </div>
      </section>
    );
  };

  const renderBannerSection = (sec) => {
    const images = sec.images || collectionImages;
    return (
      <section className="py-16 bg-gradient-to-r from-gold-500 to-gold-600 relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-pattern opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">
                {sec.title || "Trending Collections"}
              </h2>
              <p className="mt-3 sm:mt-4 text-white/90 text-base sm:text-lg leading-relaxed break-words">
                {sec.description || "Get upto 25% off on our Premium collection."}
              </p>
              {sec.ctaText && sec.ctaLink && (
                <Link 
                  to={sec.ctaLink} 
                  className="mt-5 sm:mt-6 inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-gold-600 rounded-lg font-semibold hover:bg-luxury-50 transition-colors shadow-lg text-sm sm:text-base"
                >
                  {sec.ctaText}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              )}
            </div>
            
            <div className="flex items-center justify-center relative w-full aspect-[4/3] mt-6 md:mt-0">
              <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl bg-white">
                {images.map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: index === currentImageIndex % images.length ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                    <OptimizedImage
                      src={getOptimizedImageUrl(img, { width: 800, quality: 80 })}
                      alt={`Collection ${index + 1}`}
                      priority={index === 0}
                      className="absolute inset-0 w-full h-full"
                    />
                  </motion.div>
                ))}
                
                {/* Navigation Buttons */}
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gold-600 p-2 rounded-full transition-all z-10 shadow-lg border border-luxury-100/50"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gold-600 p-2 rounded-full transition-all z-10 shadow-lg border border-luxury-100/50"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {/* Dot Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/20 p-1.5 rounded-full backdrop-blur-sm">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex % images.length
                          ? 'bg-white w-6'
                          : 'bg-white/50 hover:bg-white'
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
    );
  };

  const renderNewsletterSection = (sec) => {
    return (
      <section className="bg-gold-50 py-16 text-center shadow-inner border-y border-luxury-100/40">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-luxury-900 leading-tight">
            {sec.title || "Get 10% Off Your First Order"}
          </h2>
          <p className="text-luxury-600 mt-3 mb-8 text-sm md:text-base">
            {sec.description || "Join the Panstellia family for exclusive drops and styling tips."}
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 input-field py-3 text-sm focus:ring-gold-500 focus:border-gold-500"
            />
            <button type="submit" className="btn-primary py-3 px-8 text-sm font-semibold tracking-wide">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    );
  };

  const renderSection = (sec) => {
    switch (sec.type) {
      case 'hero':
        return renderHeroSection(sec);
      case 'features':
        return renderFeaturesSection(sec);
      case 'offers':
        return renderOffersSection(sec);
      case 'collections_grid':
        return renderCollectionsGridSection(sec);
      case 'bestsellers':
        return renderBestsellersSection(sec);
      case 'reviews':
        return renderReviewsSection(sec);
      case 'feedback':
        return renderFeedbackSection(sec);
      case 'banner':
        return renderBannerSection(sec);
      case 'newsletter':
        return renderNewsletterSection(sec);
      default:
        return null;
    }
  };

  // If layout is loaded and has active sections, render them dynamically
  if (activeSections && activeSections.length > 0) {
    return (
      <div className="min-h-screen bg-luxury-50">
        <SEOHelmet 
          title="Panstellia | Luxury Necklace Jewelry Collections"
          description="Discover exquisite necklace jewelry collections from Panstellia. Premium Luxe Ring, Royal Braces, Elite Series, and Piercings pieces for weddings, parties, and everyday elegance."
          keywords="luxury necklaces, luxe ring necklaces, royal braces necklaces, elite series jewelry, piercing jewelry, handcrafted necklaces, jewelry store"
          canonical="https://panstellia.com"
          structuredData={getOrganizationSchema()}
          preloadImages={[heroImages[0]]}
        />
        
        {activeSections.map((sec) => (
          <div key={sec.id || sec.type}>
            {renderSection(sec)}
            {sec.type === 'hero' && (
              <div className="bg-luxury-900 text-gold-100 py-3 overflow-hidden border-y border-gold-500/20 relative z-20 shadow-md">
                <div className="flex whitespace-nowrap animate-marquee uppercase tracking-wider font-semibold text-xs md:text-sm">
                  <span className="inline-block px-4">{(layout.marqueeText || marqueeText) + (layout.marqueeText || marqueeText) + (layout.marqueeText || marqueeText)}</span>
                  <span className="inline-block px-4">{(layout.marqueeText || marqueeText) + (layout.marqueeText || marqueeText) + (layout.marqueeText || marqueeText)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Fallback to static layout
  return (
    <div className="min-h-screen bg-luxury-50">
      <SEOHelmet 
        title="Panstellia | Luxury Necklace Jewelry Collections"
        description="Discover exquisite necklace jewelry collections from Panstellia. Premium Luxe Ring, Royal Braces, Elite Series, and Piercings pieces for weddings, parties, and everyday elegance."
        keywords="luxury necklaces, luxe ring necklaces, royal braces necklaces, elite series jewelry, piercing jewelry, handcrafted necklaces, jewelry store"
        canonical="https://panstellia.com"
        structuredData={getOrganizationSchema()}
        preloadImages={[heroImages[0]]}
      />
      
      {/* Hero Section */}
      <section className="relative h-[65vh] sm:h-[75vh] md:h-[85vh] lg:h-[90vh] w-full overflow-hidden bg-luxury-900 flex items-center justify-start">
        {/* Background Slideshow */}
        <div className="absolute inset-0 z-0">
          {heroImages.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: index === currentHeroImageIndex ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <OptimizedImage
                src={img}
                alt={`Featured Necklace ${index + 1}`}
                priority={index === 0}
                className="absolute inset-0 w-full h-full"
                imgClassName="object-cover object-right"
              />
            </motion.div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-luxury-900/90 via-luxury-900/50 to-transparent z-10" />
        </div>
        
        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-xl text-left"
          >
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight">
              Wear Your Story
            </h1>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-luxury-100 max-w-md">
              Handcrafted luxury necklaces for every occasion
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/products" className="btn-primary inline-flex items-center justify-center py-3 px-8 text-sm">
                Shop Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link 
                to="/products?category=Lux%2520Wear" 
                className="border-2 border-white text-white py-3 px-6 rounded-lg font-semibold hover:bg-white hover:text-luxury-900 transition-colors duration-300 inline-flex items-center justify-center text-sm"
              >
                Explore Collections
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof Strip (Marquee) */}
      <div className="bg-luxury-900 text-gold-100 py-3 overflow-hidden border-y border-gold-500/20 relative z-20 shadow-md">
        <div className="flex whitespace-nowrap animate-marquee uppercase tracking-wider font-semibold text-xs md:text-sm">
          <span className="inline-block px-4">{marqueeText + marqueeText + marqueeText}</span>
          <span className="inline-block px-4">{marqueeText + marqueeText + marqueeText}</span>
        </div>
      </div>

      {/* Features Bar */}
      <section className="py-8 bg-white shadow-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-gold-600" />
                </div>
                <div>
                  <h4 className="font-medium text-luxury-900 text-sm md:text-base">{feature.title}</h4>
                  <p className="text-xs text-luxury-500">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Offers */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">Today&apos;s Offers</h2>
              <p className="mt-3 text-luxury-600 text-sm md:text-base">Quick deals for every budget and occasion</p>
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
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="h-full"
              >
                <Link
                  to={offer.to}
                  className={`group relative flex min-h-[8.5rem] sm:min-h-[9.5rem] overflow-hidden rounded-xl bg-gradient-to-br ${offer.tone} p-4 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-5`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.34),transparent_38%)] opacity-80" />
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

      {/* Shop by Collection Grid */}
      <section className="py-16 bg-luxury-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">Shop by Collection</h2>
            <p className="mt-4 text-luxury-600 text-sm md:text-base">Find the perfect piece for every occasion</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {categories.filter(c => hideEmptyCollections ? c.count > 0 : true).map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="relative rounded-xl overflow-hidden h-40 sm:h-48 cursor-pointer group shadow-lg"
              >
                <Link to={`/products?category=${category.name}`} className="block w-full h-full">
                  <OptimizedImage
                    src={category.image}
                    alt={getCategoryLabel(category.name)}
                    className="w-full h-full transform group-hover:scale-110 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-300" />
                  
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-luxury-900 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">
                    {category.count} items
                  </span>

                  <div className="absolute bottom-0 left-0 right-0 p-4 z-10 text-center">
                    <h3 className="text-white font-serif text-lg md:text-xl font-bold tracking-wide transition-all group-hover:scale-105 duration-300">
                      {getCategoryLabel(category.name)}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Bestsellers Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900 mb-2">Our Bestsellers</h2>
              <p className="text-luxury-600 text-sm md:text-base">Our most loved and reviewed jewelry pieces</p>
            </div>
            <Link to="/products" className="hidden md:inline-flex btn-secondary">
              View All
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden">
                  <div className="skeleton aspect-[3/4] bg-luxury-100 animate-shimmer bg-gradient-to-r from-luxury-100 via-luxury-50 to-luxury-100 bg-[length:200%_100%] h-72" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4 bg-luxury-200" />
                    <div className="skeleton h-4 w-1/2 bg-luxury-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div 
              variants={bestsellersContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {featuredProducts.slice(0, 4).map((product, index) => (
                <motion.div
                  key={product.id}
                  variants={bestsellerCardVariants}
                >
                  <ProductCard product={product} priority={index < 2} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="mt-8 text-center md:hidden w-full max-w-sm mx-auto">
            <Link to="/products" className="btn-secondary inline-flex items-center justify-center">
              View All
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Client Reviews Section */}
      <ClientReviews />

      {/* Customer Feedback Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CustomerFeedback />
        </div>
      </section>

      {/* Banner Section */}
      <section className="py-16 bg-gradient-to-r from-gold-500 to-gold-600 relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-pattern opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">
                Trending Collections
              </h2>
              <p className="mt-3 sm:mt-4 text-white/90 text-base sm:text-lg leading-relaxed break-words">
                Get upto 25% off on our Premium collection. Make your special day even more memorable with our exquisite designs.
              </p>
              <Link 
                to="/products?category=Lux%2520Wear" 
                className="mt-5 sm:mt-6 inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-gold-600 rounded-lg font-semibold hover:bg-luxury-50 transition-colors shadow-lg text-sm sm:text-base"
              >
                View Collection
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            
            <div className="flex items-center justify-center relative w-full aspect-[4/3] mt-6 md:mt-0">
              <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl bg-white">
                {collectionImages.map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                    <OptimizedImage
                      src={img}
                      alt={`Collection ${index + 1}`}
                      priority={index === 0}
                      className="absolute inset-0 w-full h-full"
                    />
                  </motion.div>
                ))}
                
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + collectionImages.length) % collectionImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gold-600 p-2 rounded-full transition-all z-10 shadow-lg border border-luxury-100/50"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % collectionImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gold-600 p-2 rounded-full transition-all z-10 shadow-lg border border-luxury-100/50"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/20 p-1.5 rounded-full backdrop-blur-sm">
                  {collectionImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-6'
                          : 'bg-white/50 hover:bg-white'
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

      {/* Newsletter Section */}
      <section className="bg-gold-50 py-16 text-center shadow-inner border-y border-luxury-100/40">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-luxury-900 leading-tight">
            Get 10% Off Your First Order
          </h2>
          <p className="text-luxury-600 mt-3 mb-8 text-sm md:text-base">
            Join the Panstellia family for exclusive drops and styling tips.
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 input-field py-3 text-sm focus:ring-gold-500 focus:border-gold-500"
            />
            <button type="submit" className="btn-primary py-3 px-8 text-sm font-semibold tracking-wide">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
