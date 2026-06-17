import { useState, useEffect, useMemo } from 'react';
import { Users, ShoppingBag, DollarSign, RefreshCw, User } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useAdminSearch } from '../../hooks/useAdminSearch';
import FilterBar from '../../components/admin/FilterBar';

function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatINR(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

const SEARCH_CONFIG = {
  searchFields: [
    { key: 'name', weight: 3 },
    { key: 'email', weight: 3 },
    { key: 'phone', weight: 2 },
  ],
  filters: [
    { key: 'tier', type: 'exact' },
    { key: 'createdAt', type: 'datePreset' },
  ],
  sorts: [
    { key: 'spend_desc', label: 'Highest Spend', fn: (a, b) => Number(b.totalSpend || 0) - Number(a.totalSpend || 0) },
    { key: 'spend_asc', label: 'Lowest Spend', fn: (a, b) => Number(a.totalSpend || 0) - Number(b.totalSpend || 0) },
    { key: 'orders_desc', label: 'Most Orders', fn: (a, b) => Number(b.orderCount || 0) - Number(a.orderCount || 0) },
    { key: 'joined_desc', label: 'Recently Joined', fn: (a, b) => safeToDate(b.createdAt) - safeToDate(a.createdAt) },
    { key: 'joined_asc', label: 'Oldest Joined', fn: (a, b) => safeToDate(a.createdAt) - safeToDate(b.createdAt) },
  ],
  defaultSort: 'spend_desc',
};

export default function AdminCustomers() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersSnap, ordersSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
      ]);
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const customersWithStats = useMemo(() => {
    return users.map(u => {
      const userOrders = orders.filter(o => o.userId === u.id || o.email === u.email);
      const totalSpend = userOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const lastOrder = userOrders.sort((a, b) => {
        const da = safeToDate(a.createdAt), db2 = safeToDate(b.createdAt);
        if (!da || !db2) return 0;
        return db2 - da;
      })[0];

      let tierLabel = 'Registered';
      if (totalSpend >= 50000) tierLabel = 'Platinum';
      else if (totalSpend >= 10000) tierLabel = 'Gold VIP';
      else if (userOrders.length > 0) tierLabel = 'Customer';

      return {
        ...u,
        orderCount: userOrders.length,
        totalSpend,
        lastOrderDate: lastOrder ? safeToDate(lastOrder.createdAt) : null,
        lastOrderStatus: lastOrder?.status,
        tier: tierLabel,
      };
    });
  }, [users, orders]);

  const {
    results: filteredCustomers,
    search,
    setSearch,
    filters,
    setFilter,
    sort,
    setSort,
    clearAll,
    activeFilterCount,
  } = useAdminSearch(customersWithStats, SEARCH_CONFIG);

  const stats = useMemo(() => ({
    total: users.length,
    withOrders: customersWithStats.filter(u => u.orderCount > 0).length,
    totalRevenue: customersWithStats.reduce((s, u) => s + u.totalSpend, 0),
    vip: customersWithStats.filter(u => u.totalSpend >= 10000).length,
  }), [customersWithStats, users]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900">Customers</h1>
          <p className="text-sm text-luxury-500 mt-0.5">{users.length} registered users</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl border border-luxury-200 text-luxury-500 hover:bg-luxury-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, bg: 'bg-luxury-50', color: 'text-luxury-600', value: stats.total, label: 'Total Customers' },
          { icon: ShoppingBag, bg: 'bg-blue-50', color: 'text-blue-600', value: stats.withOrders, label: 'Have Ordered' },
          { icon: DollarSign, bg: 'bg-green-50', color: 'text-green-600', value: formatINR(stats.totalRevenue), label: 'Total Customer Revenue' },
          { icon: User, bg: 'bg-gold-50', color: 'text-gold-600', value: stats.vip, label: 'VIP Customers (₹10k+)' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-luxury-900">{s.value}</p>
            <p className="text-xs text-luxury-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Reusable Filter Bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search customers by name, email, phone..."
        selects={[
          {
            key: 'tier',
            label: 'All Tiers',
            options: ['All', 'Platinum', 'Gold VIP', 'Customer', 'Registered'],
            value: filters.tier || 'All',
            onChange: (val) => setFilter('tier', val),
          },
          {
            key: 'createdAt',
            label: 'Join Date',
            options: ['all', 'today', 'week', 'month'],
            value: filters.createdAt || 'all',
            onChange: (val) => setFilter('createdAt', val),
          },
        ]}
        sorts={SEARCH_CONFIG.sorts}
        currentSort={sort}
        onSort={setSort}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAll}
        resultCount={`${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`}
      />

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-luxury-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-luxury-50 border-b border-luxury-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Total Spend</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Last Order</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="skeleton h-8 rounded-lg" /></td></tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Users className="w-8 h-8 text-luxury-300 mx-auto mb-2" />
                  <p className="text-sm text-luxury-400">No customers found</p>
                </td></tr>
              ) : filteredCustomers.map(u => {
                const joined = safeToDate(u.createdAt);
                const lastOrder = u.lastOrderDate;
                const tier = u.totalSpend >= 50000 ? { label: 'Platinum', cls: 'bg-purple-100 text-purple-700' }
                  : u.totalSpend >= 10000 ? { label: 'Gold VIP', cls: 'bg-gold-100 text-gold-700' }
                  : u.orderCount > 0 ? { label: 'Customer', cls: 'bg-green-100 text-green-700' }
                  : { label: 'Registered', cls: 'bg-luxury-100 text-luxury-600' };

                return (
                  <tr key={u.id} className="hover:bg-luxury-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-luxury-900">{u.name || '—'}</p>
                          <p className="text-xs text-luxury-400 truncate max-w-48">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-luxury-600">
                      {joined ? joined.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-luxury-900">{u.orderCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-luxury-900">{formatINR(u.totalSpend)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-luxury-600">
                      {lastOrder ? lastOrder.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      {u.lastOrderStatus && (
                        <span className="ml-1 text-[10px] text-luxury-400">({u.lastOrderStatus})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tier.cls}`}>{tier.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
