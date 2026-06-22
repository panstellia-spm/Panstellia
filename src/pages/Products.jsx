import { useState, useEffect, useMemo } from 'react';
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

  const visibleProducts = useMemo(() => {
    return products.filter((p) => (p.productStatus || 'available') === 'available');
  }, [products]);

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const searchQuery = searchParams.get('search') || '';
  const categoryQuery = searchParams.get('category') || '';
  const minPriceQuery = searchParams.get('minPrice') || '';
  const maxPriceQuery = searchParams.get('maxPrice') || '';
  const sortByQuery = searchParams.get('sortBy') || 'newest';

  // Filters state: category is an array (multi-select). Empty array means all categories
  const [filters, setFilters] = useState({
    category: categoryQuery ? categoryQuery.split(',') : [],
    minPrice: minPriceQuery || '',
    maxPrice: maxPriceQuery || '',
    sortBy: sortByQuery || 'newest',
    availability: {
      inStock: false,
      outOfStock: false,
      discounted: false
    },
    discountMin: '' // numeric threshold for discount filter (e.g., 10, 20)
  });

  // Derive categories dynamically from available products so counts can be shown
  const categories = useMemo(() => {
    const map = {};
    visibleProducts.forEach((p) => {
      const key = p.category || 'Uncategorized';
      map[key] = (map[key] || 0) + 1;
    });
    const list = Object.keys(map).sort();
    return ['All', ...list];
  }, [visibleProducts]);

  // Sort options expanded
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'best-selling', label: 'Best Selling' },
    { value: 'biggest-discount', label: 'Biggest Discount' },
    { value: 'trending', label: 'Trending' }
  ];

  // Category counts map for showing counts beside labels
  const categoryCounts = useMemo(() => {
    const map = {};
    visibleProducts.forEach((p) => {
      const key = p.category || 'Uncategorized';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [visibleProducts]);

  // Price bounds for slider
  const priceBounds = useMemo(() => {
    const prices = visibleProducts.map(p => Number(p.price) || 0);
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 1000;
    return { min, max };
  }, [visibleProducts]);

  // Sync URL query params into filters state
  useEffect(() => {
    setFilters((current) => {
      const nextCategory = categoryQuery ? categoryQuery.split(',') : [];
      const next = {
        ...current,
        category: nextCategory,
        minPrice: minPriceQuery || '',
        maxPrice: maxPriceQuery || '',
        sortBy: sortByQuery || 'newest'
      };

      // Simple shallow comparison
      if (
        JSON.stringify(current.category) === JSON.stringify(next.category) &&
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

    let result = visibleProducts;

    // Search by name or category
    if (search) {
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (p.category || '').toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category multi-select
    if (filters.category && filters.category.length > 0) {
      result = result.filter((p) => filters.category.includes(p.category));
    }

    // Price range
    if (filters.minPrice) {
      result = result.filter((p) => p.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((p) => p.price <= Number(filters.maxPrice));
    }

    // Availability filters (OR between selected availability types)
    const { availability } = filters;
    if (availability && (availability.inStock || availability.outOfStock || availability.discounted)) {
      result = result.filter((p) => {
        let ok = false;
        if (availability.inStock && p.inStock) ok = true;
        if (availability.outOfStock && !p.inStock) ok = true;
        if (availability.discounted && p.originalPrice && p.originalPrice > p.price) ok = true;
        return ok;
      });
    }

    // Discount threshold (single selection)
    if (filters.discountMin) {
      const minDisc = Number(filters.discountMin);
      result = result.filter((p) => {
        if (!p.originalPrice || p.originalPrice <= p.price) return false;
        const disc = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        return disc >= minDisc;
      });
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
      case 'best-selling':
        sorted.sort((a, b) => {
          const salesA = a.sales ?? ((a.reviews || 0) * 5 + (a.featured ? 20 : 0));
          const salesB = b.sales ?? ((b.reviews || 0) * 5 + (b.featured ? 20 : 0));
          return salesB - salesA;
        });
        break;
      case 'biggest-discount':
        sorted.sort((a, b) => {
          const da = a.originalPrice && a.originalPrice > a.price ? ((a.originalPrice - a.price) / a.originalPrice) : 0;
          const db = b.originalPrice && b.originalPrice > b.price ? ((b.originalPrice - b.price) / b.originalPrice) : 0;
          return db - da;
        });
        break;
      case 'trending':
        sorted.sort((a, b) => {
          const scoreA = a.trendingScore ?? ((a.featured ? 100 : 0) + (a.ratings || 4.5) * 10 + (a.reviews || 0));
          const scoreB = b.trendingScore ?? ((b.featured ? 100 : 0) + (b.ratings || 4.5) * 10 + (b.reviews || 0));
          return scoreB - scoreA;
        });
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    setFilteredProducts(sorted);
  }, [products, filters, searchQuery, visibleProducts]);

  const handleFilterChange = (key, value) => {
    // Support nested updates for availability and arrays for category
    let newFilters = { ...filters };
    if (key === 'availability') {
      newFilters = { ...filters, availability: { ...filters.availability, ...value } };
    } else if (key === 'category') {
      // value expected to be the new category array
      newFilters = { ...filters, category: Array.isArray(value) ? value : [] };
    } else {
      newFilters = { ...filters, [key]: value };
    }

    setFilters(newFilters);

    // Sync important filters to URL (category, price, sortBy, discount)
    const params = {};
    if (newFilters.category && newFilters.category.length > 0) params.category = newFilters.category.join(',');
    if (newFilters.minPrice) params.minPrice = String(newFilters.minPrice);
    if (newFilters.maxPrice) params.maxPrice = String(newFilters.maxPrice);
    if (newFilters.sortBy && newFilters.sortBy !== 'newest') params.sortBy = newFilters.sortBy;
    if (newFilters.discountMin) params.discountMin = String(newFilters.discountMin);
    if (searchQuery) params.search = searchQuery;

    setSearchParams(params, { replace: true, state: { preventScroll: true } });
  };

  const clearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams, { replace: true, state: { preventScroll: true } });
  };

  const clearFilters = () => {
    setFilters({
      category: [],
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest',
      availability: { inStock: false, outOfStock: false, discounted: false },
      discountMin: ''
    });
    setSearchParams(searchQuery ? { search: searchQuery } : {}, { replace: true, state: { preventScroll: true } });
  };

  const activeFiltersCount = [
    filters.category && filters.category.length > 0,
    filters.minPrice !== '' && filters.minPrice !== null,
    filters.maxPrice !== '' && filters.maxPrice !== null,
    filters.discountMin !== '' && filters.discountMin !== null,
    filters.availability && (filters.availability.inStock || filters.availability.outOfStock || filters.availability.discounted)
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

      {/* Quick Filters */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-luxury-800 uppercase tracking-wider mb-2">Quick Filters</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'trending', label: 'Trending', isActive: filters.sortBy === 'trending' },
            { key: 'new-arrivals', label: 'New Arrivals', isActive: filters.sortBy === 'newest' },
            { key: 'best-sellers', label: 'Best Sellers', isActive: filters.sortBy === 'best-selling' },
            { key: 'under-200', label: 'Under ₹200', isActive: filters.maxPrice === '200' && !filters.minPrice }
          ].map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => {
                if (q.isActive) {
                  // Toggle off
                  if (q.key === 'under-200') {
                    handleFilterChange('maxPrice', '');
                  } else {
                    handleFilterChange('sortBy', 'newest');
                  }
                } else {
                  // Toggle on
                  if (q.key === 'under-200') {
                    handleFilterChange('minPrice', '');
                    handleFilterChange('maxPrice', '200');
                  } else if (q.key === 'trending') {
                    handleFilterChange('sortBy', 'trending');
                  } else if (q.key === 'best-sellers') {
                    handleFilterChange('sortBy', 'best-selling');
                  } else if (q.key === 'new-arrivals') {
                    handleFilterChange('sortBy', 'newest');
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${q.isActive
                  ? 'bg-gold-500 text-white border-gold-500 shadow-sm'
                  : 'bg-white text-luxury-700 border-luxury-200 hover:border-gold-400 hover:text-gold-600'
                }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Multi-select with counts */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">Category</h3>
        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!filters.category || filters.category.length === 0}
              onChange={(e) => handleFilterChange('category', e.target.checked ? [] : [])}
              aria-label="Select all categories"
            />
            <span className="text-luxury-700 font-semibold">All</span>
          </label>

          {categories.filter(c => c !== 'All').map((category) => {
            const isActive = filters.category && filters.category.includes(category);
            return (
              <label key={category} className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border border-luxury-100 bg-white hover:shadow-sm transition-all">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => {
                      const next = new Set(filters.category || []);
                      if (e.target.checked) next.add(category); else next.delete(category);
                      handleFilterChange('category', Array.from(next));
                    }}
                    aria-label={`Filter by ${getCategoryLabel(category)}`}
                  />
                  <span className="text-luxury-700">{getCategoryLabel(category)}</span>
                </div>
                <span className="text-luxury-400 text-xs">{categoryCounts[category] || 0}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Range Slider (dual) */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">Price Range</h3>
        <div className="px-2">
          <div className="flex items-center justify-between text-xs text-luxury-500 mb-2">
            <span>₹{filters.minPrice || priceBounds.min}</span>
            <span>₹{filters.maxPrice || priceBounds.max}</span>
          </div>

          <div className="relative h-8 flex items-center">
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={filters.minPrice || priceBounds.min}
              onChange={(e) => {
                const val = Number(e.target.value);
                const maxVal = Number(filters.maxPrice || priceBounds.max);
                if (val > maxVal) return;
                handleFilterChange('minPrice', String(val));
              }}
              className="dual-slider-input"
              style={{ zIndex: (filters.minPrice && Number(filters.minPrice) > (priceBounds.max - priceBounds.min) / 2) ? 25 : 20 }}
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={filters.maxPrice || priceBounds.max}
              onChange={(e) => {
                const val = Number(e.target.value);
                const minVal = Number(filters.minPrice || priceBounds.min);
                if (val < minVal) return;
                handleFilterChange('maxPrice', String(val));
              }}
              className="dual-slider-input"
              style={{ zIndex: (filters.maxPrice && Number(filters.maxPrice) <= (priceBounds.max - priceBounds.min) / 2) ? 25 : 20 }}
            />
            <div className="w-full h-1 bg-luxury-100 rounded-full" />
            <div
              className="absolute h-1 rounded-full"
              style={{
                left: `${((Number(filters.minPrice || priceBounds.min) - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%`,
                right: `${100 - ((Number(filters.maxPrice || priceBounds.max) - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%`,
                backgroundColor: 'rgba(212, 175, 55, 0.95)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">Availability</h3>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.availability?.inStock} onChange={(e) => handleFilterChange('availability', { inStock: e.target.checked })} />
            <span>In Stock</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.availability?.outOfStock} onChange={(e) => handleFilterChange('availability', { outOfStock: e.target.checked })} />
            <span>Out Of Stock</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.availability?.discounted} onChange={(e) => handleFilterChange('availability', { discounted: e.target.checked })} />
            <span>Discounted Products</span>
          </label>
        </div>
      </div>

      {/* Discount Filter */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">Discount</h3>
        <div className="flex flex-wrap gap-2">
          {[10, 20, 30, 50].map((d) => (
            <button
              key={d}
              onClick={() => handleFilterChange('discountMin', filters.discountMin === String(d) ? '' : String(d))}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filters.discountMin === String(d) ? 'bg-gold-500 text-white' : 'bg-white text-luxury-700 border-luxury-200 hover:border-gold-400'}`}>
              {d}%+ Off
            </button>
          ))}
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
        title={`${(filters.category && filters.category.length === 1) ? getCategoryLabel(filters.category[0]) : 'All'} Necklaces | Panstellia`}
        description={`Browse our ${(filters.category && filters.category.length === 1) ? getCategoryLabel(filters.category[0]).toLowerCase() : 'complete collection of'} necklace jewelry. Premium quality designs for every occasion.`}
        keywords={`${(filters.category && filters.category.length === 1) ? getCategoryLabel(filters.category[0]).toLowerCase() + ' necklaces' : 'necklaces'}, jewelry, luxury jewelry`}
        canonical={`https://panstellia.com/products${(filters.category && filters.category.length === 1) ? `?category=${filters.category[0]}` : ''}`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-8">
        {/* Breadcrumb Trail */}
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-luxury-400 mb-6">
          <Link to="/" className="hover:text-gold-500 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-gold-500 transition-colors">Shop</Link>
          {filters.category && filters.category.length === 1 && (
            <>
              <span>/</span>
              <span className="text-luxury-800">{getCategoryLabel(filters.category[0])}</span>
            </>
          )}
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900 leading-tight">
              {(filters.category && filters.category.length === 1) ? getCategoryLabel(filters.category[0]) : (filters.category && filters.category.length > 1 ? 'Filtered Products' : 'All Products')}
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
            {/* Active Filter Chips */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              {/* Search Chip */}
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>Search: &quot;{searchQuery}&quot;</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              )}

              {(filters.category || []).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    const next = (filters.category || []).filter(x => x !== c);
                    handleFilterChange('category', next);
                  }}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>{getCategoryLabel(c)}</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              ))}

              {/* Price Range Chips */}
              {filters.minPrice && filters.maxPrice ? (
                <button
                  onClick={() => {
                    handleFilterChange('minPrice', '');
                    handleFilterChange('maxPrice', '');
                  }}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>₹{filters.minPrice} - ₹{filters.maxPrice}</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              ) : filters.minPrice ? (
                <button
                  onClick={() => handleFilterChange('minPrice', '')}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>≥ ₹{filters.minPrice}</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              ) : filters.maxPrice ? (
                <button
                  onClick={() => handleFilterChange('maxPrice', '')}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>≤ ₹{filters.maxPrice}</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              ) : null}

              {filters.discountMin && (
                <button
                  onClick={() => handleFilterChange('discountMin', '')}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>{filters.discountMin}%+ Off</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              )}

              {filters.availability && filters.availability.inStock && (
                <button
                  onClick={() => handleFilterChange('availability', { inStock: false })}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>In Stock</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              )}

              {filters.availability && filters.availability.outOfStock && (
                <button
                  onClick={() => handleFilterChange('availability', { outOfStock: false })}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>Out of Stock</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              )}

              {filters.availability && filters.availability.discounted && (
                <button
                  onClick={() => handleFilterChange('availability', { discounted: false })}
                  className="px-3 py-1.5 bg-white border border-luxury-200 rounded-full text-xs font-semibold text-luxury-700 shadow-sm flex items-center gap-2 hover:border-gold-450 hover:text-gold-600 transition-colors"
                >
                  <span>Discounted</span>
                  <span className="text-luxury-400">✕</span>
                </button>
              )}
            </div>
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
                className={`grid gap-4 sm:gap-6 ${viewMode === 'grid'
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
