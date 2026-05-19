import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Grid, List } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/UI/ProductCard';
import SEOHelmet from '../utils/seoHelmet';
import { getCategoryLabel } from '../utils/categoryLabels';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading } = useProducts();

  const visibleProducts = products.filter((p) => (p.productStatus || 'available') === 'available');

  const [filteredProducts, setFilteredProducts] = useState([]);

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'All',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });

  const categories = ['All', 'Gold', 'Silver', 'Lux Wear', 'Party Wear', 'Elegant Spark'];
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Rating' }
  ];

  const searchQuery = searchParams.get('search') || '';
  const categoryQuery = searchParams.get('category') || '';

  useEffect(() => {
    const search = searchQuery;
    const category = categoryQuery;

    
    let result;
      const base = visibleProducts;
      if (search) {
        result = base.filter(
          (p) =>
            (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.category || '').toLowerCase().includes(search.toLowerCase())
        );
      } else if (category) {
        result = base;
        if (category && category !== 'All') {
          result = result.filter((p) => p.category === category);
        }

        result = result.filter((p) => {
          if (filters.minPrice) return p.price >= Number(filters.minPrice);
          return true;
        });

        result = result.filter((p) => {
          if (filters.maxPrice) return p.price <= Number(filters.maxPrice);
          return true;
        });

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
      } else {
        // Keep existing filterProducts behavior but scoped to visibleProducts
        result = base;
        if (filters.minPrice) {
          result = result.filter((p) => p.price >= Number(filters.minPrice));
        }
        if (filters.maxPrice) {
          result = result.filter((p) => p.price <= Number(filters.maxPrice));
        }

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
      }

    
    setFilteredProducts(result);
  }, [products, filters, searchQuery, categoryQuery]);



  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    if (key === 'category' && value !== 'All') {
      setSearchParams({ category: value });
    } else if (key === 'category') {
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    setFilters({
      category: 'All',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest'
    });
    setSearchParams({});
  };

  const activeFiltersCount = [
    filters.category !== 'All',
    filters.minPrice,
    filters.maxPrice
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet 
        title={`${filters.category !== 'All' ? getCategoryLabel(filters.category) : 'All'} Necklaces | Panstellia`}
        description={`Browse our ${filters.category !== 'All' ? getCategoryLabel(filters.category).toLowerCase() : 'complete collection of'} necklace jewelry. Premium quality designs for every occasion.`}
        keywords={`${filters.category !== 'All' ? getCategoryLabel(filters.category).toLowerCase() + ' necklaces' : 'necklaces'}, jewelry, luxury jewelry`}
        canonical={`https://panstellia.com/products${filters.category !== 'All' ? `?category=${filters.category}` : ''}`}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-luxury-900">
            {filters.category !== 'All' ? getCategoryLabel(filters.category) : 'All Products'}
          </h1>
          <p className="mt-2 text-luxury-600">
            {filteredProducts.length} products found
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-luxury-900">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gold-600 hover:text-gold-700"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-luxury-700 mb-2">Category</h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        checked={filters.category === category}
                        onChange={() => handleFilterChange('category', category)}
                        className="w-4 h-4 text-gold-600 border-luxury-300 focus:ring-gold-500"
                      />
                      <span className="ml-2 text-sm text-luxury-600">{getCategoryLabel(category)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-luxury-700 mb-2">Price Range</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm"
                  />
                  <span className="text-luxury-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-medium text-luxury-700 mb-2">Sort By</h3>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center px-4 py-2 bg-white rounded-lg shadow text-luxury-700"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 w-5 h-5 bg-gold-500 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-4">
                {/* Mobile Filters - Show on mobile */}
                {showFilters && (
                  <div className="lg:hidden fixed inset-0 z-50 bg-white p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-luxury-900">Filters</h2>
                      <button onClick={() => setShowFilters(false)}>
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    {/* Add filter UI here */}
                  </div>
                )}

                <div className="hidden md:flex items-center bg-white rounded-lg shadow">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'text-gold-600' : 'text-luxury-400'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'text-gold-600' : 'text-luxury-400'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Filters Overlay */}
            {showFilters && (
              <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowFilters(false)} />
            )}

            {/* Products */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl overflow-hidden">
                    <div className="skeleton aspect-[3/4]"></div>
                    <div className="p-4 space-y-2">
                      <div className="skeleton h-4 w-3/4"></div>
                      <div className="skeleton h-4 w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-luxury-600 text-lg">No products found</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 md:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
