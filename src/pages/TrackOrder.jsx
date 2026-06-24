/**
 * TrackOrder.jsx — Customer Real-time Order Tracking Page
 *
 * Route: /order/:id/track
 *
 * Features:
 * - Real-time Firestore listener (live status updates without refresh)
 * - Premium visual progress tracker
 * - Tracking number + courier info display
 * - ETA display
 * - Full timeline with timestamps
 * - Mobile-first luxury design
 */

import { useState, useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  ChevronLeft, Package, Truck, MapPin, CheckCircle2,
  Clock, ExternalLink, Star, XCircle, RefreshCw,
  Shield, Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToOrder } from '../services/orderTracking';
import {
  STATUS_PIPELINE, normalizeStatus, getStatusIndex,
  estimateDelivery, isHighValueOrder, safeToDate,
} from '../services/orderStatus';
import SEOHelmet from '../utils/seoHelmet';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(v) {
  const d = safeToDate(v);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(v) {
  const d = safeToDate(v);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getTimestampForStep(stepKey, statusHistory) {
  if (!statusHistory?.length) return null;
  const entry = statusHistory.findLast
    ? statusHistory.findLast(e => normalizeStatus(e.status) === stepKey)
    : [...statusHistory].reverse().find(e => normalizeStatus(e.status) === stepKey);
  return entry ? safeToDate(entry.timestamp) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP ICON
// ─────────────────────────────────────────────────────────────────────────────

function StepIcon({ step, done, active }) {
  const Icon = step.icon;
  if (done) {
    return (
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 shadow-lg shadow-green-200">
        <CheckCircle2 className="w-6 h-6 text-white" />
      </span>
    );
  }
  if (active) {
    return (
      <span className={`flex items-center justify-center w-12 h-12 rounded-full ${step.color.bg} border-2 border-current ${step.color.text} shadow-lg ring-4 ring-offset-2`}
        style={{ '--tw-ring-color': step.color.dot + '30' }}
      >
        <Icon className={`w-6 h-6 ${step.color.text}`} />
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 border-2 border-gray-200">
      <Icon className="w-6 h-6 text-gray-300" />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TrackOrder() {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    const unsub = subscribeToOrder(id, (data, err) => {
      setLoading(false);
      if (err) { setError(err); return; }
      // Security: ensure user owns this order
      if (data && data.userId !== user.uid) {
        setOrder(null);
        setError(new Error('Unauthorized'));
        return;
      }
      setOrder(data);
    });
    return unsub;
  }, [id, user]);

  if (!user) return <Navigate to={`/login?redirect=/order/${id}/track`} replace />;

  const normalised = order ? normalizeStatus(order.status) : 'processing';
  const isCancelled = normalised === 'cancelled';
  const isRefunded = normalised === 'refunded';
  const activeIdx = (isCancelled || isRefunded) ? -1 : getStatusIndex(normalised);
  const statusHistory = order?.statusHistory || [];
  const eta = order ? estimateDelivery(order) : null;
  const highValue = order ? isHighValueOrder(order) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-luxury-50 via-white to-luxury-100 py-8">
      <SEOHelmet
        title={`Track Order #${id?.slice(0, 8).toUpperCase() || ''} | Panstellia`}
        description="Track your Panstellia order in real-time. See live shipping status and estimated delivery."
        keywords="order tracking, track order, shipping status"
        canonical={`https://panstellia.com/order/${id}/track`}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Back link */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            to={`/order/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Order Details
          </Link>
          <span className="text-luxury-300">·</span>
          <Link to="/orders" className="text-sm text-luxury-500 hover:text-luxury-700 transition-colors">
            All Orders
          </Link>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="skeleton h-6 w-48 rounded mb-4" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="skeleton h-32 rounded-xl" />
            </div>
          </div>
        )}

        {/* Error / Unauthorized */}
        {!loading && (error || !order) && (
          <div className="bg-white rounded-3xl shadow-lg p-10 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="font-serif text-xl font-bold text-luxury-900">Order not found</h2>
            <p className="text-luxury-500 text-sm mt-2">This order may not exist or you don't have access to it.</p>
            <Link to="/orders" className="mt-6 btn-primary inline-flex">View My Orders</Link>
          </div>
        )}

        {/* Cancelled */}
        {!loading && order && isCancelled && (
          <>
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-4">
              <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-600" />
              <div className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-bold text-luxury-900">Order Cancelled</h1>
                  <p className="text-sm text-luxury-500 mt-0.5">#{id?.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <div className="px-6 pb-6">
                <p className="text-sm text-luxury-600">
                  Your order has been cancelled. If you have already paid, refunds will be processed within 5–7 business days.
                </p>
                <Link to="/products" className="mt-4 btn-primary inline-flex text-sm">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        {!loading && order && !isCancelled && !isRefunded && (
          <div className="space-y-5">
            {/* Hero Header Card */}
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-300" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-luxury-400">
                        Tracking Your Order
                      </span>
                      {highValue && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                          <Star className="w-2.5 h-2.5" /> Priority
                        </span>
                      )}
                    </div>
                    <h1 className="font-serif text-2xl font-bold text-luxury-900">
                      #{id?.slice(0, 8).toUpperCase()}
                    </h1>
                    <p className="text-sm text-luxury-500 mt-0.5">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>

                  {/* Current status pill */}
                  <div>
                    {activeIdx >= 0 && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${STATUS_PIPELINE[activeIdx]?.color.bg} ${STATUS_PIPELINE[activeIdx]?.color.text} font-semibold text-sm`}>
                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        {STATUS_PIPELINE[activeIdx]?.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* ETA Banner */}
                {eta && eta.date && (
                  <div className="mt-5 flex items-center gap-3 p-4 bg-gradient-to-r from-gold-50 to-amber-50 border border-gold-200 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-gold-600" />
                    </div>
                    <div>
                      <p className="text-xs text-luxury-500 font-medium">
                        {eta.isEstimate ? 'Estimated Delivery' : 'Expected Delivery'}
                      </p>
                      <p className="text-base font-bold text-luxury-900">{eta.label}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Info (if available) */}
            {(order.courierName || order.trackingNumber) && (
              <div className="bg-white rounded-3xl shadow-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-4.5 h-4.5 text-blue-600" />
                  <h2 className="text-sm font-bold text-luxury-900">Shipping Information</h2>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {order.courierName && (
                    <div>
                      <p className="text-[10px] text-luxury-400 uppercase tracking-wide font-semibold">Courier</p>
                      <p className="text-sm font-bold text-luxury-900 mt-0.5">{order.courierName}</p>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div>
                      <p className="text-[10px] text-luxury-400 uppercase tracking-wide font-semibold">Tracking ID</p>
                      <p className="text-sm font-bold text-luxury-900 font-mono mt-0.5">{order.trackingNumber}</p>
                    </div>
                  )}
                  {order.trackingUrl && (
                    <div className="ml-auto">
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
                      >
                        Track Live <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Tracker */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Package className="w-4.5 h-4.5 text-gold-600" />
                <h2 className="text-sm font-bold text-luxury-900">Order Progress</h2>
                <span className="ml-auto text-xs text-luxury-400 italic">
                  Updates automatically
                </span>
              </div>

              {/* Vertical progress steps */}
              <div className="space-y-0">
                {STATUS_PIPELINE.map((step, idx) => {
                  const isDone = idx < activeIdx;
                  const isActive = idx === activeIdx;
                  const isLast = idx === STATUS_PIPELINE.length - 1;
                  const ts = getTimestampForStep(step.key, statusHistory);

                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      {/* Icon + connector */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <StepIcon step={step} done={isDone} active={isActive} />
                        {!isLast && (
                          <div
                            className="w-0.5 my-2 transition-all duration-700"
                            style={{ minHeight: '2rem', background: isDone ? '#22c55e' : '#e5e7eb' }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 min-w-0 pt-2 ${!isLast ? 'pb-4' : 'pb-1'}`}>
                        <p className={`text-sm font-bold transition-colors ${
                          isDone ? 'text-green-600' : isActive ? 'text-luxury-900' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </p>
                        <p className={`text-xs transition-colors mt-0.5 ${
                          isActive ? 'text-luxury-500' : isDone ? 'text-green-500' : 'text-gray-300'
                        }`}>
                          {step.description}
                        </p>
                        {(isDone || isActive) && ts && (
                          <p className="text-[11px] text-green-500 font-medium mt-1">
                            ✓ {formatDateTime(ts)}
                          </p>
                        )}
                        {isActive && !ts && (
                          <p className="text-[11px] text-luxury-400 mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                            In progress
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="bg-white rounded-3xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-luxury-900">Your Items</h2>
                <Link to={`/order/${id}`} className="text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors">
                  Full Details →
                </Link>
              </div>
              <div className="space-y-3">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-xl border border-luxury-100 flex-shrink-0"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-luxury-900 truncate">{item.name}</p>
                      <p className="text-xs text-luxury-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-luxury-900 flex-shrink-0">
                      ₹{Number((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live update indicator */}
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-luxury-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live tracking — updates automatically without refresh</span>
            </div>

            {/* Footer links */}
            <div className="flex justify-center gap-4 text-xs text-luxury-400 pb-4">
              <Link to="/orders" className="hover:text-gold-600 transition-colors">← All Orders</Link>
              <Link to="/products" className="hover:text-gold-600 transition-colors">Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
