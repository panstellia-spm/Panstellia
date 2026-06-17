import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import SEOHelmet from '../utils/seoHelmet';
import { StatusBadge, MiniProgressBar } from '../components/UI/OrderTimeline';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function safeToDate(value) {
  try {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatDate(value) {
  const d = safeToDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER STATUS OPTIONS
// Keys match EXACTLY what the Admin panel writes to Firestore.
// Labels are user-friendly display names.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Orders' },
  { value: 'processing', label: 'Order Placed' },
  { value: 'picked', label: 'Picked' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out of delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS PAGE
// ─────────────────────────────────────────────────────────────────────────────

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    month: 'All',
  });

  const resetFilters = () =>
    setFilters({ search: '', status: 'All', month: 'All' });

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'All' ||
    filters.month !== 'All';

  // ── Fetch orders from Firestore ───────────────────────────────────────────
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
        // Do not fall back to mock data — show empty state instead
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // ── Filter logic ─────────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    const needle = filters.search
      ? filters.search.toString().toLowerCase()
      : '';
    const selectedMonth = filters.month;

    return orders.filter((o) => {
      // Status filter — compare lowercase to handle any casing inconsistencies
      if (
        filters.status !== 'All' &&
        (o.status || '').toLowerCase().trim() !==
          filters.status.toLowerCase().trim()
      ) {
        return false;
      }

      // Month filter
      const d = safeToDate(o.createdAt);
      if (selectedMonth !== 'All') {
        if (!d) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}`;
        if (key !== selectedMonth) return false;
      }

      // Text search
      if (needle) {
        const hay = [
          o.id,
          o.status,
          o.paymentMethod,
          o.customerName,
          o.name,
          o.fullName,
          o.phone,
          o.mobile,
          o.customerPhone,
          o.email,
          o.customerEmail,
          ...(o.items || []).map((it) => it?.name).filter(Boolean),
        ]
          .join(' ')
          .toLowerCase();

        if (!hay.includes(needle)) return false;
      }

      return true;
    });
  }, [orders, filters]);

  // ─────────────────────────────────────────────────────────────────────────
  // Not logged in
  // ─────────────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <Package className="w-16 h-16 text-luxury-300 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-luxury-900">
            Please login to view your orders
          </h2>
          <p className="mt-2 text-luxury-600">
            Sign in to see your order history and track your deliveries.
          </p>
          <Link to="/login" className="mt-6 btn-primary inline-flex">
            Login
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet
        title="My Orders | Panstellia"
        description="View and track your jewelry orders from Panstellia. Check order status and delivery information."
        keywords="my orders, order history, order tracking"
        canonical="https://panstellia.com/orders"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-luxury-900">
            My Orders
          </h1>
          <p className="mt-1 text-luxury-500 text-sm">
            Track and manage all your Panstellia orders
          </p>
        </div>

        {/* ── Loading skeleton ────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md p-6">
                  <div className="skeleton h-5 w-32 mb-4 rounded" />
                  <div className="flex gap-4">
                    <div className="skeleton w-16 h-16 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4 rounded" />
                      <div className="skeleton h-4 w-1/4 rounded" />
                    </div>
                  </div>
                  <div className="skeleton h-6 w-full rounded-lg mt-4" />
                </div>
              ))}
          </div>
        ) : orders.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-luxury-100 mb-6">
              <Package className="w-12 h-12 text-luxury-400" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-luxury-900">
              No orders yet
            </h2>
            <p className="mt-2 text-luxury-600">
              Once you place an order, it will appear here.
            </p>
            <Link to="/products" className="mt-6 btn-primary inline-flex">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Filters ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-4 h-4 text-luxury-500" />
                <span className="text-sm font-semibold text-luxury-700">
                  Filter Orders
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="ml-auto flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 font-medium transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear filters
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {/* Search */}
                <div className="flex-1">
                  <input
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, search: e.target.value }))
                    }
                    placeholder="Search by Order ID, item name…"
                    className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 placeholder:text-luxury-400"
                  />
                </div>

                {/* Status */}
                <div className="sm:w-48">
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, status: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    {STATUS_FILTER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div className="sm:w-40">
                  <select
                    value={filters.month}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, month: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="All">All Months</option>
                    {Array.from(
                      new Set(
                        orders
                          .map((o) => {
                            const d = safeToDate(o.createdAt);
                            if (!d) return null;
                            return `${d.getFullYear()}-${String(
                              d.getMonth() + 1
                            ).padStart(2, '0')}`;
                          })
                          .filter(Boolean)
                      )
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-3 text-xs text-luxury-500">
                Showing{' '}
                <span className="font-semibold text-luxury-800">
                  {filteredOrders.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-luxury-800">
                  {orders.length}
                </span>{' '}
                orders
              </p>
            </div>

            {/* ── No results ───────────────────────────────────────────── */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                <Package className="w-12 h-12 text-luxury-300 mx-auto" />
                <h2 className="mt-4 font-serif text-xl font-bold text-luxury-900">
                  No matching orders
                </h2>
                <p className="mt-2 text-luxury-600 text-sm">
                  Try adjusting your search or filters.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-5 btn-primary inline-flex"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              /* ── Order cards ─────────────────────────────────────────── */
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
                  >
                    {/* Thin gold accent bar */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-300" />

                    <div className="p-5">
                      {/* Card header: Order ID + date on left, badge on right */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs text-luxury-500 font-semibold uppercase tracking-wide">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-luxury-400 mt-0.5">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        {/*
                          StatusBadge reads the raw Firestore status and maps
                          to a colour. No transformation on this side.
                        */}
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Items preview (max 2) */}
                      <div className="space-y-3">
                        {(order.items || []).slice(0, 2).map((item, index) => (
                          <div key={index} className="flex gap-3">
                            <img
                              src={getOptimizedImageUrl(item.image, {
                                width: 200,
                                quality: 70,
                              })}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-xl border border-luxury-100 group-hover:scale-105 transition-transform duration-300 shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-luxury-900 text-sm leading-snug truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-luxury-500 mt-0.5">
                                Qty: {item.quantity}
                              </p>
                              <p className="text-sm font-bold text-luxury-900 mt-0.5">
                                ₹{Number(item.price || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}

                        {(order.items || []).length > 2 && (
                          <p className="text-xs text-luxury-400 pl-1">
                            +{order.items.length - 2} more item
                            {order.items.length - 2 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/*
                        MiniProgressBar reads the same raw Firestore status.
                        It will show the correct step highlighted green.
                      */}
                      <MiniProgressBar status={order.status} />

                      {/* Footer: total + view details link */}
                      <div className="mt-4 pt-4 border-t border-luxury-100 flex items-center justify-between">
                        <div className="font-bold text-luxury-900 text-base">
                          ₹{Number(order.total || 0).toLocaleString()}
                        </div>
                        <Link
                          to={`/order/${order.id}`}
                          className="inline-flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700 font-semibold transition-colors duration-200 group/link"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
