import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, ShoppingBag, Package, TrendingUp, Clock,
  AlertTriangle, Star, Users, BarChart3, ArrowUp, ArrowDown,
  RefreshCw, ChevronRight, Zap, Target, ShoppingCart,
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, orderBy, query, limit, doc, updateDoc } from 'firebase/firestore';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatINR(v) {
  const num = Number(v || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatINRFull(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

function daysAgo(date) {
  if (!date) return '—';
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function hoursAgo(date) {
  if (!date) return '—';
  const diff = Math.floor((Date.now() - date.getTime()) / 3600000);
  if (diff < 1) return 'Just now';
  if (diff === 1) return '1h ago';
  return `${diff}h ago`;
}

function StatusBadge({ status }) {
  const map = {
    delivered: 'bg-green-100 text-green-700',
    shipped: 'bg-blue-100 text-blue-700',
    'out of delivery': 'bg-purple-100 text-purple-700',
    packed: 'bg-indigo-100 text-indigo-700',
    picked: 'bg-amber-100 text-amber-700',
    processing: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const cls = map[(status || '').toLowerCase()] || 'bg-luxury-100 text-luxury-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status || 'Unknown'}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, iconBg, iconColor, value, label, sub, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-luxury-900 leading-tight">{value}</p>
        <p className="text-sm text-luxury-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-luxury-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action, actionLabel }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-bold text-luxury-900">{title}</h2>
        {subtitle && <p className="text-xs text-luxury-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action}
          className="flex items-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors"
        >
          {actionLabel || 'View all'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Sparkline Chart ─────────────────────────────────────────────────────────

function Sparkline({ data, color = '#D97706' }) {
  if (!data || data.length < 2) return <div className="h-16 flex items-center justify-center text-xs text-luxury-400">No data</div>;
  const max = Math.max(...data, 1);
  const width = 200;
  const height = 56;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height * 0.9 - height * 0.05;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `0,${height} ${polyline} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { products } = useProducts();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [carts, setCarts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const STATUS_OPTIONS = ['picked', 'packed', 'shipped', 'out of delivery', 'delivered'];

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersSnap, paymentsSnap, cartsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(collection(db, 'carts')),
        getDocs(collection(db, 'users')),
      ]);

      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCarts(cartsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      toast.error('Some widgets could not load data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Computed metrics ──────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const paidPayments = payments.filter(p => (p.paymentStatus || '').toLowerCase() === 'paid');

    const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0) / 100;
    const todayRevenue = paidPayments.filter(p => {
      const d = safeToDate(p.createdAt);
      return d && d >= todayStart;
    }).reduce((s, p) => s + Number(p.amount || 0), 0) / 100;

    const monthRevenue = paidPayments.filter(p => {
      const d = safeToDate(p.createdAt);
      return d && d >= monthStart;
    }).reduce((s, p) => s + Number(p.amount || 0), 0) / 100;

    const prevMonthRevenue = paidPayments.filter(p => {
      const d = safeToDate(p.createdAt);
      return d && d >= prevMonthStart && d <= prevMonthEnd;
    }).reduce((s, p) => s + Number(p.amount || 0), 0) / 100;

    const monthTrend = prevMonthRevenue > 0
      ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : null;

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => !['delivered', 'cancelled'].includes((o.status || '').toLowerCase())).length;
    const todayOrders = orders.filter(o => {
      const d = safeToDate(o.createdAt);
      return d && d >= todayStart;
    }).length;

    const avgOrderValue = totalOrders > 0
      ? orders.reduce((s, o) => s + Number(o.total || 0), 0) / totalOrders
      : 0;

    const outOfStock = products.filter(p => !p.inStock || p.productStatus === 'unavailable').length;
    const featuredOOS = products.filter(p => p.featured && (!p.inStock || p.productStatus === 'unavailable')).length;

    // Revenue trend — last 7 days
    const revTrend = Array.from({ length: 7 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      return paidPayments
        .filter(p => { const d = safeToDate(p.createdAt); return d && d >= day && d < next; })
        .reduce((s, p) => s + Number(p.amount || 0), 0) / 100;
    });

    return { totalRevenue, todayRevenue, monthRevenue, monthTrend, totalOrders, pendingOrders, todayOrders, avgOrderValue, outOfStock, featuredOOS, revTrend };
  }, [orders, payments, products]);

  // ─── Fulfillment queue (actionable orders) ─────────────────────────────────
  const fulfillmentQueue = useMemo(() =>
    orders
      .filter(o => !['delivered', 'cancelled'].includes((o.status || '').toLowerCase()))
      .slice(0, 8)
      .map(o => ({
        ...o,
        daysPending: (() => {
          const d = safeToDate(o.createdAt);
          if (!d) return 0;
          return Math.floor((Date.now() - d.getTime()) / 86400000);
        })(),
      }))
      .sort((a, b) => b.daysPending - a.daysPending),
    [orders]
  );

  // ─── Out of stock products ─────────────────────────────────────────────────
  const inventoryRisk = useMemo(() =>
    products.filter(p => !p.inStock || p.productStatus === 'unavailable').slice(0, 6),
    [products]
  );

  // ─── Sales leaderboard (top products by order frequency) ──────────────────
  const salesLeaderboard = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!item?.name) return;
        const key = item.name;
        counts[key] = counts[key] || { name: key, units: 0, revenue: 0 };
        counts[key].units += Number(item.quantity || 1);
        counts[key].revenue += Number(item.price || 0) * Number(item.quantity || 1);
      });
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  // ─── Recent orders feed ────────────────────────────────────────────────────
  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  // ─── AOV ──────────────────────────────────────────────────────────────────
  const aov = useMemo(() => {
    const completed = orders.filter(o => (o.status || '').toLowerCase() === 'delivered');
    const avg = completed.length > 0
      ? completed.reduce((s, o) => s + Number(o.total || 0), 0) / completed.length
      : 0;
    return avg;
  }, [orders]);

  // ─── Customer geo distribution ─────────────────────────────────────────────
  const geoData = useMemo(() => {
    const cities = {};
    orders.forEach(o => {
      const city = (o.city || '').trim();
      if (!city) return;
      cities[city] = (cities[city] || 0) + 1;
    });
    return Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [orders]);

  // ─── Abandoned carts ───────────────────────────────────────────────────────
  const abandonedCarts = useMemo(() => {
    const orderUserIds = new Set(orders.map(o => o.userId).filter(Boolean));
    return carts
      .filter(c => {
        const items = c.items || [];
        const hasItems = items.length > 0;
        const notOrdered = !orderUserIds.has(c.id);
        return hasItems && notOrdered;
      })
      .map(c => ({
        ...c,
        cartValue: (c.items || []).reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0),
      }))
      .sort((a, b) => b.cartValue - a.cartValue)
      .slice(0, 5);
  }, [carts, orders]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    setUpdatingOrder(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: nextStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      toast.success(`Order marked as ${nextStatus}`);
    } catch (e) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100">
      <div className="skeleton h-11 w-11 rounded-xl mb-4" />
      <div className="skeleton h-6 w-24 rounded mb-2" />
      <div className="skeleton h-4 w-16 rounded" />
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="space-y-7 max-w-[1600px]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900">Dashboard</h1>
          <p className="text-sm text-luxury-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Widget 1: KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (<>
          <KPICard icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600"
            value={formatINR(metrics.totalRevenue)} label="Total Revenue" sub={`₹${metrics.todayRevenue.toFixed(0)} today`} />
          <KPICard icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600"
            value={formatINR(metrics.monthRevenue)} label="This Month" trend={metrics.monthTrend} />
          <KPICard icon={ShoppingBag} iconBg="bg-purple-50" iconColor="text-purple-600"
            value={metrics.totalOrders} label="Total Orders" sub={`${metrics.todayOrders} today`} />
          <KPICard icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600"
            value={metrics.pendingOrders} label="Pending Orders" sub="Need action" />
          <KPICard icon={Target} iconBg="bg-rose-50" iconColor="text-rose-600"
            value={formatINR(metrics.avgOrderValue)} label="Avg Order Value"
            sub={aov > 0 ? `Delivered avg: ${formatINR(aov)}` : undefined} />
        </>)}
      </div>

      {/* ── Row 2: Fulfillment Queue + Inventory Risk ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Widget 2: Fulfillment Action Queue */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <SectionHeader
            title="Fulfillment Queue"
            subtitle={`${fulfillmentQueue.length} orders need attention`}
            action={() => navigate('/admin/orders')}
          />
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
          ) : fulfillmentQueue.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <p className="font-medium text-luxury-700">All caught up!</p>
              <p className="text-sm text-luxury-400 mt-1">No pending orders to fulfill</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-hide">
              {fulfillmentQueue.map(order => (
                <div key={order.id} className={`rounded-xl border p-3 transition-all ${order.daysPending >= 3 ? 'border-red-200 bg-red-50/50' : 'border-luxury-200 hover:border-luxury-300 bg-luxury-50/30'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-luxury-900">#{order.id?.slice(-6).toUpperCase()}</span>
                        <StatusBadge status={order.status || 'processing'} />
                        {order.daysPending >= 3 && (
                          <span className="flex items-center gap-0.5 text-xs font-medium text-red-600">
                            <AlertTriangle className="w-3 h-3" /> {order.daysPending}d old
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-luxury-600 mt-0.5 truncate">
                        {order.customerName || order.name || 'Customer'} · {order.items?.length || 0} item(s) · {formatINRFull(order.total)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 flex-shrink-0">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          disabled={order.status === s || updatingOrder === order.id}
                          onClick={() => handleUpdateOrderStatus(order.id, s)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${order.status === s ? 'border-gold-400 bg-gold-50 text-gold-700 cursor-default' : 'border-luxury-200 text-luxury-600 hover:border-gold-400 hover:text-gold-700 hover:bg-gold-50'} disabled:opacity-50`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Widget 3: Inventory Risk Center */}
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <SectionHeader
            title="Inventory Risk"
            subtitle={`${metrics.outOfStock} items out of stock`}
            action={() => navigate('/admin/inventory')}
          />
          {metrics.featuredOOS > 0 && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {metrics.featuredOOS} featured product(s) are out of stock!
            </div>
          )}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
          ) : inventoryRisk.length === 0 ? (
            <div className="py-8 text-center text-sm text-luxury-400">All products in stock ✓</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-hide">
              {inventoryRisk.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-luxury-50 border border-luxury-100">
                  {p.image && (
                    <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0 bg-luxury-100" onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-luxury-900 truncate">{p.name}</p>
                    <p className="text-xs text-luxury-500">{p.category} {p.skuCode ? `· ${p.skuCode}` : ''}</p>
                  </div>
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">OOS</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Revenue Trend + Sales Leaderboard ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Widget 7: Sales Trend Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <SectionHeader title="Revenue Trend" subtitle="Last 7 days · paid orders" />
          <div className="mt-2">
            {loading ? (
              <div className="skeleton h-16 rounded-xl" />
            ) : (
              <>
                <Sparkline data={metrics.revTrend} color="#D97706" />
                <div className="flex justify-between mt-2">
                  {['6d', '5d', '4d', '3d', '2d', '1d', 'Today'].map((l, i) => (
                    <span key={i} className="text-[10px] text-luxury-400">{l}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-luxury-600">
                  <span>Peak: <strong className="text-luxury-900">{formatINR(Math.max(...metrics.revTrend))}</strong></span>
                  <span>Total: <strong className="text-luxury-900">{formatINR(metrics.revTrend.reduce((a, b) => a + b, 0))}</strong></span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Widget 4: Sales Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <SectionHeader title="Sales Leaderboard" subtitle="Top products by revenue" action={() => navigate('/admin/reports')} />
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
          ) : salesLeaderboard.length === 0 ? (
            <p className="text-sm text-luxury-400 py-4 text-center">No order data yet</p>
          ) : (
            <div className="space-y-2">
              {salesLeaderboard.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? 'bg-gold-100 text-gold-700' : 'bg-luxury-100 text-luxury-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-luxury-900 truncate">{item.name}</p>
                    <div className="mt-1 h-1 bg-luxury-100 rounded-full overflow-hidden">
                      <div
                        className="h-1 bg-gradient-to-r from-gold-400 to-gold-600 rounded-full"
                        style={{ width: `${(item.revenue / salesLeaderboard[0].revenue) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-luxury-900">{formatINR(item.revenue)}</p>
                    <p className="text-[10px] text-luxury-400">{item.units} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Recent Orders + Geo + AOV ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Widget 6: Recent Orders Activity Feed */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <SectionHeader title="Recent Orders" subtitle="Latest activity" action={() => navigate('/admin/orders')} />
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-hide">
              {recentOrders.map(order => {
                const date = safeToDate(order.createdAt);
                return (
                  <div key={order.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-luxury-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-luxury-100 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-3.5 h-3.5 text-luxury-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-luxury-900 truncate">
                        #{order.id?.slice(-6).toUpperCase()} · {order.customerName || order.name || 'Customer'}
                      </p>
                      <p className="text-xs text-luxury-500 truncate">
                        {order.items?.length || 0} item(s) · {formatINRFull(order.total)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={order.status || 'processing'} />
                      <span className="text-[10px] text-luxury-400">{hoursAgo(date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Widget 8 + 9: Geo + AOV stacked */}
        <div className="space-y-4">
          {/* Widget 8: Customer Geo */}
          <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
            <SectionHeader title="Top Cities" subtitle="By order volume" />
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-xl" />)}</div>
            ) : geoData.length === 0 ? (
              <p className="text-xs text-luxury-400 py-3 text-center">No location data in orders</p>
            ) : (
              <div className="space-y-2">
                {geoData.map(([city, count]) => (
                  <div key={city} className="flex items-center gap-2">
                    <span className="text-xs text-luxury-700 min-w-0 flex-1 truncate">{city}</span>
                    <div className="flex-1 max-w-16 h-1.5 bg-luxury-100 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-gold-400 rounded-full"
                        style={{ width: `${(count / geoData[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-luxury-900 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget 9: AOV Card */}
          <div className="bg-gradient-to-br from-gold-500 to-gold-700 rounded-2xl shadow-sm p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-gold-200" />
              <p className="text-xs font-semibold text-gold-100 uppercase tracking-wide">Average Order Value</p>
            </div>
            <p className="text-3xl font-bold">{loading ? '—' : formatINRFull(aov)}</p>
            <p className="text-xs text-gold-200 mt-1">Based on delivered orders</p>
          </div>
        </div>
      </div>

      {/* ── Row 5: Abandoned Carts ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
        <SectionHeader
          title="Abandoned Cart Recovery"
          subtitle={`${abandonedCarts.length} high-intent carts detected`}
        />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : abandonedCarts.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingCart className="w-8 h-8 text-luxury-300 mx-auto mb-2" />
            <p className="text-sm text-luxury-400">No abandoned carts detected</p>
            <p className="text-xs text-luxury-300 mt-1">Carts with no corresponding order will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {abandonedCarts.map(cart => (
              <div key={cart.id} className="p-3.5 rounded-xl border border-luxury-200 bg-amber-50/40 hover:border-amber-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-luxury-700 truncate max-w-32">
                    User: {cart.id?.slice(0, 8)}...
                  </span>
                  <span className="text-xs font-bold text-amber-700">{formatINRFull(cart.cartValue)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(cart.items || []).slice(0, 3).map((item, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white border border-luxury-200 rounded-full text-luxury-600 truncate max-w-24">
                      {item.name}
                    </span>
                  ))}
                  {(cart.items || []).length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-luxury-100 rounded-full text-luxury-500">
                      +{(cart.items || []).length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Widget 10: Admin Action Center ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
        <SectionHeader title="Action Center" subtitle="Items requiring your attention" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending Orders', value: metrics.pendingOrders, color: 'amber', icon: Clock, action: () => navigate('/admin/orders') },
            { label: 'Out of Stock', value: metrics.outOfStock, color: 'red', icon: AlertTriangle, action: () => navigate('/admin/inventory') },
            { label: 'Total Products', value: products.length, color: 'blue', icon: Package, action: () => navigate('/admin/products') },
            { label: 'Customers', value: users.length, color: 'purple', icon: Users, action: () => navigate('/admin/customers') },
          ].map(item => (
            <button key={item.label} onClick={item.action} className={`p-4 rounded-xl border text-left transition-all hover:shadow-sm
              ${item.value > 0 && (item.label === 'Pending Orders' || item.label === 'Out of Stock')
                ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                : 'border-luxury-200 bg-luxury-50/30 hover:border-luxury-300'
              }
            `}>
              <item.icon className={`w-5 h-5 mb-2 text-${item.color}-500`} />
              <p className="text-xl font-bold text-luxury-900">{loading ? '—' : item.value}</p>
              <p className="text-xs text-luxury-500 mt-0.5">{item.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
