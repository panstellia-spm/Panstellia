/**
 * AdminDelayed.jsx — Delayed Orders Management Center
 *
 * Auto-detects all delayed orders using the SLA engine.
 * Allows quick status updates directly from this view.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle2, Filter, ArrowRight, ExternalLink, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAllOrders, updateOrderStatus } from '../../services/orderTracking';
import { STATUS_PIPELINE, normalizeStatus, detectDelay, formatINR } from '../../services/orderStatus';
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

function formatDate(v) {
  const d = safeToDate(v);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELAY CARD
// ─────────────────────────────────────────────────────────────────────────────

function DelayCard({ order, delay, onStatusUpdate, updating }) {
  const navigate = useNavigate();
  const isCrit = delay.severity === 'critical';
  const normalised = normalizeStatus(order.status);

  const nextStatus = useMemo(() => {
    const idx = STATUS_PIPELINE.findIndex(s => s.key === normalised);
    return idx >= 0 && idx < STATUS_PIPELINE.length - 1 ? STATUS_PIPELINE[idx + 1] : null;
  }, [normalised]);

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
      isCrit ? 'border-red-200' : 'border-amber-200'
    }`}>
      <div className={`h-1 w-full ${isCrit ? 'bg-red-400' : 'bg-amber-400'}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-luxury-900 font-mono">#{order.id?.slice(-8).toUpperCase()}</span>
              <StatusBadge status={order.status} />
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <AlertTriangle className="w-2.5 h-2.5" />
                {delay.label} — {delay.hours}h overdue
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-luxury-600">
              <span>{order.customerName || order.name || '—'}</span>
              <span>{formatINR(order.total)}</span>
              <span>{order.city || '—'}</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(order.items || []).slice(0, 3).map((item, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-luxury-50 border border-luxury-100 rounded text-luxury-600">
                  {item.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-luxury-200 text-xs font-medium text-luxury-600 hover:bg-luxury-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Detail
            </button>
            {nextStatus && (
              <button
                onClick={() => onStatusUpdate(order.id, nextStatus.key)}
                disabled={updating === order.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors disabled:opacity-50"
              >
                {updating === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                → {nextStatus.label}
              </button>
            )}
          </div>
        </div>

        {/* SLA bar */}
        <div className="mt-3 pt-3 border-t border-luxury-100">
          <div className="flex items-center justify-between text-[10px] text-luxury-500 mb-1">
            <span>{delay.type?.toUpperCase()} SLA</span>
            <span className={isCrit ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'}>
              {delay.hours}h overdue
            </span>
          </div>
          <div className="h-1.5 bg-luxury-100 rounded-full overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${isCrit ? 'bg-red-400' : 'bg-amber-400'}`}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDelayed() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delayTypeFilter, setDelayTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [updating, setUpdating] = useState(null);

  if (!isAdmin) return null;

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const delayedOrders = useMemo(() => {
    return orders
      .map(o => ({ ...o, delay: detectDelay(o) }))
      .filter(o => o.delay.isDelayed)
      .filter(o => delayTypeFilter === 'All' || o.delay.type === delayTypeFilter)
      .filter(o => severityFilter === 'All' || o.delay.severity === severityFilter)
      .sort((a, b) => (b.delay.hours || 0) - (a.delay.hours || 0));
  }, [orders, delayTypeFilter, severityFilter]);

  const criticalCount = delayedOrders.filter(o => o.delay.severity === 'critical').length;
  const warningCount = delayedOrders.filter(o => o.delay.severity === 'warning').length;

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus, user);
      toast.success(`Order advanced to "${newStatus}"`);
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-luxury-900">Delayed Orders</h1>
        <p className="text-sm text-luxury-500 mt-0.5">
          Auto-detected orders past SLA thresholds — real-time monitoring
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`bg-white rounded-2xl p-4 shadow-sm border ${delayedOrders.length > 0 ? 'border-red-100' : 'border-luxury-100'}`}>
          <p className="text-2xl font-bold text-luxury-900">{loading ? '—' : delayedOrders.length}</p>
          <p className="text-xs text-luxury-500 mt-0.5">Total Delayed</p>
        </div>
        <div className={`bg-white rounded-2xl p-4 shadow-sm border ${criticalCount > 0 ? 'border-red-200' : 'border-luxury-100'}`}>
          <p className="text-2xl font-bold text-red-600">{loading ? '—' : criticalCount}</p>
          <p className="text-xs text-luxury-500 mt-0.5">Critical (&gt;2× SLA)</p>
        </div>
        <div className={`bg-white rounded-2xl p-4 shadow-sm border ${warningCount > 0 ? 'border-amber-200' : 'border-luxury-100'}`}>
          <p className="text-2xl font-bold text-amber-600">{loading ? '—' : warningCount}</p>
          <p className="text-xs text-luxury-500 mt-0.5">Warning</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-luxury-600 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {['All', 'processing', 'shipping', 'delivery'].map(type => (
          <button
            key={type}
            onClick={() => setDelayTypeFilter(type)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all capitalize ${
              delayTypeFilter === type
                ? 'bg-gold-100 text-gold-700 border-gold-300'
                : 'border-luxury-200 text-luxury-600 hover:bg-luxury-50'
            }`}
          >
            {type === 'All' ? 'All Types' : `${type} delay`}
          </button>
        ))}
        <div className="h-4 w-px bg-luxury-200" />
        {['All', 'warning', 'critical'].map(sev => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all capitalize ${
              severityFilter === sev
                ? sev === 'critical' ? 'bg-red-100 text-red-700 border-red-300' : sev === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gold-100 text-gold-700 border-gold-300'
                : 'border-luxury-200 text-luxury-600 hover:bg-luxury-50'
            }`}
          >
            {sev === 'All' ? 'All Severities' : sev}
          </button>
        ))}
      </div>

      {/* Delayed Orders List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : delayedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 py-16 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <p className="font-bold text-luxury-900 text-lg">All orders on track!</p>
          <p className="text-sm text-luxury-400 mt-2">No SLA breaches detected with current filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {delayedOrders.map(order => (
            <DelayCard
              key={order.id}
              order={order}
              delay={order.delay}
              onStatusUpdate={handleStatusUpdate}
              updating={updating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
