/**
 * AdminShipping.jsx — Shipping Management Center
 *
 * Manage all packed/shipped orders:
 * - Add tracking numbers and courier info
 * - Bulk mark as shipped
 * - View tracking status per order
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Package, CheckCircle2, ExternalLink, Edit3,
  Loader2, Search, Download, Box,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAllOrders, updateTrackingInfo, updateOrderStatus, exportOrdersCSV } from '../../services/orderTracking';
import { normalizeStatus, formatINR } from '../../services/orderStatus';
import { StatusBadge } from '../../components/UI/OrderTimeline';
import { toast } from 'react-toastify';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

const COURIER_OPTIONS = [
  'BlueDart', 'DTDC', 'Delhivery', 'FedEx', 'DHL',
  'Ekart', 'XpressBees', 'Shadowfax', 'Ecom Express', 'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// INLINE TRACKING FORM
// ─────────────────────────────────────────────────────────────────────────────

function TrackingForm({ order, user, onClose }) {
  const [form, setForm] = useState({
    trackingNumber: order.trackingNumber || '',
    courierName: order.courierName || '',
    trackingUrl: order.trackingUrl || '',
    estimatedDelivery: order.estimatedDelivery || '',
  });
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTrackingInfo(order.id, form, user);
      toast.success('Tracking info saved');
      onClose();
    } catch (e) {
      toast.error('Failed to save tracking info');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkShipped = async () => {
    setAdvancing(true);
    try {
      if (form.trackingNumber || form.courierName) {
        await updateTrackingInfo(order.id, form, user);
      }
      await updateOrderStatus(order.id, 'shipped', user, 'Marked as shipped from Shipping Management');
      toast.success('Order marked as shipped');
      onClose();
    } catch (e) {
      toast.error('Failed to mark as shipped');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-luxury-700 mb-1">Courier</label>
          <select
            value={form.courierName}
            onChange={e => setForm(p => ({ ...p, courierName: e.target.value }))}
            className="w-full px-3 py-1.5 text-sm border border-luxury-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            <option value="">Select courier…</option>
            {COURIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-luxury-700 mb-1">Tracking Number</label>
          <input
            value={form.trackingNumber}
            onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
            placeholder="AWB / Tracking ID"
            className="w-full px-3 py-1.5 text-sm border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-luxury-700 mb-1">Tracking URL (optional)</label>
          <input
            value={form.trackingUrl}
            onChange={e => setForm(p => ({ ...p, trackingUrl: e.target.value }))}
            placeholder="https://..."
            className="w-full px-3 py-1.5 text-sm border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-luxury-700 mb-1">Est. Delivery</label>
          <input
            type="date"
            value={form.estimatedDelivery}
            onChange={e => setForm(p => ({ ...p, estimatedDelivery: e.target.value }))}
            className="w-full px-3 py-1.5 text-sm border border-luxury-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {normalizeStatus(order.status) === 'packed' && (
          <button
            onClick={handleMarkShipped}
            disabled={advancing}
            className="flex-1 py-2 rounded-lg bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {advancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
            Save & Mark Shipped
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Save Tracking
        </button>
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-luxury-200 text-xs text-luxury-600 hover:bg-luxury-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminShipping() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);

  if (!isAdmin) return null;

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllOrders((data) => {
      // Only packed + shipped orders are relevant to shipping management
      setOrders(data.filter(o => ['packed', 'shipped', 'out of delivery'].includes(normalizeStatus(o.status))));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return orders.filter(o => {
      if (statusFilter !== 'All' && normalizeStatus(o.status) !== statusFilter) return false;
      if (needle) {
        const hay = [o.id, o.customerName, o.name, o.city, o.trackingNumber, o.courierName].join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const packedCount = orders.filter(o => normalizeStatus(o.status) === 'packed').length;
  const shippedCount = orders.filter(o => normalizeStatus(o.status) === 'shipped').length;
  const outForDelivery = orders.filter(o => normalizeStatus(o.status) === 'out of delivery').length;
  const withTracking = orders.filter(o => o.trackingNumber).length;

  return (
    <div className="space-y-5 max-w-[1300px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900">Shipping Management</h1>
          <p className="text-sm text-luxury-500 mt-0.5">Manage courier tracking and shipping status for packed orders</p>
        </div>
        <button
          onClick={() => exportOrdersCSV(filtered, 'shipping-orders')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Box, bg: 'bg-indigo-50', color: 'text-indigo-600', label: 'Ready to Ship', value: packedCount, filter: 'packed' },
          { icon: Truck, bg: 'bg-purple-50', color: 'text-purple-600', label: 'Shipped', value: shippedCount, filter: 'shipped' },
          { icon: Package, bg: 'bg-orange-50', color: 'text-orange-600', label: 'Out for Delivery', value: outForDelivery, filter: 'out of delivery' },
          { icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600', label: 'With Tracking', value: withTracking, filter: 'All' },
        ].map(k => (
          <button
            key={k.label}
            onClick={() => setStatusFilter(k.filter)}
            className={`bg-white rounded-2xl p-4 shadow-sm border text-left transition-all hover:shadow-md ${
              statusFilter === k.filter ? 'border-gold-300 ring-1 ring-gold-200' : 'border-luxury-100'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-4.5 h-4.5 ${k.color}`} />
            </div>
            <p className="text-xl font-bold text-luxury-900">{loading ? '—' : k.value}</p>
            <p className="text-xs text-luxury-500 mt-0.5">{k.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Order ID, customer, tracking#…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-luxury-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            <option value="All">All Statuses</option>
            <option value="packed">Packed (Ready to Ship)</option>
            <option value="shipped">Shipped</option>
            <option value="out of delivery">Out for Delivery</option>
          </select>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="w-12 h-12 text-luxury-300 mx-auto mb-3" />
            <p className="font-semibold text-luxury-700">No orders in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-luxury-50">
            {filtered.map(order => {
              const isEditing = editingId === order.id;
              const hasTracking = order.trackingNumber;

              return (
                <div key={order.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="text-sm font-bold text-luxury-900 font-mono hover:text-gold-600 transition-colors"
                        >
                          #{order.id?.slice(-8).toUpperCase()}
                        </button>
                        <StatusBadge status={order.status} />
                        {hasTracking && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Truck className="w-2.5 h-2.5" />
                            {order.courierName || 'Courier'} — {order.trackingNumber}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-luxury-500">
                        <span>{order.customerName || order.name || '—'}</span>
                        <span>{formatINR(order.total)}</span>
                        <span>{order.city || '—'}</span>
                        {order.estimatedDelivery && <span>ETA: {order.estimatedDelivery}</span>}
                        {order.trackingUrl && (
                          <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Track
                          </a>
                        )}
                      </div>

                      {/* Tracking form inline */}
                      {isEditing && (
                        <TrackingForm order={order} user={user} onClose={() => setEditingId(null)} />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditingId(isEditing ? null : order.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-luxury-200 text-xs font-medium text-luxury-600 hover:bg-luxury-50 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        {hasTracking ? 'Edit' : 'Add Tracking'}
                      </button>
                      <button
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        className="p-1.5 rounded-lg text-luxury-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 py-3 border-t border-luxury-100 text-xs text-luxury-500 flex items-center justify-between">
          <span>{filtered.length} orders</span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </div>
  );
}
