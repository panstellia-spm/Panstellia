import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle2,
  Clock, Package, Truck, MapPin, XCircle, RefreshCw,
  Download, ShoppingBag,
} from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection, getDocs, orderBy, query, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logActivity, LOG_ACTIONS, LOG_MODULES, LOG_STATUS, buildAdminInfo } from '../../services/activityLogger';
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

const STATUS_STEPS = ['picked', 'packed', 'shipped', 'out of delivery', 'delivered'];

const STATUS_CONFIG = {
  processing: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  picked: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Package },
  packed: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Package },
  shipped: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  'out of delivery': { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MapPin },
  delivered: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[(status || '').toLowerCase()] || { color: 'bg-luxury-100 text-luxury-600 border-luxury-200', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {status || 'Processing'}
    </span>
  );
}

function StatusPipeline({ currentStatus, onUpdate, orderId, disabled }) {
  const current = (currentStatus || '').toLowerCase();
  const currentIdx = STATUS_STEPS.indexOf(current);

  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      {STATUS_STEPS.map((step, i) => {
        const isDone = i <= currentIdx;
        const isCurrent = step === current;
        const isCancelled = current === 'cancelled';
        return (
          <button
            key={step}
            disabled={disabled || isCancelled || isCurrent || i < currentIdx}
            onClick={() => onUpdate(orderId, step)}
            className={`
              px-2.5 py-1 rounded-full text-xs font-medium border transition-all
              ${isCurrent ? 'border-gold-500 bg-gold-50 text-gold-700 cursor-default' :
                isDone ? 'border-green-300 bg-green-50 text-green-600 cursor-default' :
                isCancelled ? 'border-luxury-200 text-luxury-300 cursor-not-allowed opacity-40' :
                'border-luxury-200 text-luxury-500 hover:border-gold-400 hover:text-gold-600 hover:bg-gold-50'}
              disabled:opacity-50
            `}
          >
            {step}
          </button>
        );
      })}
    </div>
  );
}

