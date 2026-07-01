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
import shiprocketService from '../../services/shiprocket';
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

  // Shiprocket integration states
  const [shiprocketConfig, setShiprocketConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [activeFulfillmentTab, setActiveFulfillmentTab] = useState('shiprocket'); // 'shiprocket' or 'manual'
  const [packageDetails, setPackageDetails] = useState({ weight: 0.1, length: 10, breadth: 10, height: 5 });
  const [fetchingCouriers, setFetchingCouriers] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [courierError, setCourierError] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [shipmentActionLoading, setShipmentActionLoading] = useState({});

  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const token = await user.getIdToken();
        const res = await shiprocketService.getShiprocketConfig(token);
        if (res.success && res.config) {
          setShiprocketConfig(res.config);
          
          // Calculate total order items weight or use default
          const totalWeight = (order?.items || []).reduce((acc, item) => acc + (Number(item.quantity || 1) * 0.1), 0);
          setPackageDetails({
            weight: Number(totalWeight.toFixed(2)) || Number(res.config.defaultWeight) || 0.1,
            length: Number(res.config.defaultLength) || 10,
            breadth: Number(res.config.defaultBreadth) || 10,
            height: Number(res.config.defaultHeight) || 5
          });
        }
      } catch (err) {
        console.error('Failed to load Shiprocket config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    if (user && order) {
      fetchConfig();
    }
  }, [user, order?.id]);

  const handleFetchCouriers = async () => {
    setFetchingCouriers(true);
    setCourierError('');
    setAvailableCouriers([]);
    try {
      const token = await user.getIdToken();
      const isCod = order.paymentMethod?.toLowerCase() === 'cod';
      const weightVal = Number(packageDetails.weight) || 0.1;
      
      const res = await shiprocketService.checkServiceability(order.pincode, weightVal, isCod, token);
      if (res.deliverable && res.couriers) {
        setAvailableCouriers(res.couriers);
        if (res.couriers.length > 0) {
          const sorted = [...res.couriers].sort((a, b) => Number(a.rate) - Number(b.rate));
          setSelectedCourierId(sorted[0].courier_company_id);
        }
      } else {
        setCourierError(res.error || 'No serviceable couriers found for this pincode.');
      }
    } catch (err) {
      console.error('Failed to check serviceability:', err);
      setCourierError(err.message || 'Serviceability check failed.');
    } finally {
      setFetchingCouriers(false);
    }
  };

  const handleBookShipment = async () => {
    if (!selectedCourierId) {
      toast.error('Please select a courier');
      return;
    }
    setBookingInProgress(true);
    try {
      const token = await user.getIdToken();
      toast.info('Syncing order with Shiprocket...', { autoClose: 2000 });
      const createRes = await shiprocketService.createShiprocketOrder(order.id, packageDetails, token);
      
      if (createRes.success && createRes.shipmentId) {
        toast.info('Booking courier & assigning AWB...', { autoClose: 2000 });
        const awbRes = await shiprocketService.assignAWB(order.id, createRes.shipmentId, selectedCourierId, token);
        
        if (awbRes.success) {
          if (normalizeStatus(order.status) === 'processing') {
            await updateOrderStatus(order.id, 'packed', user, `Order synced to Shiprocket. Courier: ${awbRes.courier}, AWB: ${awbRes.awb}`);
          } else {
            await updateTrackingInfo(order.id, {
              trackingNumber: awbRes.awb,
              courierName: awbRes.courier,
              trackingUrl: `https://shiprocket.co/tracking/${awbRes.awb}`
            }, user);
          }
          toast.success(`Shipment created successfully! AWB: ${awbRes.awb} assigned.`);
          setAvailableCouriers([]);
        }
      }
    } catch (err) {
      console.error('Booking failed:', err);
      toast.error('Logistics booking failed: ' + err.message);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleShipmentAction = async (actionName, paramId) => {
    setShipmentActionLoading(prev => ({ ...prev, [actionName]: true }));
    try {
      const token = await user.getIdToken();
      if (actionName === 'schedule_pickup') {
        const res = await shiprocketService.schedulePickup(order.id, paramId, token);
        if (res.success) {
          toast.success('Courier pickup scheduled successfully!');
        }
      } 
      else if (actionName === 'download_label') {
        const res = await shiprocketService.generateLabel(paramId, token);
        if (res.success && res.labelUrl) {
          window.open(res.labelUrl, '_blank');
          toast.success('Label downloaded successfully');
        }
      } 
      else if (actionName === 'download_invoice') {
        const res = await shiprocketService.generateInvoice(paramId, token);
        if (res.success && res.invoiceUrl) {
          window.open(res.invoiceUrl, '_blank');
          toast.success('Invoice downloaded successfully');
        }
      } 
      else if (actionName === 'cancel_shipment') {
        if (window.confirm('Are you sure you want to cancel this Shiprocket shipment?')) {
          const res = await shiprocketService.cancelShipment(order.id, paramId, token);
          if (res.success) {
            toast.success('Shipment cancelled successfully.');
          }
        }
      }
    } catch (err) {
      console.error(`Shipment action ${actionName} failed:`, err);
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setShipmentActionLoading(prev => ({ ...prev, [actionName]: false }));
    }
  };

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
      const token = await user.getIdToken();
      const response = await fetch('/api/refundOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderDocId: id,
          amount: Number(refundForm.amount || order.total || 0),
          reason: refundForm.reason
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Refund failed');
      }

      toast.success(`Refund of ₹${resData.amount} processed successfully! ID: ${resData.refundId}`);
      setShowRefundForm(false);
    } catch (e) {
      console.error('Refund failed:', e);
      toast.error(`Failed to submit refund: ${e.message}`);
    } finally {
      setRequestingRefund(false);
    }
  };

  const handleProcessRefund = async (amount, reason) => {
    setRequestingRefund(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/refundOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderDocId: id,
          amount: Number(amount || order.total || 0),
          reason: reason || 'Processed by admin'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Refund failed');
      }

      toast.success(`Refund of ₹${resData.amount} processed successfully! ID: ${resData.refundId}`);
    } catch (e) {
      console.error('Refund failed:', e);
      toast.error(`Failed to process refund: ${e.message}`);
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
                {showTrackingForm ? 'Cancel' : 'Edit Tracking / Override'}
              </button>
            }
          >
            {!order.shiprocketOrderId ? (
              /* ORDER NOT YET SYNCED WITH SHIPROCKET */
              showTrackingForm ? (
                /* EXISTING MANUAL FORM */
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
                /* TABBED BOOKING OR MANUAL OPTION */
                <div className="space-y-4">
                  <div className="flex border-b border-luxury-100">
                    <button
                      onClick={() => setActiveFulfillmentTab('shiprocket')}
                      className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 text-center ${
                        activeFulfillmentTab === 'shiprocket'
                          ? 'border-gold-500 text-gold-600'
                          : 'border-transparent text-luxury-400 hover:text-luxury-600'
                      }`}
                    >
                      Shiprocket Fulfillment
                    </button>
                    <button
                      onClick={() => setActiveFulfillmentTab('manual')}
                      className={`flex-1 pb-2.5 text-xs font-bold transition-colors border-b-2 text-center ${
                        activeFulfillmentTab === 'manual'
                          ? 'border-gold-500 text-gold-600'
                          : 'border-transparent text-luxury-400 hover:text-luxury-600'
                      }`}
                    >
                      Manual Courier Info
                    </button>
                  </div>

                  {activeFulfillmentTab === 'shiprocket' ? (
                    /* SHIPROCKET TAB */
                    <div className="space-y-4">
                      {shiprocketConfig && !shiprocketConfig.enabled ? (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700 text-center">
                          Shiprocket integration is disabled in settings. Enable it to book couriers automatically.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Dimensions Form */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-luxury-500 uppercase mb-1">Weight (kg)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={packageDetails.weight}
                                onChange={e => setPackageDetails(p => ({ ...p, weight: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-2.5 py-1.5 text-xs border border-luxury-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-luxury-500 uppercase mb-1">Length (cm)</label>
                              <input
                                type="number"
                                value={packageDetails.length}
                                onChange={e => setPackageDetails(p => ({ ...p, length: parseInt(e.target.value) || 0 }))}
                                className="w-full px-2.5 py-1.5 text-xs border border-luxury-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-luxury-500 uppercase mb-1">Breadth (cm)</label>
                              <input
                                type="number"
                                value={packageDetails.breadth}
                                onChange={e => setPackageDetails(p => ({ ...p, breadth: parseInt(e.target.value) || 0 }))}
                                className="w-full px-2.5 py-1.5 text-xs border border-luxury-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-luxury-500 uppercase mb-1">Height (cm)</label>
                              <input
                                type="number"
                                value={packageDetails.height}
                                onChange={e => setPackageDetails(p => ({ ...p, height: parseInt(e.target.value) || 0 }))}
                                className="w-full px-2.5 py-1.5 text-xs border border-luxury-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-400"
                              />
                            </div>
                          </div>

                          {/* Fetch & Booking Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={handleFetchCouriers}
                              disabled={fetchingCouriers || bookingInProgress}
                              className="w-full py-2 text-xs font-bold rounded-xl border border-luxury-200 text-luxury-700 hover:bg-luxury-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {fetchingCouriers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                              Fetch Available Couriers
                            </button>
                          </div>

                          {/* Couriers List */}
                          {courierError && (
                            <p className="text-xs text-red-500 font-medium text-center py-1">{courierError}</p>
                          )}

                          {availableCouriers.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {availableCouriers.map((courier) => (
                                <label
                                  key={courier.courier_company_id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                    selectedCourierId === courier.courier_company_id
                                      ? 'border-gold-500 bg-gold-50/20'
                                      : 'border-luxury-100 hover:border-luxury-200 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="courier_select"
                                      checked={selectedCourierId === courier.courier_company_id}
                                      onChange={() => setSelectedCourierId(courier.courier_company_id)}
                                      className="text-gold-600 focus:ring-gold-500"
                                    />
                                    <div className="text-left">
                                      <p className="text-xs font-bold text-luxury-900">{courier.courier_name}</p>
                                      <div className="flex items-center gap-2 text-[10px] text-luxury-500 mt-0.5">
                                        <span className="text-amber-500 font-medium">★ {courier.rating || 'N/A'}</span>
                                        <span>•</span>
                                        <span>ETD: {courier.etd || 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs font-extrabold text-luxury-900">{formatINR(courier.rate)}</p>
                                </label>
                              ))}
                            </div>
                          )}

                          {availableCouriers.length > 0 && (
                            <button
                              onClick={handleBookShipment}
                              disabled={bookingInProgress || !selectedCourierId}
                              className="w-full py-2.5 rounded-xl bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {bookingInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                              Book Shipment & Generate AWB
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MANUAL INFO FALLBACK */
                    <div className="space-y-3">
                      <div className="p-3 bg-luxury-50 rounded-xl border border-luxury-100 text-xs text-luxury-600 text-center">
                        No tracking details configured. Enter tracking details manually below:
                      </div>
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
                        className="w-full py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {savingTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {savingTracking ? 'Saving…' : 'Save Tracking Info'}
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* ORDER ALREADY SYNCED WITH SHIPROCKET */
              <div className="space-y-4 text-left">
                {showTrackingForm ? (
                  /* EDITING FORM FOR MANUAL OVERRIDE (EVEN IF SHIPROCKET IS ACTIVE) */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-luxury-700 mb-1">Courier Name</label>
                        <input
                          value={trackingForm.courierName}
                          onChange={e => setTrackingForm(p => ({ ...p, courierName: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-luxury-700 mb-1">Tracking Number</label>
                        <input
                          value={trackingForm.trackingNumber}
                          onChange={e => setTrackingForm(p => ({ ...p, trackingNumber: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-luxury-700 mb-1">Tracking URL</label>
                        <input
                          value={trackingForm.trackingUrl}
                          onChange={e => setTrackingForm(p => ({ ...p, trackingUrl: e.target.value }))}
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
                      {savingTracking ? 'Saving…' : 'Save Override'}
                    </button>
                  </div>
                ) : (
                  /* RENDER SHIPROCKET LOGISTICS DETAILS */
                  <div>
                    <div className="p-3.5 bg-gold-50/20 border border-gold-200/50 rounded-xl flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold text-gold-800">Shiprocket Connected Shipment</span>
                      </div>
                      <span className="text-[10px] font-mono text-luxury-400">Order ID: {order.shiprocketOrderId}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InfoRow label="Courier Partner" value={order.courierName} />
                      <InfoRow label="AWB Tracking ID" value={order.awbNumber || order.trackingNumber} copy mono />
                      <InfoRow label="Shipment ID" value={order.shipmentId} copy mono />
                      <InfoRow label="Fulfillment Status" value={order.shipmentStatus?.toUpperCase()} />
                      <InfoRow label="Delivery Status" value={order.deliveryStatus?.toUpperCase()} />
                      <InfoRow label="Pickup Status" value={order.pickupStatus?.toUpperCase() || 'NOT SCHEDULED'} />
                      <InfoRow label="Estimated Delivery" value={eta.label} />
                    </div>

                    {/* Shiprocket Actions Panel */}
                    <div className="mt-5 pt-4 border-t border-luxury-100 space-y-3">
                      <p className="text-[10px] font-bold text-luxury-400 uppercase tracking-wider mb-2">Shipment Actions</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* 1. Schedule Pickup */}
                        <button
                          onClick={() => handleShipmentAction('schedule_pickup', order.shipmentId)}
                          disabled={shipmentActionLoading['schedule_pickup'] || order.pickupStatus === 'scheduled' || order.pickupStatus === 'picked_up'}
                          className="py-2 px-2.5 rounded-xl border border-luxury-200 text-xs font-semibold text-luxury-700 hover:bg-luxury-50 hover:border-luxury-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {shipmentActionLoading['schedule_pickup'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                          {order.pickupStatus === 'scheduled' ? 'Pickup Booked' : 'Book Pickup'}
                        </button>

                        {/* 2. Download Shipping Label */}
                        <button
                          onClick={() => handleShipmentAction('download_label', order.shipmentId)}
                          disabled={shipmentActionLoading['download_label'] || !order.awbNumber}
                          className="py-2 px-2.5 rounded-xl border border-luxury-200 text-xs font-semibold text-luxury-700 hover:bg-luxury-50 hover:border-luxury-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {shipmentActionLoading['download_label'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 text-blue-500" />}
                          Print Label
                        </button>

                        {/* 3. Download Invoice */}
                        <button
                          onClick={() => handleShipmentAction('download_invoice', order.shiprocketOrderId)}
                          disabled={shipmentActionLoading['download_invoice'] || !order.shiprocketOrderId}
                          className="py-2 px-2.5 rounded-xl border border-luxury-200 text-xs font-semibold text-luxury-700 hover:bg-luxury-50 hover:border-luxury-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {shipmentActionLoading['download_invoice'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 text-purple-500" />}
                          Print Invoice
                        </button>

                        {/* 4. Cancel Shipment */}
                        <button
                          onClick={() => handleShipmentAction('cancel_shipment', order.shiprocketOrderId)}
                          disabled={shipmentActionLoading['cancel_shipment'] || order.shipmentStatus === 'cancelled'}
                          className="py-2 px-2.5 rounded-xl border border-red-100 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {shipmentActionLoading['cancel_shipment'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                          Cancel Ship
                        </button>
                      </div>

                      {/* Live Tracking Link */}
                      {order.trackingUrl && (
                        <div className="pt-2 text-center">
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Carrier Public Tracking Page
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Detailed courier scans timeline */}
                    {order.shipmentHistory && order.shipmentHistory.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-luxury-100 space-y-3">
                        <p className="text-[10px] font-bold text-luxury-400 uppercase tracking-wider mb-2">Courier Scans History</p>
                        <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                          {[...(order.shipmentHistory || [])]
                            .sort((a, b) => {
                              const tA = safeToDate(a.timestamp || a.date)?.getTime() || 0;
                              const tB = safeToDate(b.timestamp || b.date)?.getTime() || 0;
                              return tB - tA;
                            })
                            .map((scan, idx, arr) => (
                              <div key={idx} className="flex gap-2 text-xs relative">
                                {idx < arr.length - 1 && (
                                  <div className="absolute left-[5px] top-4 bottom-[-12px] w-0.5 bg-luxury-100" />
                                )}
                                <div className="w-2.5 h-2.5 rounded-full bg-gold-500 border-2 border-white flex-shrink-0 z-10 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-luxury-800">{scan.activity || scan.status}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-luxury-400">
                                    {scan.location && <span>{scan.location}</span>}
                                    {scan.location && <span>•</span>}
                                    <span>{safeToDate(scan.timestamp || scan.date)?.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                <div className="space-y-3">
                  <InfoRow label="Refund Status" value={order.refundStatus?.toUpperCase()} />
                  <InfoRow label="Refund Amount" value={formatINR(order.refundAmount)} />
                  <InfoRow label="Reason" value={order.refundReason} />
                  <InfoRow label="Requested" value={formatOrderDate(order.refundRequestedAt)} />
                  <InfoRow label="Requested By" value={order.refundRequestedBy} />
                  
                  {order.refundStatus === 'requested' && (
                    <button
                      onClick={() => handleProcessRefund(order.refundAmount, order.refundReason)}
                      disabled={requestingRefund}
                      className="w-full mt-2 py-2 rounded-xl bg-teal-500 text-white font-bold text-sm hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${requestingRefund ? 'animate-spin' : ''}`} />
                      {requestingRefund ? 'Processing Refund...' : 'Process & Complete Refund'}
                    </button>
                  )}
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
                      {requestingRefund ? 'Processing Refund…' : 'Submit & Process Refund'}
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
            <InfoRow label="User ID" value={order.userId} mono copy />
          </Section>

          {/* Shipping Address */}
          <Section title="Shipping Address" icon={MapPin} iconColor="text-orange-500">
            <div className="text-sm text-luxury-700 leading-relaxed text-left space-y-1">
              {order.addressLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/50 mb-2">
                  {order.addressLabel}
                </span>
              )}
              <p className="font-bold text-luxury-900">{order.customerName || order.name}</p>
              <p className="text-xs text-luxury-500">{order.phone || order.mobile || order.customerPhone}</p>
              <p className="text-sm text-luxury-800">
                {order.address}
                {order.apartment && <span className="block">{order.apartment}</span>}
                {order.landmark && <span className="block text-xs text-luxury-500 font-normal">Landmark: {order.landmark}</span>}
                <span className="block">
                  {[order.city, order.state, order.country].filter(Boolean).join(', ')} - {order.pincode}
                </span>
              </p>
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
