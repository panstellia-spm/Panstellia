/**
 * AdminOrderDetail.jsx — Enterprise Order Workspace
 *
 * Full single-order management center with:
 * - Real-time Firestore listener
 * - Status pipeline with notes
 * - Tracking info management
 * - Admin notes panel
 * - Priority tagging
 * - SLA monitoring
 * - Delay detection alerts
 * - Refund management
 * - Activity timeline
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Package, Truck, CreditCard, User, MapPin,
  AlertTriangle, Clock, Star, MessageSquare, RefreshCw,
  CheckCircle2, XCircle, Tag, ExternalLink, Copy, Edit3,
  Shield, Hash, Calendar, Phone, Mail, Send, Loader2,
  ArrowRight, Zap, TrendingUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { subscribeToOrder, subscribeToOrderNotes, updateOrderStatus, updateTrackingInfo, addOrderNote, updateOrderPriority, requestRefund } from '../../services/orderTracking';
import {
  STATUS_PIPELINE, PRIORITY_CONFIG, normalizeStatus,
  detectDelay, computeSLAStatus, estimateDelivery,
  isHighValueOrder, formatOrderDate, formatShortDate, formatINR,
} from '../../services/orderStatus';
import OrderTimeline, { StatusBadge, ActivityTimeline, getStatusConfig } from '../../components/UI/OrderTimeline';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied!', { autoClose: 1500 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconColor = 'text-gold-600', children, action }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-luxury-100">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          <h2 className="text-sm font-bold text-luxury-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ label, value, copy, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-luxury-50 last:border-0">
      <span className="text-xs text-luxury-500 font-medium min-w-0 shrink-0 w-32">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className={`text-sm text-luxury-900 font-semibold text-right break-all ${mono ? 'font-mono' : ''}`}>
          {value || '—'}
        </span>
        {copy && value && (
          <button onClick={() => copyToClipboard(value)} className="p-1 rounded text-luxury-400 hover:text-luxury-700 hover:bg-luxury-100 transition-colors flex-shrink-0">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELAY BADGE
// ─────────────────────────────────────────────────────────────────────────────

function DelayBadge({ delay }) {
  if (!delay?.isDelayed) return null;
  const isCrit = delay.severity === 'critical';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
      isCrit ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
    }`}>
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      {delay.label} — {delay.hours}h overdue
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA STATUS WIDGET
// ─────────────────────────────────────────────────────────────────────────────

function SLAWidget({ slaData }) {
  if (!slaData?.length) return null;

  const colors = {
    completed: { bar: 'bg-green-400', text: 'text-green-600', label: 'Completed' },
    on_time: { bar: 'bg-green-300', text: 'text-green-600', label: 'On Time' },
    at_risk: { bar: 'bg-amber-400', text: 'text-amber-600', label: 'At Risk' },
    breached: { bar: 'bg-red-400', text: 'text-red-600', label: 'SLA Breached' },
  };

  return (
    <div className="space-y-3">
      {slaData.map(stage => {
        const c = colors[stage.status] || colors.on_time;
        const pct = Math.min(100, Math.round((stage.elapsed / stage.threshold) * 100));
        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-luxury-700">{stage.stage}</span>
              <span className={`text-xs font-semibold ${c.text}`}>
                {stage.completed ? `✓ ${stage.elapsed}h` : c.label}
              </span>
            </div>
            <div className="h-1.5 bg-luxury-100 rounded-full overflow-hidden">
              <div
                className={`h-1.5 ${c.bar} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-luxury-400">{stage.elapsed}h elapsed</span>
              <span className="text-[10px] text-luxury-400">SLA: {stage.threshold}h</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [order, setOrder] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status update form
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Tracking form
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingForm, setTrackingForm] = useState({ trackingNumber: '', courierName: '', trackingUrl: '', estimatedDelivery: '' });
  const [savingTracking, setSavingTracking] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Refund form
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [requestingRefund, setRequestingRefund] = useState(false);

  // Priority
  const [updatingPriority, setUpdatingPriority] = useState(false);

  if (!isAdmin) return null;

  // ── Real-time listeners ───────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsub = subscribeToOrder(id, (data, err) => {
      setLoading(false);
      if (err) { setError(err); return; }
      setOrder(data);
      if (data) {
        setSelectedStatus(normalizeStatus(data.status));
        setTrackingForm({
          trackingNumber: data.trackingNumber || '',
          courierName: data.courierName || '',
          trackingUrl: data.trackingUrl || '',
          estimatedDelivery: data.estimatedDelivery || '',
        });
        setRefundForm(prev => ({ ...prev, amount: data.total || '' }));
      }
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToOrderNotes(id, (data) => setNotes(data));
    return unsub;
  }, [id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStatusUpdate = async () => {
    if (!selectedStatus || selectedStatus === normalizeStatus(order?.status)) return;
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(id, selectedStatus, user, statusNote);
      toast.success(`Status updated to "${selectedStatus}"`);
      setStatusNote('');
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveTracking = async () => {
    setSavingTracking(true);
    try {
      await updateTrackingInfo(id, trackingForm, user);
      toast.success('Tracking info saved');
      setShowTrackingForm(false);
    } catch (e) {
      toast.error('Failed to save tracking info');
    } finally {
      setSavingTracking(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await addOrderNote(id, newNote, user);
      toast.success('Note added');
      setNewNote('');
    } catch (e) {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handlePriority = async (priority) => {
    setUpdatingPriority(true);
    try {
      await updateOrderPriority(id, priority, user);
      toast.success(`Priority set to "${priority}"`);
    } catch (e) {
      toast.error('Failed to update priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!refundForm.reason.trim()) { toast.error('Please enter a refund reason'); return; }
    setRequestingRefund(true);
    try {
      await requestRefund(id, { amount: refundForm.amount, reason: refundForm.reason }, user);
      toast.success('Refund request submitted');
      setShowRefundForm(false);
    } catch (e) {
      toast.error('Failed to submit refund');
    } finally {
      setRequestingRefund(false);
    }
  };

  // ── Loading / Error States ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="font-semibold text-luxury-900">Order not found</p>
        <button onClick={() => navigate('/admin/orders')} className="mt-4 btn-primary">Back to Orders</button>
      </div>
    );
  }

  // ── Computed values ───────────────────────────────────────────────────────

  const normalised = normalizeStatus(order.status);
  const isCancelled = normalised === 'cancelled';
  const isRefunded = normalised === 'refunded';
  const isTerminal = isCancelled || isRefunded || normalised === 'delivered';
  const delay = detectDelay(order);
  const slaData = computeSLAStatus(order);
  const eta = estimateDelivery(order);
  const highValue = isHighValueOrder(order);
  const priority = order.priority || 'normal';
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  const statusHistory = order.statusHistory || [];

  const subtotal = (order.items || []).reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/orders')}
            className="flex items-center gap-1.5 text-sm text-luxury-600 hover:text-luxury-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Orders
          </button>
          <span className="text-luxury-300">/</span>
          <span className="text-sm font-bold text-luxury-900 font-mono">
            #{id?.slice(-8).toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {highValue && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
              <Star className="w-3 h-3" /> High Value
            </span>
          )}
          <StatusBadge status={order.status} />
          <Link
            to={`/order/${id}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-luxury-200 text-xs font-medium text-luxury-600 hover:bg-luxury-50 transition-colors"
          >
            Customer View <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Delay Alert */}
      {delay.isDelayed && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl ${
          delay.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${delay.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
          <div>
            <p className={`text-sm font-bold ${delay.severity === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
              {delay.label} — {delay.hours}h overdue
            </p>
            <p className="text-xs text-luxury-600 mt-0.5">
              This order is past its SLA target. Immediate attention required.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN (main content) ───────────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Order Timeline */}
          <Section title="Order Tracking Timeline" icon={TrendingUp} iconColor="text-green-600">
            <OrderTimeline status={order.status} statusHistory={statusHistory} />
          </Section>

          {/* Status Update */}
          {!isTerminal && (
            <Section title="Update Status" icon={ArrowRight} iconColor="text-gold-600">
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STATUS_PIPELINE.map(s => {
                    const isCurrentStatus = s.key === normalised;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setSelectedStatus(s.key)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          selectedStatus === s.key
                            ? `${s.color.bg} ${s.color.text} border-current shadow-sm`
                            : isCurrentStatus
                            ? `bg-luxury-50 border-luxury-300 text-luxury-600`
                            : 'border-luxury-200 text-luxury-600 hover:border-luxury-300 hover:bg-luxury-50'
                        }`}
                      >
                        <s.icon className={`w-4 h-4 mb-1 ${selectedStatus === s.key ? s.color.text : 'text-luxury-400'}`} />
                        {s.label}
                        {isCurrentStatus && (
                          <span className="ml-1 text-[9px] font-bold opacity-70">(current)</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedStatus('cancelled')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      selectedStatus === 'cancelled'
                        ? 'bg-red-100 text-red-700 border-red-300 shadow-sm'
                        : 'border-luxury-200 text-red-500 hover:border-red-200 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 mb-1" />
                    Cancel Order
                  </button>
                  <button
                    onClick={() => setSelectedStatus('refunded')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      selectedStatus === 'refunded'
                        ? 'bg-teal-100 text-teal-700 border-teal-300 shadow-sm'
                        : 'border-luxury-200 text-teal-600 hover:border-teal-200 hover:bg-teal-50'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 mb-1" />
                    Mark Refunded
                  </button>
                </div>

                <textarea
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="Optional: add a note for this status change..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none placeholder:text-luxury-400"
                />

                <button
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus || selectedStatus === normalised}
                  className="w-full py-2.5 rounded-xl bg-gold-500 text-white font-bold text-sm hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {updatingStatus ? 'Updating…' : 'Apply Status Update'}
                </button>
              </div>
            </Section>
          )}

          {/* Tracking Info */}
          <Section
            title="Shipping & Tracking"
            icon={Truck}
            iconColor="text-blue-600"
            action={
              <button
                onClick={() => setShowTrackingForm(!showTrackingForm)}
                className="flex items-center gap-1.5 text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                {showTrackingForm ? 'Cancel' : 'Edit Tracking'}
              </button>
            }
          >
            {showTrackingForm ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 mb-1">Courier Name</label>
                    <input
                      value={trackingForm.courierName}
                      onChange={e => setTrackingForm(p => ({ ...p, courierName: e.target.value }))}
                      placeholder="BlueDart, DTDC, FedEx…"
                      className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 mb-1">Tracking Number</label>
                    <input
                      value={trackingForm.trackingNumber}
                      onChange={e => setTrackingForm(p => ({ ...p, trackingNumber: e.target.value }))}
                      placeholder="AWB / Tracking ID"
                      className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 mb-1">Tracking URL (optional)</label>
                    <input
                      value={trackingForm.trackingUrl}
                      onChange={e => setTrackingForm(p => ({ ...p, trackingUrl: e.target.value }))}
                      placeholder="https://track.courier.com/..."
                      className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 mb-1">Estimated Delivery</label>
                    <input
                      type="date"
                      value={trackingForm.estimatedDelivery}
                      onChange={e => setTrackingForm(p => ({ ...p, estimatedDelivery: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveTracking}
                  disabled={savingTracking}
                  className="w-full py-2 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {savingTracking ? 'Saving…' : 'Save Tracking Info'}
                </button>
              </div>
            ) : (
              <div>
                <InfoRow label="Courier" value={order.courierName} />
                <InfoRow label="Tracking #" value={order.trackingNumber} copy mono />
                <InfoRow label="ETA" value={eta.label} />
                {order.trackingUrl && (
                  <div className="mt-3">
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Live Tracking
                    </a>
                  </div>
                )}
                {!order.trackingNumber && !order.courierName && (
                  <p className="text-sm text-luxury-400 text-center py-2">No tracking info added yet</p>
                )}
              </div>
            )}
          </Section>

          {/* Items Ordered */}
          <Section title="Items Ordered" icon={Package} iconColor="text-luxury-600">
            <div className="space-y-3">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-luxury-50 rounded-xl border border-luxury-100">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 object-cover rounded-lg border border-luxury-100 flex-shrink-0"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-luxury-900 truncate">{item.name}</p>
                    <p className="text-xs text-luxury-500 mt-0.5">
                      {item.category || '—'} {item.skuCode ? `· ${item.skuCode}` : ''}
                    </p>
                    <p className="text-xs text-luxury-600 mt-0.5">Qty: {item.quantity || 1}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-luxury-900">{formatINR((item.price || 0) * (item.quantity || 1))}</p>
                    <p className="text-xs text-luxury-400">{formatINR(item.price || 0)} each</p>
                  </div>
                </div>
              ))}

              {/* Order Totals */}
              <div className="mt-4 pt-3 border-t border-luxury-100 space-y-1.5">
                <div className="flex justify-between text-xs text-luxury-600">
                  <span>Subtotal</span>
                  <span>{formatINR(order.subtotal || subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-luxury-600">
                  <span>Shipping</span>
                  <span className={Number(order.shipping || 0) === 0 ? 'text-green-600 font-medium' : ''}>
                    {Number(order.shipping || 0) === 0 ? 'Free' : formatINR(order.shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-luxury-600">
                  <span>Tax (GST)</span>
                  <span>{formatINR(order.tax || order.gst || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-luxury-900 pt-1.5 border-t border-luxury-100">
                  <span>Total</span>
                  <span className="text-gradient">{formatINR(order.total)}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Admin Notes */}
          <Section title="Internal Notes" icon={MessageSquare} iconColor="text-purple-600">
            <div className="space-y-3">
              {/* Add note input */}
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add an internal note visible to admins only…"
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none placeholder:text-luxury-400"
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="px-3 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-40 flex items-center self-start"
                >
                  {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <p className="text-xs text-luxury-400 text-center py-3">No notes yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                  {notes.map(note => (
                    <div key={note.id} className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-purple-700">{note.adminName}</span>
                        <span className="text-[10px] text-luxury-400">
                          {safeToDate(note.createdAt)?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) || '—'}
                        </span>
                      </div>
                      <p className="text-sm text-luxury-800">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Refund Panel (for cancelled/delivered orders) */}
          {(isCancelled || order.refundStatus) && (
            <Section title="Refund Management" icon={RefreshCw} iconColor="text-teal-600">
              {order.refundStatus && order.refundStatus !== 'none' ? (
                <div className="space-y-2">
                  <InfoRow label="Refund Status" value={order.refundStatus?.toUpperCase()} />
                  <InfoRow label="Refund Amount" value={formatINR(order.refundAmount)} />
                  <InfoRow label="Reason" value={order.refundReason} />
                  <InfoRow label="Requested" value={formatOrderDate(order.refundRequestedAt)} />
                  <InfoRow label="Requested By" value={order.refundRequestedBy} />
                </div>
              ) : showRefundForm ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 mb-1">Refund Amount (₹)</label>
                    <input
                      type="number"
                      value={refundForm.amount}
                      onChange={e => setRefundForm(p => ({ ...p, amount: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 mb-1">Refund Reason</label>
                    <textarea
                      value={refundForm.reason}
                      onChange={e => setRefundForm(p => ({ ...p, reason: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefundRequest}
                      disabled={requestingRefund}
                      className="flex-1 py-2 rounded-xl bg-teal-500 text-white font-bold text-sm hover:bg-teal-600 transition-colors disabled:opacity-50"
                    >
                      {requestingRefund ? 'Submitting…' : 'Submit Refund Request'}
                    </button>
                    <button onClick={() => setShowRefundForm(false)} className="px-3 py-2 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRefundForm(true)}
                  className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Initiate Refund
                </button>
              )}
            </Section>
          )}
        </div>

        {/* ── RIGHT COLUMN (details) ──────────────────────────────────── */}
        <div className="space-y-6">

          {/* Customer Info */}
          <Section title="Customer" icon={User} iconColor="text-blue-600">
            <InfoRow label="Name" value={order.customerName || order.name} />
            <InfoRow label="Phone" value={order.phone || order.mobile || order.customerPhone} />
            <InfoRow label="Email" value={order.email || order.customerEmail} />
            <InfoRow label="User ID" value={order.userId?.slice(0, 12)} mono />
          </Section>

          {/* Shipping Address */}
          <Section title="Shipping Address" icon={MapPin} iconColor="text-orange-500">
            <div className="text-sm text-luxury-700 leading-relaxed">
              {[order.address, order.city, order.state, order.pincode].filter(Boolean).join(', ') || 'No address saved'}
            </div>
          </Section>

          {/* Payment */}
          <Section title="Payment" icon={CreditCard} iconColor="text-green-600">
            <InfoRow label="Method" value={order.paymentMethod?.toUpperCase()} />
            <InfoRow label="Status" value={order.paymentStatus} />
            <InfoRow label="Order Date" value={formatShortDate(order.createdAt)} />
            <InfoRow label="Order Total" value={formatINR(order.total)} />
          </Section>

          {/* Priority */}
          <Section title="Priority Tag" icon={Tag} iconColor="text-purple-600">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handlePriority(key)}
                  disabled={updatingPriority}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    priority === key
                      ? `${config.color} shadow-sm ring-2 ring-offset-1 ring-current/20`
                      : 'border-luxury-200 text-luxury-500 hover:border-luxury-300 hover:bg-luxury-50'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </Section>

          {/* SLA Status */}
          <Section title="SLA Monitor" icon={Clock} iconColor="text-amber-600">
            <SLAWidget slaData={slaData} />
            {slaData.length === 0 && (
              <p className="text-xs text-luxury-400 text-center py-2">No SLA data available</p>
            )}
          </Section>

          {/* Activity Timeline */}
          <Section title="Status History" icon={Shield} iconColor="text-luxury-500">
            <ActivityTimeline statusHistory={statusHistory} />
          </Section>
        </div>
      </div>
    </div>
  );
}