function OrderRow({ order, onUpdateStatus, onCancel, onDelete, updatingOrder }) {
  const [expanded, setExpanded] = useState(false);
  const name = (order.customerName || order.name || order.fullName || '').toString();
  const phone = (order.phone || order.mobile || order.customerPhone || '').toString();
  const address = (() => {
    const a = order.address || order.shippingAddress || '';
    if (typeof a === 'object') {
      return [a.addressLine1, a.addressLine2, a.city, a.state].filter(Boolean).join(', ');
    }
    return a;
  })();
  const city = order.city || '';
  const pincode = (order.pincode || order.zip || '').toString();
  const date = safeToDate(order.createdAt);
  const status = (order.status || 'processing').toLowerCase();
  const canCancel = !['delivered', 'cancelled'].includes(status);

  return (
    <div className={`rounded-xl border transition-all ${status === 'cancelled' ? 'border-red-200 bg-red-50/20' : 'border-luxury-200 bg-white hover:border-luxury-300'}`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
          <div>
            <p className="text-xs font-bold text-luxury-900">#{order.id?.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-luxury-500">
              {date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-luxury-900 truncate">{name || '—'}</p>
            <p className="text-xs text-luxury-500 truncate">{phone || '—'}{city ? ` · ${city}` : ''}</p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <p className="text-sm font-bold text-luxury-900">{formatINR(order.total)}</p>
            <StatusBadge status={order.status || 'processing'} />
          </div>
        </div>
        <div className="flex-shrink-0 text-luxury-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-luxury-100 px-4 pb-4 pt-3 space-y-4">
          <div>
            <p className="text-xs font-semibold text-luxury-700 mb-1">Update Status</p>
            <StatusPipeline currentStatus={order.status} onUpdate={onUpdateStatus} orderId={order.id} disabled={updatingOrder === order.id} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-luxury-50 p-3 space-y-2">
              <p className="text-xs font-bold text-luxury-700">Customer Details</p>
              <dl className="space-y-1">
                {[['Name', name], ['Phone', phone], ['Email', order.email || order.customerEmail || '—'], ['Address', `${address || '—'} ${pincode ? `- ${pincode}` : ''}`]].map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <dt className="text-luxury-500 w-16 flex-shrink-0">{k}</dt>
                    <dd className="text-luxury-900 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-xl bg-luxury-50 p-3 space-y-2">
              <p className="text-xs font-bold text-luxury-700">Items ({order.items?.length || 0})</p>
              <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-hide">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-luxury-900 truncate flex-1">{item.name || 'Item'}</span>
                    <span className="text-luxury-500 flex-shrink-0">×{item.quantity || 1}</span>
                    <span className="text-luxury-900 font-medium flex-shrink-0">{formatINR(item.price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-luxury-200 pt-1 flex justify-between text-xs font-bold">
                <span>Total</span><span>{formatINR(order.total)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canCancel && (
              <button onClick={() => onCancel(order.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-luxury-200 text-luxury-700 hover:bg-luxury-50 transition-colors">
                Cancel Order
              </button>
            )}
            <button onClick={() => onDelete(order.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Search config ─────────────────────────────────────────────────────────────
const SEARCH_CONFIG = {
  searchFields: [
    { key: 'customerName', weight: 3 },
    { key: 'name', weight: 3 },
    { key: 'fullName', weight: 3 },
    { key: 'phone', weight: 2 },
    { key: 'mobile', weight: 2 },
    { key: 'id', weight: 2 },
    { key: 'city', weight: 1 },
    { key: 'email', weight: 2 },
  ],
  filters: [
    { key: 'status', type: 'exact' },
    { key: 'createdAt', type: 'datePreset' },
    { key: 'total', type: 'range', min: 0, max: 100000 },
  ],
  sorts: [
    { key: 'newest', label: 'Newest First', fn: (a, b) => safeToDate(b.createdAt) - safeToDate(a.createdAt) },
    { key: 'oldest', label: 'Oldest First', fn: (a, b) => safeToDate(a.createdAt) - safeToDate(b.createdAt) },
    { key: 'highest', label: 'Highest Value', fn: (a, b) => Number(b.total || 0) - Number(a.total || 0) },
    { key: 'lowest', label: 'Lowest Value', fn: (a, b) => Number(a.total || 0) - Number(b.total || 0) },
  ],
  defaultSort: 'newest',
};

export default function AdminOrders() {
  const { isAdmin, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const {
    results: filteredOrders,
    search, setSearch,
    filters, setFilter,
    sort, setSort,
    clearAll, activeFilterCount,
  } = useAdminSearch(orders, SEARCH_CONFIG);

  // Unique statuses for dropdown
  const allStatuses = useMemo(() => {
    const s = new Set(orders.map(o => o.status || 'processing'));
    return ['All', ...Array.from(s)];
  }, [orders]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
  }, [isAdmin]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, nextStatus) => {
    const order = orders.find(o => o.id === orderId);
    const prevStatus = order?.status || 'processing';
    setUpdatingOrder(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: nextStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      toast.success(`Order marked as "${nextStatus}"`);
      logActivity({ module: LOG_MODULES.ORDERS, action: LOG_ACTIONS.ORDER_STATUS_CHANGED, targetId: orderId, targetType: 'order', description: `Order #${orderId.slice(-8).toUpperCase()} status changed from "${prevStatus}" to "${nextStatus}"`, oldValue: prevStatus, newValue: nextStatus, status: LOG_STATUS.SUCCESS, adminInfo: buildAdminInfo(user) });
    } catch {
      toast.error('Failed to update status');
      logActivity({ module: LOG_MODULES.ORDERS, action: LOG_ACTIONS.FAILED_ACTION, targetId: orderId, targetType: 'order', description: `Failed to change order status to "${nextStatus}"`, status: LOG_STATUS.FAILED, adminInfo: buildAdminInfo(user) });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    setUpdatingOrder(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      toast.success('Order cancelled');
      logActivity({ module: LOG_MODULES.ORDERS, action: LOG_ACTIONS.ORDER_CANCELLED, targetId: orderId, targetType: 'order', description: `Order #${orderId.slice(-8).toUpperCase()} was cancelled`, newValue: 'cancelled', status: LOG_STATUS.SUCCESS, adminInfo: buildAdminInfo(user) });
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this order permanently?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Order deleted');
      logActivity({ module: LOG_MODULES.ORDERS, action: LOG_ACTIONS.ORDER_DELETED, targetId: orderId, targetType: 'order', description: `Order #${orderId.slice(-8).toUpperCase()} permanently deleted`, status: LOG_STATUS.SUCCESS, adminInfo: buildAdminInfo(user) });
    } catch {
      toast.error('Failed to delete order');
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ['Order ID', 'Date', 'Customer', 'Phone', 'City', 'Total', 'Status', 'Items'],
      ...filteredOrders.map(o => [
        o.id?.slice(-8).toUpperCase(),
        safeToDate(o.createdAt)?.toLocaleDateString('en-IN') || '—',
        o.customerName || o.name || '—',
        o.phone || o.mobile || '—',
        o.city || '—',
        o.total || 0,
        o.status || 'processing',
        (o.items || []).map(i => `${i.name}×${i.quantity}`).join('; '),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredOrders.length} orders`);
  };

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => !['delivered', 'cancelled'].includes((o.status || '').toLowerCase())).length,
    delivered: orders.filter(o => (o.status || '').toLowerCase() === 'delivered').length,
    cancelled: orders.filter(o => (o.status || '').toLowerCase() === 'cancelled').length,
  }), [orders]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900">Orders</h1>
          <p className="text-sm text-luxury-500 mt-0.5">Manage and fulfill customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-xl border border-luxury-200 text-luxury-500 hover:bg-luxury-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-luxury-900', bg: 'bg-luxury-50' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Delivered', value: stats.delivered, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Cancelled', value: stats.cancelled, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-luxury-100`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-luxury-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search by name, phone, order ID, city, email..."
        selects={[
          {
            key: 'status', label: 'All Statuses',
            options: allStatuses,
            value: filters.status || 'All',
            onChange: v => setFilter('status', v),
          },
          {
            key: 'createdAt', label: 'All Time',
            options: ['All', 'today', 'week', 'month'],
            value: filters.createdAt || 'all',
            onChange: v => setFilter('createdAt', v),
          },
        ]}
        sorts={SEARCH_CONFIG.sorts}
        currentSort={sort}
        onSort={setSort}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAll}
        resultCount={`${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''}`}
        ranges={[
          {
            key: 'total', label: 'Value (₹)',
            min: 0, max: 100000,
            value: filters.total,
            onChange: v => setFilter('total', v),
          },
        ]}
        actions={
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        }
      />

      {/* Order List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-luxury-200">
          <ShoppingBag className="w-10 h-10 text-luxury-300 mx-auto mb-3" />
          <p className="font-semibold text-luxury-700">No orders found</p>
          <p className="text-sm text-luxury-400 mt-1">Try adjusting your search or filters</p>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map(order => (
            <OrderRow key={order.id} order={order} onUpdateStatus={handleUpdateStatus} onCancel={handleCancel} onDelete={handleDelete} updatingOrder={updatingOrder} />
          ))}
        </div>
      )}
    </div>
  );
}
