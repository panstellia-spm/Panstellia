import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Warehouse, Package, XCircle, Star } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { getDirectImageUrl } from '../../utils/imageUtils';
import { useNavigate } from 'react-router-dom';
import { useAdminSearch } from '../../hooks/useAdminSearch';
import FilterBar from '../../components/admin/FilterBar';

function StatCard({ icon: Icon, iconBg, iconColor, value, label, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-luxury-900">{value}</p>
      <p className="text-sm text-luxury-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-luxury-400 mt-1">{sub}</p>}
    </div>
  );
}

const SEARCH_CONFIG = {
  searchFields: [
    { key: 'name', weight: 4 },
    { key: 'skuCode', weight: 3 },
    { key: 'category', weight: 2 },
  ],
  filters: [
    { key: 'category', type: 'exact' },
  ],
  sorts: [
    { key: 'name_asc', label: 'Name (A-Z)', fn: (a, b) => (a.name || '').localeCompare(b.name || '') },
    { key: 'name_desc', label: 'Name (Z-A)', fn: (b, a) => (b.name || '').localeCompare(a.name || '') },
    { key: 'price_asc', label: 'Price (Low to High)', fn: (a, b) => Number(a.price || 0) - Number(b.price || 0) },
    { key: 'price_desc', label: 'Price (High to Low)', fn: (a, b) => Number(b.price || 0) - Number(a.price || 0) },
  ],
  defaultSort: 'name_asc',
};

export default function AdminInventory() {
  const { products } = useProducts();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Out of stock & coming soon lists
  const outOfStockRaw = useMemo(() => products.filter(p => !p.inStock || p.productStatus === 'unavailable'), [products]);
  const comingSoon = useMemo(() => products.filter(p => p.productStatus === 'coming_soon'), [products]);
  const inStock = useMemo(() => products.filter(p => p.inStock && p.productStatus !== 'unavailable' && p.productStatus !== 'coming_soon'), [products]);
  const featuredOOS = useMemo(() => outOfStockRaw.filter(p => p.featured), [outOfStockRaw]);

  // Dynamic list of categories for the OOS dropdown filter
  const oosCategories = useMemo(() => {
    const s = new Set(outOfStockRaw.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(s)];
  }, [outOfStockRaw]);

  // Integrated search & filter for Out of Stock list
  const {
    results: filteredOOS,
    search,
    setSearch,
    filters,
    setFilter,
    sort,
    setSort,
    clearAll,
    activeFilterCount,
  } = useAdminSearch(outOfStockRaw, SEARCH_CONFIG);

  const categoryBreakdown = useMemo(() => {
    const cats = {};
    products.forEach(p => {
      const cat = p.category || 'Other';
      if (!cats[cat]) cats[cat] = { total: 0, inStock: 0 };
      cats[cat].total++;
      if (p.inStock && p.productStatus !== 'unavailable') cats[cat].inStock++;
    });
    return Object.entries(cats).sort((a, b) => b[1].total - a[1].total);
  }, [products]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold text-luxury-900">Inventory</h1>
        <p className="text-sm text-luxury-500 mt-0.5">Monitor stock levels and product availability</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} iconBg="bg-luxury-100" iconColor="text-luxury-600"
          value={products.length} label="Total Products" sub="in catalog" />
        <StatCard icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600"
          value={inStock.length} label="In Stock" sub={`${Math.round((inStock.length / (products.length || 1)) * 100)}% of catalog`} />
        <StatCard icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600"
          value={outOfStockRaw.length} label="Out of Stock" />
        <StatCard icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600"
          value={comingSoon.length} label="Coming Soon" />
      </div>

      {/* Critical Alert */}
      {featuredOOS.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Critical: Featured products are out of stock</p>
            <p className="text-xs text-red-600 mt-0.5">
              {featuredOOS.map(p => p.name).join(', ')} — these products appear on the homepage but are unavailable.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Out of Stock Products */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-luxury-900">Out of Stock Products</h2>
              <p className="text-xs text-luxury-500 mt-0.5">{outOfStockRaw.length} products need restocking</p>
            </div>
            <button
              onClick={() => navigate('/admin/products')}
              className="text-xs font-medium text-gold-600 hover:text-gold-700 font-semibold"
            >
              Manage Products →
            </button>
          </div>

          {/* OOS Filter Bar */}
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Search out-of-stock..."
            selects={[
              {
                key: 'category',
                label: 'All Categories',
                options: oosCategories,
                value: filters.category,
                onChange: (val) => setFilter('category', val),
              }
            ]}
            sorts={SEARCH_CONFIG.sorts}
            currentSort={sort}
            onSort={setSort}
            activeFilterCount={activeFilterCount}
            onClearAll={clearAll}
            resultCount={`${filteredOOS.length} products`}
          />

          {filteredOOS.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-luxury-200 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-luxury-700">No out of stock products match filters</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[30rem] overflow-y-auto scrollbar-hide pr-1">
              {filteredOOS.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/30 hover:bg-red-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-luxury-100 flex-shrink-0">
                    {p.image && <img src={getDirectImageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-luxury-900 truncate">{p.name}</p>
                      {p.featured && <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-luxury-500">{getCategoryLabel(p.category)}{p.skuCode ? ` · SKU: ${p.skuCode}` : ''}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-luxury-900">₹{(p.price || 0).toLocaleString()}</p>
                    <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <h2 className="text-base font-bold text-luxury-900 mb-1">Category Breakdown</h2>
          <p className="text-xs text-luxury-500 mb-4">Stock availability by collection</p>
          <div className="space-y-4">
            {categoryBreakdown.map(([cat, data]) => {
              const pct = data.total > 0 ? Math.round((data.inStock / data.total) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-luxury-800">{getCategoryLabel(cat)}</p>
                    <p className="text-xs text-luxury-500">{data.inStock}/{data.total} in stock</p>
                  </div>
                  <div className="h-2 bg-luxury-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-luxury-400 mt-0.5 text-right">{pct}% available</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      {comingSoon.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <h2 className="text-base font-bold text-luxury-900 mb-4">Coming Soon Products ({comingSoon.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {comingSoon.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-luxury-100 flex-shrink-0">
                  {p.image && <img src={getDirectImageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-luxury-900 truncate">{p.name}</p>
                  <p className="text-xs text-blue-600">Coming Soon</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
