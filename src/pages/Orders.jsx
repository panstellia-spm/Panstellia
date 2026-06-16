import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import SEOHelmet from '../utils/seoHelmet';

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

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    month: 'All', // e.g. '2026-05'
  });

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'All',
      month: 'All',
    });
  };

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
        const ordersData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
        // Demo orders for display
        setOrders([
          {
            id: 'demo-order-1',
            items: [
              {
                name: 'Ethereal Gold Pendant Necklace',
                price: 15999,
                quantity: 1,
                image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200',
              },
            ],
            total: 16799,
            status: 'delivered',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'demo-order-2',
            items: [
              {
                name: 'Pearl Strand Choker',
                price: 4999,
                quantity: 2,
                image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200',
              },
            ],
            total: 10498,
            status: 'processing',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'badge-success';
      case 'cancelled':
        return 'badge-error';
      default:
        return 'badge-warning';
    }
  };

  const filteredOrders = useMemo(() => {
    const minTotal = filters.minTotal !== '' ? Number(filters.minTotal) : null;
    const maxTotal = filters.maxTotal !== '' ? Number(filters.maxTotal) : null;
    const needle = filters.search ? filters.search.toString().toLowerCase() : '';

    const selectedMonth = filters.month;

    return orders.filter((o) => {
      if (filters.status !== 'All' && (o.status || '') !== filters.status) return false;

      const d = safeToDate(o.createdAt);
      if (selectedMonth !== 'All') {
        if (!d) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== selectedMonth) return false;
      }

      const total = Number(o.total || 0);
      if (minTotal !== null && total < minTotal) return false;
      if (maxTotal !== null && total > maxTotal) return false;


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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <h2 className="font-serif text-2xl font-bold text-luxury-900">Please login to view your orders</h2>
          <Link to="/login" className="mt-4 btn-primary inline-flex">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet
        title="My Orders | Panstellia"
        description="View and track your jewelry orders from Panstellia. Check order status and delivery information."
        keywords="my orders, order history, order tracking"
        canonical="https://panstellia.com/orders"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8">My Orders</h1>

        {loading ? (
          <div className="space-y-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6">
                  <div className="skeleton h-6 w-32 mb-4" />
                  <div className="flex gap-4">
                    <div className="skeleton w-20 h-20 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-4 w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-luxury-300 mx-auto" />
            <h2 className="mt-4 font-serif text-xl font-bold text-luxury-900">No orders yet</h2>
            <p className="mt-2 text-luxury-600 text-luxury-600">Once you place an order, it will appear here.</p>
            <Link to="/products" className="mt-4 btn-primary inline-flex">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex-1">
                  <label className="block text-sm text-luxury-500 mb-1">Search</label>
                  <input
                    value={filters.search}
                    onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                    placeholder="Order ID, item name, status..."
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 flex-1">
                  <div>
                    <label className="block text-sm text-luxury-500 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-luxury-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      <option value="All">All</option>
                      {Array.from(new Set(orders.map((o) => o.status).filter(Boolean))).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-luxury-500 mb-1">Month</label>
                    <select
                      value={filters.month}
                      onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))}
                      className="w-full px-3 py-2 border border-luxury-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      <option value="All">All</option>
                      {Array.from(
                        new Set(
                          orders
                            .map((o) => {
                              const d = safeToDate(o.createdAt);
                              if (!d) return null;
                              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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


                  
                  <div className="flex items-end justify-end">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-lg border border-luxury-200 text-luxury-700 hover:bg-luxury-50 transition"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-luxury-500">
                Showing <span className="font-medium text-luxury-700">{filteredOrders.length}</span> orders
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-md p-6">
                <Package className="w-16 h-16 text-luxury-300 mx-auto" />
                <h2 className="mt-4 font-serif text-xl font-bold text-luxury-900">No matching orders</h2>
                <p className="mt-2 text-luxury-600">Try adjusting your filters.</p>
                <button onClick={resetFilters} className="mt-4 btn-primary inline-flex">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-luxury-500">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-luxury-500">
                          {order.createdAt?.toDate?.().toLocaleDateString() || new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`badge ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex gap-4">
                          <img
                            src={getOptimizedImageUrl(item.image, { width: 200, quality: 70 })}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-luxury-900">{item.name}</h3>
                            <p className="text-sm text-luxury-500">Qty: {item.quantity}</p>
                            <p className="font-semibold text-luxury-900">₹{item.price?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-luxury-200 flex items-center justify-between">
                      <div className="font-semibold text-luxury-900">Total: ₹{order.total?.toLocaleString()}</div>
                      <Link
                        to={`/order/${order.id}`}
                        className="text-gold-600 hover:text-gold-700 flex items-center"
                      >
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </Link>
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

