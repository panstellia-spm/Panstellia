import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Package,
  XCircle,
  ChevronLeft,
  Truck,
  CreditCard,
  Calendar,
  Hash,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import SEOHelmet from '../utils/seoHelmet';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import OrderTimeline, { StatusBadge } from '../components/UI/OrderTimeline';
import { subscribeToOrder } from '../services/orderTracking';

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
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatAddress(o) {
  const parts = [o?.address, o?.city, o?.state, o?.pincode]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean);
  return parts.length ? parts.join(', ') : 'N/A';
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO TILE — small reusable detail card
// ─────────────────────────────────────────────────────────────────────────────

function InfoTile({ icon: Icon, label, value, iconClass = 'text-gold-600' }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-luxury-50 rounded-xl border border-luxury-100 hover:border-gold-200 transition-colors duration-200">
      <span className={`mt-0.5 shrink-0 ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-luxury-500 uppercase tracking-wide font-semibold mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-luxury-900 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const OrderDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);

    // Try direct real-time subscription first
    const unsub = subscribeToOrder(id, (data, err) => {
      if (data && data.userId === user.uid) {
        setOrder(data);
        setLoading(false);
        return;
      }
      // If not found via direct ID, fall back to query
      if (!data && !err) {
        // Order not found via direct ID — try fallback queries
        const fetchFallback = async () => {
          try {
            // Query by orderId field in orders
            const ordersRef = collection(db, 'orders');
            const qOrders = query(ordersRef, where('userId', '==', user.uid), where('orderId', '==', id));
            const snapOrders = await getDocs(qOrders);
            if (!snapOrders.empty) {
              const d = snapOrders.docs[0];
              setOrder({ id: d.id, ...d.data() });
              setLoading(false);
              return;
            }
            // Fallback: payments collection
            const paymentsRef = collection(db, 'payments');
            const qPayments = query(paymentsRef, where('userId', '==', user.uid), where('orderId', '==', id));
            const snapPayments = await getDocs(qPayments);
            if (!snapPayments.empty) {
              const d = snapPayments.docs[0];
              const pdata = d.data();
              setOrder({
                id: d.id,
                status: pdata.status || pdata.paymentStatus || 'processing',
                total: pdata.amount ? Number(pdata.amount) / 100 : pdata.total,
                items: pdata.items || [],
                paymentMethod: pdata.paymentMethod,
                paymentStatus: pdata.paymentStatus,
                address: pdata.shippingAddress,
                city: pdata.shippingCity,
                state: pdata.shippingState,
                pincode: pdata.shippingPincode,
                shipping: pdata.shipping,
                tax: pdata.tax || pdata.gst,
                gst: pdata.gst,
                createdAt: pdata.createdAt,
              });
            } else {
              setOrder(null);
            }
          } catch (e) {
            setError(e);
          } finally {
            setLoading(false);
          }
        };
        fetchFallback();
      } else if (err) {
        setError(err);
        setLoading(false);
      }
    });

    return unsub;
  }, [user, id]);

  // ── Derived values ────────────────────────────────────────────────────────

  const rawStatus = order?.status || 'processing';
  const isCancelled = rawStatus.toLowerCase().trim() === 'cancelled';

  const calculatedSubtotal = (order?.items || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const subtotal =
    order?.subtotal != null ? Number(order.subtotal) : calculatedSubtotal;
  const shipping =
    order?.shipping != null
      ? Number(order.shipping)
      : subtotal > 1000
      ? 0
      : 99;
  const tax =
    order?.tax != null
      ? Number(order.tax)
      : order?.gst != null
      ? Number(order.gst)
      : subtotal * 0.05;
  const total =
    order?.total != null ? Number(order.total) : subtotal + shipping + tax;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet
        title="Order Details | Panstellia"
        description="View your order status and order information."
        keywords="order status, order details"
        canonical={`https://panstellia.com/order/${id}`}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700 font-medium transition-colors duration-200 group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to Orders
          </Link>
        </div>

        {/* ── Loading skeleton ──────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="skeleton h-6 w-48 mb-4 rounded" />
              <div className="skeleton h-4 w-32 mb-8 rounded" />
              <div className="skeleton h-20 w-full rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex gap-4">
                <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/4 rounded" />
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          /* ── Error state ───────────────────────────────────────────────── */
          <div className="bg-white rounded-2xl shadow-md p-10 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="mt-4 font-serif text-xl font-bold text-luxury-900">
              Unable to load order
            </h2>
            <p className="mt-2 text-luxury-600">Please try again later.</p>
            <Link to="/orders" className="mt-6 btn-primary inline-flex">
              View Orders
            </Link>
          </div>
        ) : !order ? (
          /* ── Not found ─────────────────────────────────────────────────── */
          <div className="bg-white rounded-2xl shadow-md p-10 text-center">
            <Package className="w-12 h-12 text-luxury-300 mx-auto" />
            <h2 className="mt-4 font-serif text-xl font-bold text-luxury-900">
              Order not found
            </h2>
            <p className="mt-2 text-luxury-600">
              It may have been removed or you do not have access.
            </p>
            <Link to="/orders" className="mt-6 btn-primary inline-flex">
              View Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Header card ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-300" />
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h1 className="font-serif text-2xl font-bold text-luxury-900">
                      Order Details
                    </h1>
                    <p className="text-sm text-luxury-500 mt-1">
                      Complete information about your order
                    </p>
                  </div>
                  <StatusBadge
                    status={rawStatus}
                    className="self-start text-sm px-4 py-1.5"
                  />
                </div>

                {/* Info tiles */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <InfoTile
                    icon={Hash}
                    label="Order ID"
                    value={`#${order.id.slice(0, 8).toUpperCase()}`}
                  />
                  <InfoTile
                    icon={Calendar}
                    label="Order Date"
                    value={formatDate(order.createdAt)}
                  />
                  <InfoTile
                    icon={CreditCard}
                    label="Payment Method"
                    value={order.paymentMethod || 'N/A'}
                  />
                  <InfoTile
                    icon={ShieldCheck}
                    label="Payment Status"
                    value={order.paymentStatus || 'N/A'}
                    iconClass={
                      (order.paymentStatus || '').toLowerCase() === 'paid'
                        ? 'text-green-500'
                        : 'text-gold-600'
                    }
                  />
                </div>
              </div>
            </div>

            {/* ── Order Tracking Timeline ───────────────────────────────── */}
            {!isCancelled && (
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-green-400 via-green-500 to-emerald-400" />
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Truck className="w-5 h-5 text-green-600" />
                    <h2 className="font-serif text-lg font-bold text-luxury-900">
                      Order Tracking
                    </h2>
                    <Link
                      to={`/order/${id}/track`}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Live Tracking
                    </Link>
                  </div>
                  {/*
                    OrderTimeline receives the raw status string directly from
                    Firestore — the same string the admin wrote.
                    No mapping, no transformation.
                  */}
                  <OrderTimeline status={rawStatus} statusHistory={order?.statusHistory || []} />
                </div>
              </div>
            )}

            {/* ── Cancelled notice ──────────────────────────────────────── */}
            {isCancelled && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700">Order Cancelled</p>
                  <p className="text-sm text-red-500 mt-0.5">
                    This order has been cancelled. Refunds, if applicable, are
                    processed within 5–7 business days.
                  </p>
                </div>
              </div>
            )}

            {/* ── Products + Summary ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Product list */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-luxury-100">
                  <h2 className="font-serif text-lg font-bold text-luxury-900">
                    Items Ordered
                  </h2>
                </div>
                <div className="divide-y divide-luxury-100">
                  {order.items?.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 px-6 py-4 hover:bg-luxury-50 transition-colors duration-150 group"
                      >
                        {item.image ? (
                          <img
                            src={getOptimizedImageUrl(item.image, {
                              width: 120,
                              quality: 70,
                            })}
                            alt={item.name}
                            className="w-[72px] h-[72px] object-cover rounded-xl border border-luxury-100 group-hover:scale-105 transition-transform duration-300 shrink-0"
                          />
                        ) : (
                          <div className="w-[72px] h-[72px] rounded-xl bg-luxury-100 shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-luxury-900 leading-snug">
                            {item.name || 'Item'}
                          </p>
                          <p className="text-sm text-luxury-500 mt-0.5">
                            Qty: {item.quantity ?? 1}
                          </p>
                          <p className="text-sm text-luxury-600 mt-0.5">
                            ₹{Number(item.price || 0).toLocaleString()} each
                          </p>
                        </div>

                        <p className="font-bold text-luxury-900 text-sm shrink-0">
                          ₹
                          {Number(
                            (item.price || 0) * (item.quantity || 1)
                          ).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center text-luxury-400 text-sm">
                      No items found.
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: summary + address */}
              <div className="flex flex-col gap-5">
                {/* Price breakdown */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-5 py-4 border-b border-luxury-100">
                    <h2 className="font-serif text-lg font-bold text-luxury-900">
                      Order Summary
                    </h2>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex justify-between text-sm text-luxury-600">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-luxury-600">
                      <span>Shipping</span>
                      <span
                        className={
                          shipping === 0 ? 'text-green-600 font-medium' : ''
                        }
                      >
                        {shipping === 0 ? 'Free' : `₹${shipping.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-luxury-600">
                      <span>Tax (5% GST)</span>
                      <span>₹{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-luxury-900 text-base pt-3 border-t border-luxury-100">
                      <span>Total</span>
                      <span className="text-gradient">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping address */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-5 py-4 border-b border-luxury-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gold-600" />
                    <h2 className="font-serif text-base font-bold text-luxury-900">
                      Shipping Address
                    </h2>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm text-luxury-700 leading-relaxed">
                      {formatAddress(order)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;
