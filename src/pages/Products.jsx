import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Grid, List } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/UI/ProductCard';
import SEOHelmet from '../utils/seoHelmet';
import { getCategoryLabel, categoryLabelMap } from '../utils/categoryLabels';

const ProductsPage = () => {
  const getCanonicalCategoryKeyFromQuery = (queryCategory) => {
    if (!queryCategory || queryCategory === 'All') return 'All';
    if (Object.prototype.hasOwnProperty.call(categoryLabelMap, queryCategory)) return queryCategory;
    const entry = Object.entries(categoryLabelMap).find(([, displayLabel]) => displayLabel === queryCategory);
    return entry ? entry[0] : queryCategory;
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading } = useProducts();

  const visibleProducts = products.filter((p) => (p.productStatus || 'available') === 'available');

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const searchQuery = searchParams.get('search') || '';
  const categoryQuery = searchParams.get('category') || '';
  const minPriceQuery = searchParams.get('minPrice') || '';
  const maxPriceQuery = searchParams.get('maxPrice') || '';
  const sortByQuery = searchParams.get('sortBy') || 'newest';
  
  const [filters, setFilters] = useState({
    category: categoryQuery || 'All',
    minPrice: minPriceQuery,
    maxPrice: maxPriceQuery,
    sortBy: sortByQuery
  });

  const categories = ['All', 'Gold', 'Silver', 'Lux Wear', 'Party Wear', 'Elegant Spark'];
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Rating' }
  ];

  useEffect(() => {
    setFilters((current) => {
      const next = {
        category: categoryQuery || 'All',
        minPrice: minPriceQuery,
        maxPrice: maxPriceQuery,
        sortBy: sortByQuery
      };

      if (
        current.category === next.category &&
        current.minPrice === next.minPrice &&
        current.maxPrice === next.maxPrice &&
        current.sortBy === next.sortBy
      ) {
        return current;
      }

      return next;
    });
  }, [categoryQuery, minPriceQuery, maxPriceQuery, sortByQuery]);

  useEffect(() => {
    const search = searchQuery;
    const category = categoryQuery;

    let result = visibleProducts;
    if (search) {
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (p.category || '').toLowerCase().includes(search.toLowerCase())
      );
    } else if (category) {
      const canonicalCategory = getCanonicalCategoryKeyFromQuery(category);
      if (canonicalCategory && canonicalCategory !== 'All') {
        result = result.filter((p) => p.category === canonicalCategory);
      }
    }

    if (filters.minPrice) {
      result = result.filter((p) => p.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((p) => p.price <= Number(filters.maxPrice));
    }

    // Sort
    const sorted = [...result];
    switch (filters.sortBy) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
        break;
      case 'newest':
        sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      default:
        break;
    }
    result = sorted;

    setFilteredProducts(result);
  }, [products, filters, searchQuery, categoryQuery]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const params = {};
    if (newFilters.category !== 'All') params.category = newFilters.category;
    if (newFilters.minPrice) params.minPrice = newFilters.minPrice;
    if (newFilters.maxPrice) params.maxPrice = newFilters.maxPrice;
    if (newFilters.sortBy !== 'newest') params.sortBy = newFilters.sortBy;
    if (searchQuery) params.search = searchQuery;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      category: 'All',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest'
    });
    setSearchParams(searchQuery ? { search: searchQuery } : {});
  };

  const activeFiltersCount = [
    filters.category !== 'All',
    filters.minPrice !== '',
    filters.maxPrice !== ''
  ].filter(Boolean).length;

  // Stagger grid variants
  const gridContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const cardItemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' }
    }
  };

  const renderFilterControls = ({ onClose } = {}) => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-lg font-bold text-luxury-900">Filters</h2>
        <div className="flex items-center gap-3">
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-gold-600 hover:text-gold-700 font-bold uppercase tracking-wider"
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-luxury-50 text-luxury-500 hover:text-luxury-800 transition-colors"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Category (Pills format) */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => {
            const active = filters.category === category;
            return (
              <button 
                key={category}
                type="button"
                onClick={() => handleFilterChange('category', category)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active 
                    ? 'bg-gold-500 text-white border-gold-500 shadow-sm'
                    : 'bg-white text-luxury-700 border-luxury-200 hover:border-gold-400 hover:text-gold-600'
                }`}
              >
                {getCategoryLabel(category)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-xs focus:ring-1 focus:ring-gold-500 outline-none"
          />
          <span className="text-luxury-400 text-xs">-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-xs focus:ring-1 focus:ring-gold-500 outline-none"
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <h3 className="text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">Sort By</h3>
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-xs bg-white text-luxury-700 outline-none focus:ring-1 focus:ring-gold-500"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet 
        title={`${filters.category !== 'All' ? getCategoryLabel(filters.category) : 'All'} Necklaces | Panstellia`}
        description={`Browse our ${filters.category !== 'All' ? getCategoryLabel(filters.category).toLowerCase() : 'complete collection of'} necklace jewelry. Premium quality designs for every occasion.`}
        keywords={`${filters.category !== 'All' ? getCategoryLabel(filters.category).toLowerCase() + ' necklaces' : 'necklaces'}, jewelry, luxury jewelry`}
        canonical={`https://panstellia.com/products${filters.category !== 'All' ? `?category=${filters.category}` : ''}`}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-8">
        {/* Breadcrumb Trail */}
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-luxury-400 mb-6">
          <Link to="/" className="hover:text-gold-500 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-gold-500 transition-colors">Shop</Link>
          {filters.category !== 'All' && (
            <>
              <span>/</span>
              <span className="text-luxury-800">{getCategoryLabel(filters.category)}</span>
            </>
          )}
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900 leading-tight">
              {filters.category !== 'All' ? getCategoryLabel(filters.category) : 'All Products'}
            </h1>
            <p className="mt-2 text-xs text-luxury-500 font-medium">
              {filteredProducts.length} items found
            </p>
          </div>

          {/* View Toolbar Controls */}
          <div className="flex items-center justify-between md:justify-end gap-4">
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden flex items-center px-4 py-2 border border-luxury-200 bg-white rounded-lg shadow-sm text-xs font-semibold text-luxury-700"
            >
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1.5 w-4 h-4 bg-gold-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="flex items-center bg-white rounded-lg shadow-sm border border-luxury-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'text-gold-600 bg-luxury-50' : 'text-luxury-400'}`}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'text-gold-600 bg-luxury-50' : 'text-luxury-400'}`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md p-5 sticky top-24 border border-luxury-100">
              {renderFilterControls()}
            </div>
          </aside>

          {/* Mobile Filter Slide-in Drawer */}
          <AnimatePresence>
            {showFilters && (
              <div className="lg:hidden fixed inset-0 z-50">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFilters(false)}
                  className="fixed inset-0 bg-black/40"
                />

                {/* Left Side Drawer */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
                  className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
                >
                  <div>
                    {renderFilterControls({ onClose: () => setShowFilters(false) })}
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3 border-t border-luxury-100 pt-4">
                    <button
                      onClick={() => {
                        clearFilters();
                        setShowFilters(false);
                      }}
                      className="btn-secondary py-2 text-xs"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="btn-primary py-2 text-xs"
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Products Container */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
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
                <p className="text-luxury-600 font-medium">No products match your filter criteria.</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 btn-secondary py-2 px-6 text-xs"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <motion.div 
                variants={gridContainerVariants}
                initial="hidden"
                animate="visible"
                className={`grid gap-4 sm:gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    variants={cardItemVariants}
                    className="h-full"
                  >
                    <ProductCard product={product} priority={index < 4} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
