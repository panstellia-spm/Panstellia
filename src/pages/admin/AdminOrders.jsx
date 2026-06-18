/**
 * AdminOrders.jsx — Enterprise Order Management Console
 *
 * Features:
 * - Real-time Firestore listener (onSnapshot)
 * - Bulk status updates with selection
 * - Filter by status, priority, delay, high-value
 * - Links to AdminOrderDetail for each order
 * - Delay & high-value indicators
 * - Tracking number display
 * - Export to CSV
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, RefreshCw, Download, Trash2,
  AlertTriangle, Star, ChevronDown, ChevronRight,
  CheckSquare, Square, Zap, ExternalLink, X,
  Loader2, Package, ShoppingBag, Users2, TrendingUp,
} from 'lucide-react';
import { db } from '../../services/firebase';
import { doc, deleteDoc, runTransaction, collection, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logActivity, LOG_ACTIONS, LOG_MODULES, LOG_STATUS, buildAdminInfo } from '../../services/activityLogger';
import { subscribeToAllOrders, bulkUpdateStatus, exportOrdersCSV } from '../../services/orderTracking';
import {
  STATUS_PIPELINE, PRIORITY_CONFIG, normalizeStatus,
  detectDelay, isHighValueOrder, formatINR,
} from '../../services/orderStatus';
import { StatusBadge } from '../../components/UI/OrderTimeline';
import { useAdminSearch } from '../../hooks/useAdminSearch';
import FilterBar from '../../components/admin/FilterBar';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function timeAgo(date) {
  if (!date) return '—';
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELAY BADGE INLINE
// ─────────────────────────────────────────────────────────────────────────────

function SmallDelayBadge({ delay }) {
  if (!delay?.isDelayed) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
      delay.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
    }`}>
      <AlertTriangle className="w-2.5 h-2.5" />
      {delay.hours}h late
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK ACTION BAR
// ─────────────────────────────────────────────────────────────────────────────

function BulkActionBar({ selected, onClear, onBulkStatus, onBulkExport, loading }) {
  const [showMenu, setShowMenu] = useState(false);

  const statuses = [...STATUS_PIPELINE.map(s => s.key), 'cancelled'];

  return (
    <div className="flex items-center gap-2 bg-gold-50 border border-gold-200 rounded-xl px-4 py-2.5">
      <span className="text-sm font-bold text-gold-800">
        {selected.length} selected
      </span>
      <div className="h-4 w-px bg-gold-300 mx-1" />

      {/* Bulk Status Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Update Status
          <ChevronDown className="w-3 h-3" />
        </button>
        {showMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-luxury-100 z-20 min-w-40 py-1 overflow-hidden">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => { onBulkStatus(s); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-luxury-700 hover:bg-luxury-50 capitalize transition-colors"
              >
                → {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onBulkExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold-300 text-gold-700 text-xs font-bold hover:bg-gold-100 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>

      <button
        onClick={onClear}
        className="ml-auto p-1.5 rounded-lg text-gold-600 hover:bg-gold-100 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [delayFilter, setDelayFilter] = useState(false);
  const [highValueFilter, setHighValueFilter] = useState(false);

  // Expanded row state
  const [expandedId, setExpandedId] = useState(null);

  const { registerSource } = useAdminSearch?.() || {};

  if (!isAdmin) return null;

  // ── Real-time listener ───────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllOrders((data, err) => {
      setLoading(false);
      if (err) { toast.error('Failed to load orders'); return; }
      setOrders(data);
    });
    return unsub;
  }, []);

  // ── Register with global search ──────────────────────────────────────────

  useEffect(() => {
    if (!registerSource) return;
    registerSource?.('orders', orders.map(o => ({
      id: o.id,
      label: `Order #${o.id?.slice(-8).toUpperCase()} — ${o.customerName || o.name || 'Customer'}`,
      sub: `${o.status} · ${formatINR(o.total)}`,
      href: `/admin/orders/${o.id}`,
    })));
  }, [orders]);

  // ── Filtered orders ──────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    const needle = searchQuery.toLowerCase().trim();
    return orders.filter(o => {
      // Status filter
      if (statusFilter !== 'All' && normalizeStatus(o.status) !== statusFilter) return false;
      // Priority filter
      if (priorityFilter !== 'All' && (o.priority || 'normal') !== priorityFilter) return false;
      // Delay filter
      if (delayFilter && !detectDelay(o).isDelayed) return false;
      // High value filter
      if (highValueFilter && !isHighValueOrder(o)) return false;
      // Search
      if (needle) {
        const hay = [
          o.id, o.status, o.customerName, o.name, o.phone, o.mobile,
          o.email, o.city, o.trackingNumber, o.courierName,
          ...(o.items || []).map(i => i?.name),
        ].join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter, priorityFilter, delayFilter, highValueFilter]);

  // ── KPI counts ──────────────────────────────────────────────────────────

  const kpis = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => !['delivered', 'cancelled', 'refunded'].includes(normalizeStatus(o.status))).length,
    delayed: orders.filter(o => detectDelay(o).isDelayed).length,
    highValue: orders.filter(o => isHighValueOrder(o)).length,
  }), [orders]);

  // ── Selection handlers ───────────────────────────────────────────────────

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === filteredOrders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredOrders.map(o => o.id)));
    }
  }, [selected, filteredOrders]);

  // ── Bulk status update ───────────────────────────────────────────────────

  const handleBulkStatus = async (newStatus) => {
    if (!selected.size) return;
    setBulkLoading(true);
    try {
      await bulkUpdateStatus([...selected], newStatus, user);
      toast.success(`${selected.size} orders updated to "${newStatus}"`);
      setSelected(new Set());
    } catch (e) {
      toast.error('Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────

  const handleExport = () => {
    const toExport = selected.size > 0
      ? orders.filter(o => selected.has(o.id))
      : filteredOrders;
    exportOrdersCSV(toExport, 'panstellia-orders');
    toast.success(`Exported ${toExport.length} orders`);
    logActivity({
      module: LOG_MODULES.ORDERS,
      action: LOG_ACTIONS.REPORT_EXPORTED,
      description: `Exported ${toExport.length} orders to CSV`,
      status: LOG_STATUS.SUCCESS,
      adminInfo: buildAdminInfo(user),
    });
  };

  // ── Individual status update (legacy quick-set) ───────────────────────────

  const handleQuickStatus = async (orderId, newStatus) => {
    try {
      const { updateOrderStatus } = await import('../../services/orderTracking');
      await updateOrderStatus(orderId, newStatus, user);
      toast.success(`Order updated to "${newStatus}"`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  // ── Delete order ────────────────────────────────────────────────────────

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this order permanently? This cannot be undone.')) return;
    try {
      const orderSnap = await getDoc(doc(db, 'orders', orderId));
      if (orderSnap.exists()) {
        const data = orderSnap.data();
        // Restore stock via transaction
        if (data.items?.length) {
          await runTransaction(db, async (tx) => {
            for (const item of data.items) {
              const ref = doc(db, 'products', item.id);
              const pSnap = await tx.get(ref);
              if (pSnap.exists()) {
                const pd = pSnap.data();
                const newStock = Number(pd.stockQuantity || 0) + Number(item.quantity || 0);
                tx.update(ref, { stockQuantity: newStock, availableQuantity: newStock - Number(pd.reservedQuantity || 0) });
              }
            }
          });
        }
      }
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success('Order deleted');
      logActivity({
        module: LOG_MODULES.ORDERS, action: LOG_ACTIONS.ORDER_DELETED,
        targetId: orderId, targetType: 'order',
        description: `Order #${orderId.slice(-8).toUpperCase()} deleted`,
        status: LOG_STATUS.SUCCESS, adminInfo: buildAdminInfo(user),
      });
    } catch (e) {
      toast.error('Failed to delete order');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900">Orders</h1>
          <p className="text-sm text-luxury-500 mt-0.5">
            Real-time order management — {filteredOrders.length} of {orders.length} orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: kpis.total, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', action: () => setStatusFilter('All') },
          { label: 'Pending Fulfillment', value: kpis.pending, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', action: () => { setStatusFilter('All'); setDelayFilter(false); } },
          { label: 'Delayed Orders', value: kpis.delayed, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', action: () => setDelayFilter(!delayFilter) },
          { label: 'High Value Orders', value: kpis.highValue, icon: Star, color: 'text-gold-600', bg: 'bg-gold-50', action: () => setHighValueFilter(!highValueFilter) },
        ].map(k => (
          <button
            key={k.label}
            onClick={k.action}
            className="bg-white rounded-2xl p-4 shadow-sm border border-luxury-100 hover:shadow-md transition-all text-left group"
          >
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-4.5 h-4.5 ${k.color}`} />
            </div>
            <p className="text-xl font-bold text-luxury-900">
              {loading ? '—' : k.value}
            </p>
            <p className="text-xs text-luxury-500 mt-0.5">{k.label}</p>
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, customer, tracking#…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400 placeholder:text-luxury-400"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-luxury-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 sm:w-44"
          >
            <option value="All">All Statuses</option>
            {STATUS_PIPELINE.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-luxury-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 sm:w-36"
          >
            <option value="All">All Priority</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Quick filter pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDelayFilter(!delayFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                delayFilter ? 'bg-red-100 text-red-700 border-red-300' : 'border-luxury-200 text-luxury-600 hover:border-red-200 hover:bg-red-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Delayed
            </button>
            <button
              onClick={() => setHighValueFilter(!highValueFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                highValueFilter ? 'bg-amber-100 text-amber-700 border-amber-300' : 'border-luxury-200 text-luxury-600 hover:border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              High Value
            </button>
            {(searchQuery || statusFilter !== 'All' || priorityFilter !== 'All' || delayFilter || highValueFilter) && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('All'); setPriorityFilter('All'); setDelayFilter(false); setHighValueFilter(false); }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-luxury-200 text-xs text-luxury-500 hover:bg-luxury-50 transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkActionBar
          selected={[...selected]}
          onClear={() => setSelected(new Set())}
          onBulkStatus={handleBulkStatus}
          onBulkExport={handleExport}
          loading={bulkLoading}
        />
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 text-luxury-300 mx-auto mb-3" />
            <p className="font-semibold text-luxury-700">No orders match your filters</p>
            <p className="text-sm text-luxury-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-luxury-100 bg-luxury-50/50">
              <button onClick={toggleSelectAll} className="flex-shrink-0">
                {selected.size === filteredOrders.length && filteredOrders.length > 0
                  ? <CheckSquare className="w-4 h-4 text-gold-600" />
                  : <Square className="w-4 h-4 text-luxury-400" />
                }
              </button>
              <span className="text-xs font-bold text-luxury-500 uppercase tracking-wider flex-1">Order</span>
              <span className="text-xs font-bold text-luxury-500 uppercase tracking-wider w-28 hidden md:block">Customer</span>
              <span className="text-xs font-bold text-luxury-500 uppercase tracking-wider w-24 hidden lg:block">Total</span>
              <span className="text-xs font-bold text-luxury-500 uppercase tracking-wider w-32 hidden sm:block">Status</span>
              <span className="text-xs font-bold text-luxury-500 uppercase tracking-wider w-20 hidden xl:block">Date</span>
              <span className="text-xs font-bold text-luxury-500 uppercase tracking-wider w-16 text-right">Actions</span>
            </div>

            {/* Orders list */}
            <div className="divide-y divide-luxury-50">
              {filteredOrders.map(order => {
                const delay = detectDelay(order);
                const highVal = isHighValueOrder(order);
                const isSelected = selected.has(order.id);
                const isExpanded = expandedId === order.id;
                const date = safeToDate(order.createdAt);
                const priority = order.priority || 'normal';
                const priorityColor = PRIORITY_CONFIG[priority]?.color || '';

                return (
                  <div
                    key={order.id}
                    className={`transition-colors ${isSelected ? 'bg-gold-50/40' : 'hover:bg-luxury-50/50'}`}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                        className="flex-shrink-0"
                      >
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-gold-600" />
                          : <Square className="w-4 h-4 text-luxury-300 hover:text-luxury-500" />
                        }
                      </button>

                      {/* Order ID + indicators */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => navigate(`/admin/orders/${order.id}`)}
                            className="text-sm font-bold text-luxury-900 font-mono hover:text-gold-600 transition-colors"
                          >
                            #{order.id?.slice(-8).toUpperCase()}
                          </button>
                          {highVal && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                              <Star className="w-2.5 h-2.5" /> HV
                            </span>
                          )}
                          {priority !== 'normal' && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${priorityColor}`}>
                              {PRIORITY_CONFIG[priority]?.label}
                            </span>
                          )}
                          <SmallDelayBadge delay={delay} />
                        </div>
                        <p className="text-xs text-luxury-400 mt-0.5">
                          {(order.items || []).length} item(s)
                          {order.trackingNumber ? ` · Track: ${order.trackingNumber}` : ''}
                        </p>
                      </div>

                      {/* Customer */}
                      <div className="w-28 hidden md:block min-w-0">
                        <p className="text-xs font-semibold text-luxury-800 truncate">{order.customerName || order.name || '—'}</p>
                        <p className="text-[10px] text-luxury-400 truncate">{order.city || '—'}</p>
                      </div>

                      {/* Total */}
                      <div className="w-24 hidden lg:block">
                        <p className="text-sm font-bold text-luxury-900">{formatINR(order.total)}</p>
                      </div>

                      {/* Status */}
                      <div className="w-32 hidden sm:block">
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Date */}
                      <div className="w-20 hidden xl:block">
                        <p className="text-xs text-luxury-500">{timeAgo(date)}</p>
                      </div>

                      {/* Actions */}
                      <div className="w-16 flex items-center justify-end gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          title="Open detail"
                          className="p-1.5 rounded-lg text-luxury-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          title="Quick actions"
                          className="p-1.5 rounded-lg text-luxury-400 hover:text-luxury-700 hover:bg-luxury-100 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded quick-action panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-luxury-100 bg-luxury-50/60">
                        <div className="mt-3 space-y-3">
                          {/* Order summary */}
                          <div className="flex flex-wrap gap-3 text-xs text-luxury-600">
                            <span><strong>Customer:</strong> {order.customerName || order.name || '—'}</span>
                            <span><strong>Phone:</strong> {order.phone || order.mobile || '—'}</span>
                            <span><strong>City:</strong> {order.city || '—'}</span>
                            <span><strong>Method:</strong> {order.paymentMethod?.toUpperCase() || '—'}</span>
                            <span><strong>Total:</strong> {formatINR(order.total)}</span>
                            {order.trackingNumber && <span><strong>Tracking:</strong> {order.trackingNumber}</span>}
                          </div>

                          {/* Items */}
                          <div className="flex flex-wrap gap-2">
                            {(order.items || []).map((item, idx) => (
                              <span key={idx} className="text-[11px] px-2 py-1 bg-white border border-luxury-200 rounded-lg text-luxury-700">
                                {item.name} ×{item.quantity}
                              </span>
                            ))}
                          </div>

                          {/* Quick status buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-luxury-500 font-medium">Quick update:</span>
                            {STATUS_PIPELINE.map(s => (
                              <button
                                key={s.key}
                                onClick={() => handleQuickStatus(order.id, s.key)}
                                disabled={normalizeStatus(order.status) === s.key}
                                className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
                                  normalizeStatus(order.status) === s.key
                                    ? `${s.color.bg} ${s.color.text} border-current cursor-default`
                                    : 'border-luxury-200 text-luxury-600 hover:border-gold-400 hover:text-gold-700 hover:bg-gold-50'
                                } disabled:cursor-default`}
                              >
                                {s.label}
                              </button>
                            ))}
                            <button
                              onClick={() => handleQuickStatus(order.id, 'cancelled')}
                              disabled={normalizeStatus(order.status) === 'cancelled'}
                              className="px-2 py-1 rounded-lg border border-luxury-200 text-xs font-medium text-red-500 hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-40"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Table footer */}
            <div className="px-4 py-3 border-t border-luxury-100 flex items-center justify-between text-xs text-luxury-500">
              <span>Showing {filteredOrders.length} of {orders.length} orders</span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live updates active
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
