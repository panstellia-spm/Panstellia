/**
 * AdminFulfillment.jsx — Live Fulfillment Operations Workspace
 *
 * Real-time overview of the entire fulfillment pipeline with:
 * - 8 operational KPI widgets
 * - Search & advanced multi-filters (SKU, Customer, VIP, Express, Delayed)
 * - Tabs: Overview, Kanban Board, Picking Queue, Packing Station, Audit Logs
 * - Interactive Shipping Details modal dialog
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAllOrders, updateOrderStatus, updateTrackingInfo } from '../../services/orderTracking';
import {
  STATUS_PIPELINE, normalizeStatus, detectDelay,
  isHighValueOrder, formatINR, formatINRCompact
} from '../../services/orderStatus';
import { StatusBadge } from '../../components/UI/OrderTimeline';
import {
  Package, Truck, CheckCircle2, XCircle, Clock,
  AlertTriangle, Star, TrendingUp, Zap, RefreshCw,
  DollarSign, ArrowRight, MapPin, Box, Hand, ShoppingBag,
  Search, Filter, ClipboardList, ShieldAlert, Kanban, Eye,
  ExternalLink, Calendar, Loader2, Activity
} from 'lucide-react';

import FulfillmentKanban from '../../components/admin/FulfillmentKanban';
import FulfillmentPicking from '../../components/admin/FulfillmentPicking';
import FulfillmentPacking from '../../components/admin/FulfillmentPacking';
import FulfillmentLogsView from '../../components/admin/FulfillmentLogsView';
import { toast } from 'react-toastify';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function FulfillmentKPI({ icon: Icon, bg, color, label, value, sub, alert, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border text-left transition-all hover:shadow-md ${
        alert ? 'border-red-200 bg-red-50/10' : 'border-luxury-100 hover:border-luxury-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-luxury-900">{value}</p>
      <p className="text-xs text-luxury-500 mt-0.5">{label}</p>
      {sub && <p className={`text-[10px] mt-1 ${alert ? 'text-red-500 font-semibold' : 'text-luxury-400'}`}>{sub}</p>}
    </button>
  );
}

function SLAHealthBar({ orders }) {
  const counts = useMemo(() => {
    let onTime = 0, atRisk = 0, breached = 0, completed = 0;
    orders.forEach(o => {
      const status = normalizeStatus(o.status);
      if (['delivered', 'cancelled', 'refunded'].includes(status)) { completed++; return; }
      const delay = detectDelay(o);
      if (!delay.isDelayed) onTime++;
      else if (delay.severity === 'warning') atRisk++;
      else breached++;
    });
    return { onTime, atRisk, breached, completed, total: orders.length };
  }, [orders]);

  const { onTime, atRisk, breached, total } = counts;
  const pctOnTime = total > 0 ? Math.round((onTime / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-luxury-900">SLA Health Overview</h2>
        <span className={`text-lg font-bold ${pctOnTime >= 80 ? 'text-green-600' : pctOnTime >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
          {pctOnTime}% On Time
        </span>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <div className="h-full bg-green-400 transition-all" style={{ width: `${total > 0 ? (onTime / total) * 100 : 0}%` }} title={`On Time: ${onTime}`} />
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${total > 0 ? (atRisk / total) * 100 : 0}%` }} title={`At Risk: ${atRisk}`} />
        <div className="h-full bg-red-400 transition-all" style={{ width: `${total > 0 ? (breached / total) * 100 : 0}%` }} title={`Breached: ${breached}`} />
      </div>

      <div className="flex justify-between mt-3 text-xs">
        <span className="flex items-center gap-1.5 text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          On Time ({onTime})
        </span>
        <span className="flex items-center gap-1.5 text-amber-600">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          At Risk ({atRisk})
        </span>
        <span className="flex items-center gap-1.5 text-red-600">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          Breached ({breached})
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminFulfillment() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterDelay, setFilterDelay] = useState(false);
  const [filterHighValue, setFilterHighValue] = useState(false);

  // Kanban interaction state
  const [selectedPackingOrder, setSelectedPackingOrder] = useState(null);
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [shippingCourier, setShippingCourier] = useState('BlueDart');
  const [customCourier, setCustomCourier] = useState('');
  const [shippingTracking, setShippingTracking] = useState('');
  const [shippingEta, setShippingEta] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);

  if (!isAdmin) return null;

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Search Query (ID, Customer Name, SKU, Product Name, Tracking Number)
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        order.id?.toLowerCase().includes(q) ||
        (order.customerName || order.name || '').toLowerCase().includes(q) ||
        (order.trackingNumber || '').toLowerCase().includes(q) ||
        (order.items || []).some(item =>
          item.name?.toLowerCase().includes(q) ||
          item.id?.toLowerCase().includes(q)
        );

      // 2. Priority Filter
      const matchPriority = filterPriority === 'All' || order.priority === filterPriority;

      // 3. Delay Filter
      const delay = detectDelay(order);
      const matchDelay = !filterDelay || delay.isDelayed;

      // 4. High Value Filter
      const matchHV = !filterHighValue || isHighValueOrder(order);

      return matchQuery && matchPriority && matchDelay && matchHV;
    });
  }, [orders, searchQuery, filterPriority, filterDelay, filterHighValue]);

  // Compute operational dashboard metrics from filtered list
  const metrics = useMemo(() => {
    const byStatus = {
      processing: 0,
      picked: 0,
      packed: 0,
      shipped: 0,
      'out of delivery': 0,
      delivered: 0,
    };

    let awaitingProcessing = 0; // status = processing
    let readyToPack = 0;        // status = picked
    let packedCount = 0;        // status = packed (and no tracking)
    let readyToShip = 0;        // status = packed (has tracking but not shipped)
    let delayedCount = 0;
    let highValueCount = 0;
    let highPriorityCount = 0;
    const attentionList = [];

    orders.forEach(o => {
      const status = normalizeStatus(o.status);
      if (byStatus[status] !== undefined) byStatus[status]++;

      if (status === 'processing') awaitingProcessing++;
      if (status === 'picked') readyToPack++;
      if (status === 'packed') {
        if (o.trackingNumber) readyToShip++;
        else packedCount++;
      }

      const delay = detectDelay(o);
      if (delay.isDelayed) {
        delayedCount++;
        attentionList.push({ ...o, delay });
      }

      if (isHighValueOrder(o)) highValueCount++;
      if (['vip', 'urgent', 'express'].includes(o.priority)) highPriorityCount++;
    });

    attentionList.sort((a, b) => (b.delay?.hours || 0) - (a.delay?.hours || 0));

    return {
      awaitingProcessing,
      readyToPack,
      packedCount,
      readyToShip,
      delayedCount,
      highValueCount,
      highPriorityCount,
      attentionCount: attentionList.length,
      attentionList: attentionList.slice(0, 5),
    };
  }, [orders]);

  const handlePackingSelectionFromKanban = (order) => {
    setSelectedPackingOrder(order);
    setActiveTab('packing');
  };

  const handleShippingSelectionFromKanban = (order) => {
    setShippingModalOrder(order);
    setShippingTracking('');
    setShippingCourier('BlueDart');
    setCustomCourier('');
    // default ETA 5 days out
    const defaultEta = new Date();
    defaultEta.setDate(defaultEta.getDate() + 5);
    setShippingEta(defaultEta.toISOString().split('T')[0]);
  };

  const handleSaveShippingDetails = async () => {
    if (!shippingModalOrder) return;
    if (!shippingTracking.trim()) {
      toast.warning('Please enter a tracking number.');
      return;
    }

    const courier = shippingCourier === 'Custom' ? customCourier : shippingCourier;
    if (!courier.trim()) {
      toast.warning('Please enter a courier name.');
      return;
    }

    setSavingShipment(true);
    try {
      // 1. Save shipping & tracking info
      await updateTrackingInfo(shippingModalOrder.id, {
        trackingNumber: shippingTracking.trim(),
        courierName: courier,
        estimatedDelivery: shippingEta,
        trackingUrl: `https://track.courier.com/${shippingTracking.trim()}`,
      }, user);

      // 2. Transition status to Shipped
      await updateOrderStatus(shippingModalOrder.id, 'shipped', user, `Courier: ${courier} | Tracking: ${shippingTracking.trim()}`);

      toast.success(`Shipment records generated and order #${shippingModalOrder.id.slice(-8).toUpperCase()} marked as shipped.`);
      setShippingModalOrder(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update shipping info');
    } finally {
      setSavingShipment(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-luxury-100 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-luxury-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-gold-550 animate-pulse" />
            Fulfillment Center
          </h1>
          <p className="text-xs text-luxury-500 mt-1">
            Enterprise jewelry picking, packing, shipping and real-time SLA pipeline dashboard
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-250 text-xs font-semibold text-emerald-700 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Connected
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-150 p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, Customer, SKU, Tracking..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-luxury-200 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 bg-luxury-50/20 transition-all"
          />
        </div>

        {/* Multi-Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-luxury-500">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-luxury-50 border border-luxury-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-gold-500"
            >
              <option value="All">All Priority</option>
              <option value="normal">Normal</option>
              <option value="express">Express</option>
              <option value="vip">VIP</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Toggle Delayed */}
          <button
            onClick={() => setFilterDelay(!filterDelay)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
              filterDelay
                ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                : 'bg-white border-luxury-200 text-luxury-600 hover:bg-luxury-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Delayed
          </button>

          {/* Toggle High Value */}
          <button
            onClick={() => setFilterHighValue(!filterHighValue)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
              filterHighValue
                ? 'bg-amber-50 text-amber-700 border-amber-250 shadow-sm'
                : 'bg-white border-luxury-200 text-luxury-600 hover:bg-luxury-50'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            High Value (≥₹50k)
          </button>

          {/* Clear filters */}
          {(searchQuery || filterPriority !== 'All' || filterDelay || filterHighValue) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterPriority('All');
                setFilterDelay(false);
                setFilterHighValue(false);
              }}
              className="text-xs font-bold text-gold-650 hover:text-gold-700 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-luxury-200 gap-1 overflow-x-auto scrollbar-hide pb-0.5">
        {[
          { id: 'overview', label: 'Overview Dashboard', icon: ClipboardList },
          { id: 'kanban', label: 'Order Fulfillment Operations', icon: Kanban },
          { id: 'picking', label: 'Picking Queue', icon: Hand },
          { id: 'packing', label: 'Packing Station', icon: Box },
          { id: 'logs', label: 'Fulfillment Logs', icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'packing') setSelectedPackingOrder(null);
            }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-gold-500 text-gold-650'
                : 'border-transparent text-luxury-500 hover:text-luxury-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render active workspace view */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-luxury-500">
          <Loader2 className="w-8 h-8 text-gold-550 animate-spin" />
          <p className="text-xs font-semibold">Loading real-time order records...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 8-KPI Dashboard widgets grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FulfillmentKPI icon={Clock} bg="bg-blue-50" color="text-blue-600" label="Awaiting Processing" value={metrics.awaitingProcessing} onClick={() => setActiveTab('picking')} />
                <FulfillmentKPI icon={Hand} bg="bg-yellow-50" color="text-yellow-600" label="Ready to Pack" value={metrics.readyToPack} onClick={() => setActiveTab('packing')} />
                <FulfillmentKPI icon={Box} bg="bg-indigo-50" color="text-indigo-600" label="Orders Packed" value={metrics.packedCount} onClick={() => setActiveTab('kanban')} />
                <FulfillmentKPI icon={Truck} bg="bg-purple-50" color="text-purple-600" label="Ready to Ship" value={metrics.readyToShip} onClick={() => setActiveTab('kanban')} />
                <FulfillmentKPI icon={AlertTriangle} bg="bg-red-50" color="text-red-650" label="Delayed Orders" value={metrics.delayedCount} alert={metrics.delayedCount > 0} onClick={() => navigate('/admin/delayed')} />
                <FulfillmentKPI icon={Star} bg="bg-amber-50" color="text-amber-600" label="High Priority Queue" value={metrics.highPriorityCount} onClick={() => setActiveTab('kanban')} />
                <FulfillmentKPI icon={TrendingUp} bg="bg-emerald-50" color="text-emerald-600" label="High Value Orders" value={metrics.highValueCount} onClick={() => setActiveTab('picking')} />
                <FulfillmentKPI icon={ShieldAlert} bg="bg-red-50" color="text-red-500" label="Requires Attention" value={metrics.attentionCount} alert={metrics.attentionCount > 0} onClick={() => setActiveTab('kanban')} />
              </div>

              {/* SLA Health + Urgent Attention Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <SLAHealthBar orders={orders} />
                </div>
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-luxury-900">Requires Immediate Attention</h3>
                    <p className="text-xs text-luxury-500 mt-0.5">Orders that have breached SLA targets</p>
                  </div>

                  {metrics.attentionList.length === 0 ? (
                    <div className="py-12 text-center text-luxury-400">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold">All orders are within SLA targets!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {metrics.attentionList.map(order => (
                        <button
                          key={order.id}
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            order.delay?.severity === 'critical'
                              ? 'border-red-200 bg-red-55/10 hover:border-red-300'
                              : 'border-amber-250 bg-amber-50/10 hover:border-amber-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-luxury-900 font-mono">
                                #{order.id?.slice(-8).toUpperCase()}
                              </span>
                              <StatusBadge status={order.status} />
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                order.delay?.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                {order.delay?.label} ({order.delay?.hours}h)
                              </span>
                            </div>
                            <p className="text-xs text-luxury-500 mt-1">
                              Customer: {order.customerName || order.name} · Total: {formatINR(order.total)}
                            </p>
                          </div>
                          <Eye className="w-4 h-4 text-luxury-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <FulfillmentKanban
              orders={filteredOrders}
              onPackingSelect={handlePackingSelectionFromKanban}
              onShippingSelect={handleShippingSelectionFromKanban}
            />
          )}

          {activeTab === 'picking' && (
            <FulfillmentPicking orders={filteredOrders} />
          )}

          {activeTab === 'packing' && (
            <FulfillmentPacking
              orders={orders}
              selectedOrderFromKanban={selectedPackingOrder}
              onClearSelection={() => setSelectedPackingOrder(null)}
            />
          )}

          {activeTab === 'logs' && (
            <FulfillmentLogsView />
          )}
        </div>
      )}

      {/* Shipping details dialog modal (Phase 7) */}
      {shippingModalOrder && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-luxury-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-luxury-50 border-b border-luxury-100 flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-luxury-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gold-600" />
                Dispatch & Shipping records
              </h3>
              <button
                onClick={() => setShippingModalOrder(null)}
                className="text-luxury-400 hover:text-luxury-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-luxury-600 bg-luxury-50 p-3 rounded-lg flex justify-between">
                <span><strong>Order Reference:</strong></span>
                <span className="font-mono font-bold text-luxury-800">
                  #{shippingModalOrder.id?.slice(-8).toUpperCase()}
                </span>
              </div>

              {/* Courier Partner Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-luxury-450 uppercase tracking-wider block">
                  Courier Partner
                </label>
                <select
                  value={shippingCourier}
                  onChange={(e) => setShippingCourier(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-luxury-200 focus:outline-none focus:border-gold-500 bg-white"
                >
                  <option value="BlueDart">BlueDart (Priority Air)</option>
                  <option value="FedEx">FedEx (Luxury Express)</option>
                  <option value="DHL">DHL (International Express)</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Custom">Custom Courier Partner</option>
                </select>
              </div>

              {shippingCourier === 'Custom' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-luxury-450 uppercase tracking-wider block">
                    Courier Partner Name
                  </label>
                  <input
                    type="text"
                    value={customCourier}
                    onChange={(e) => setCustomCourier(e.target.value)}
                    placeholder="Enter Custom Courier Name"
                    className="w-full text-xs p-2.5 rounded-xl border border-luxury-200 focus:outline-none"
                  />
                </div>
              )}

              {/* Tracking Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-luxury-450 uppercase tracking-wider block">
                  Tracking / AWB Number
                </label>
                <input
                  type="text"
                  value={shippingTracking}
                  onChange={(e) => setShippingTracking(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full text-xs p-2.5 rounded-xl border border-luxury-200 focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* Estimated Delivery Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-luxury-450 uppercase tracking-wider block">
                  Expected Delivery Date (ETA)
                </label>
                <input
                  type="date"
                  value={shippingEta}
                  onChange={(e) => setShippingEta(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-luxury-200 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-luxury-50/50 border-t border-luxury-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShippingModalOrder(null)}
                disabled={savingShipment}
                className="px-4 py-2 rounded-xl border border-luxury-200 text-xs font-semibold text-luxury-600 hover:bg-luxury-100"
              >
                Close
              </button>
              <button
                onClick={handleSaveShippingDetails}
                disabled={savingShipment}
                className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                {savingShipment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
