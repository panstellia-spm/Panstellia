import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/UI/ProductCard';
import SEOHelmet from '../utils/seoHelmet';
import OptimizedImage from '../components/UI/OptimizedImage';
import { getOptimizedImageUrl } from '../utils/imageUtils';

const LandingPage = () => {
  const { slug } = useParams();
  const { products, loading: productsLoading } = useProducts();
  const [pageConfig, setPageConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    setLoadingConfig(true);
    const unsub = onSnapshot(doc(db, 'landing_pages', slug), (snap) => {
      if (snap.exists()) {
        setPageConfig({ id: snap.id, ...snap.data() });
      } else {
        setPageConfig(null);
      }
      setLoadingConfig(false);
    }, (error) => {
      console.error("Error loading landing page config:", error);
      setLoadingConfig(false);
    });
    return () => unsub();
  }, [slug]);

  const filteredProducts = useMemo(() => {
    if (!pageConfig || productsLoading) return [];
    
    return products.filter((p) => {
      // Basic availability check
      if ((p.productStatus || 'available') !== 'available') return false;

      // Filter by category if specified (can be a string or array)
      if (pageConfig.category) {
        if (Array.isArray(pageConfig.category)) {
          if (!pageConfig.category.includes(p.category)) return false;
        } else if (p.category !== pageConfig.category) {
          return false;
        }
      }

      // Filter by custom attribute rules
      if (pageConfig.filters) {
        for (const [key, allowedValues] of Object.entries(pageConfig.filters)) {
          if (allowedValues && allowedValues.length > 0) {
            const val = p[key] || 'None';
            const matches = allowedValues.some(
              (v) => String(val).toLowerCase() === String(v).toLowerCase()
            );
            if (!matches) return false;
          }
        }
      }

      // Filter by price range
      if (pageConfig.priceRange) {
        const price = Number(p.price) || 0;
        if (pageConfig.priceRange.min !== undefined && price < Number(pageConfig.priceRange.min)) return false;
        if (pageConfig.priceRange.max !== undefined && price > Number(pageConfig.priceRange.max)) return false;
      }

      return true;
    });
  }, [products, productsLoading, pageConfig]);

  if (loadingConfig) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-luxury-50">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!pageConfig || !pageConfig.enabled) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-luxury-50 text-center px-4">
        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-4">Page Not Found</h1>
        <p className="text-luxury-500 max-w-md mb-8">
          The promotional landing page you are looking for has expired or does not exist.
        </p>
        <Link to="/" className="btn-primary py-3 px-8 text-sm">
          Return Home
        </Link>
      </div>
    );
  }

  const bannerUrl = pageConfig.bannerImage 
    ? getOptimizedImageUrl(pageConfig.bannerImage, { width: 1920, quality: 90 })
    : null;

  return (
    <div className="min-h-screen bg-luxury-50 pb-16">
      <SEOHelmet
        title={pageConfig.seoTitle || `${pageConfig.title} | Panstellia`}
        description={pageConfig.seoDescription || pageConfig.subtitle}
        keywords={pageConfig.seoKeywords || "jewelry, luxury, promotion, panstellia"}
        canonical={`https://panstellia.com/c/${slug}`}
      />

      {/* Banner */}
      {bannerUrl ? (
        <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] w-full overflow-hidden bg-luxury-900 flex items-center justify-center">
          <OptimizedImage
            src={bannerUrl}
            alt={pageConfig.title}
            className="absolute inset-0 w-full h-full"
            imgClassName="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="relative z-20 text-center text-white px-4 max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl font-bold mb-3 tracking-wide drop-shadow-md">
              {pageConfig.title}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-luxury-100 font-medium drop-shadow-sm max-w-xl mx-auto leading-relaxed">
              {pageConfig.subtitle}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-luxury-900 text-center py-16 text-white border-b border-gold-500/20">
          <div className="max-w-3xl mx-auto px-4">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold mb-3 tracking-wide">
              {pageConfig.title}
            </h1>
            <p className="text-sm sm:text-base text-luxury-200">
              {pageConfig.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex justify-between items-center mb-8 border-b border-luxury-100 pb-4">
          <h2 className="font-serif text-2xl font-bold text-luxury-900">Featured Showcase</h2>
          <span className="text-xs text-luxury-500 font-medium">{filteredProducts.length} items found</span>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-luxury-100">
                <div className="skeleton aspect-[3/4] bg-luxury-100 animate-shimmer bg-gradient-to-r from-luxury-100 via-luxury-50 to-luxury-100 bg-[length:200%_100%] h-64" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-3 w-3/4 bg-luxury-200 rounded" />
                  <div className="skeleton h-3 w-1/2 bg-luxury-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-luxury-100">
            <p className="text-luxury-600 font-medium">No products currently match this collection.</p>
            <Link to="/products" className="mt-4 btn-secondary py-2 px-6 text-xs inline-block">
              Shop All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
