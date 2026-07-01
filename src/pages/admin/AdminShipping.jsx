/**
 * AdminShipping.jsx — Shiprocket Logistics & Shipping Management Center
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Package, CheckCircle2, ExternalLink, Edit3,
  Loader2, Search, Download, Box, Settings, MapPin,
  RefreshCw, FileText, ClipboardList, AlertCircle, X, ShieldAlert, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAllOrders, updateTrackingInfo, updateOrderStatus, exportOrdersCSV } from '../../services/orderTracking';
import { normalizeStatus, formatINR } from '../../services/orderStatus';
import { StatusBadge } from '../../components/UI/OrderTimeline';
import { toast } from 'react-toastify';
import shiprocketService from '../../services/shiprocket';

const COURIER_OPTIONS = [
  'BlueDart', 'DTDC', 'Delhivery', 'FedEx', 'DHL',
  'Ekart', 'XpressBees', 'Shadowfax', 'Ecom Express', 'Other',
];

export default function AdminShipping() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  // Primary navigation tabs
  const [activeTab, setActiveTab] = useState('pending'); // pending, active_shipments, locations, logs, settings

  // Database order state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Editing state for manual shipping fallback
  const [editingId, setEditingId] = useState(null);

  // Shiprocket states
  const [shiprocketConfig, setShiprocketConfig] = useState({
    enabled: false,
    autoAwbEnabled: false,
    defaultPickupLocation: 'Primary',
    pickupPincode: '560001',
    defaultWeight: 0.1,
    defaultLength: 10,
    defaultBreadth: 10,
    defaultHeight: 5
  });
  const [pickupLocations, setPickupLocations] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Diagnostics logs
  const [logs, setLogs] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsLimit, setLogsLimit] = useState(50);

  // Courier Drawer/Modal state for booking shipment
  const [bookingOrder, setBookingOrder] = useState(null);
  const [fetchingCouriers, setFetchingCouriers] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [courierError, setCourierError] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Individual shipment action loading indicators
  const [actionLoading, setActionLoading] = useState({});

  if (!isAdmin) return null;

  // 1. Subscribe to order collection (realtime)
  useEffect(() => {
    setLoadingOrders(true);
    const unsub = subscribeToAllOrders((data) => {
      // Packed + Shipped + Out of Delivery + Processing orders are relevant to shipping operations
      setOrders(data.filter(o => ['processing', 'packed', 'shipped', 'out of delivery'].includes(normalizeStatus(o.status))));
      setLoadingOrders(false);
    });
    return unsub;
  }, []);

  // 2. Load Shiprocket Config & Locations
  const loadShiprocketData = async () => {
    setLoadingConfig(true);
    try {
      const token = await user.getIdToken();
      const res = await shiprocketService.getShiprocketConfig(token);
      
      let config = res.config || {
        enabled: false,
        autoAwbEnabled: false,
        defaultPickupLocation: 'PANSTELLIA',
        pickupPincode: '607303',
        defaultWeight: 0.1,
        defaultLength: 10,
        defaultBreadth: 10,
        defaultHeight: 5
      };

      const locations = res.pickupLocations || [];
      setPickupLocations(locations);

      // Secure UI display: if default pickup location in config is 'Primary' or not in Shiprocket's list,
      // resolve it dynamically to the first location from Shiprocket
      if (locations.length > 0) {
        const savedLoc = config.defaultPickupLocation;
        const exists = locations.some(l => l.pickup_location === savedLoc);
        if (!exists || savedLoc === 'Primary') {
          const firstLoc = locations[0];
          config = {
            ...config,
            defaultPickupLocation: firstLoc.pickup_location,
            pickupPincode: firstLoc.pincode
          };
        }
      }
      
      setShiprocketConfig(config);
    } catch (err) {
      console.error('Failed to load Shiprocket configs:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadShiprocketData();
    }
  }, [user]);

  // 3. Load Diagnostics Logs
  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = await user.getIdToken();
      const res = await shiprocketService.getShiprocketLogs(logsLimit, token);
      setLogs(res.logs || []);
      setWebhooks(res.webhooks || []);
    } catch (err) {
      console.error('Failed to fetch Shiprocket diagnostics logs:', err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs' && user) {
      loadLogs();
    }
  }, [activeTab, logsLimit, user]);

  // 4. Save Shiprocket Config
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const token = await user.getIdToken();
      const res = await shiprocketService.saveShiprocketConfig(shiprocketConfig, token);
      if (res.success) {
        toast.success('Shiprocket configuration saved successfully!');
        setShiprocketConfig(res.config);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      toast.error('Failed to save configuration: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // 5. Open courier booking drawer
  const handleOpenBooking = async (order) => {
    setBookingOrder(order);
    setFetchingCouriers(true);
    setCourierError('');
    setAvailableCouriers([]);
    
    try {
      const token = await user.getIdToken();
      const totalWeight = (order.items || []).reduce((acc, item) => acc + (Number(item.quantity || 1) * 0.1), 0);
      const isCod = order.paymentMethod?.toLowerCase() === 'cod';

      console.log(`[AdminShipping] Checking serviceability for order: ${order.id}, pincode: ${order.pincode}`);
      const res = await shiprocketService.checkServiceability(order.pincode, totalWeight, isCod, token);
      
      if (res.deliverable && res.couriers) {
        setAvailableCouriers(res.couriers);
      } else {
        setCourierError(res.error || 'No serviceable couriers found for this pincode.');
      }
    } catch (err) {
      console.error('Failed to fetch couriers:', err);
      setCourierError(err.message || 'Serviceability check failed.');
    } finally {
      setFetchingCouriers(false);
    }
  };

  // 6. Book shipment & Assign Courier AWB
  const handleBookShipment = async (courierId) => {
    if (!bookingOrder) return;
    setBookingInProgress(true);
    
    try {
      const token = await user.getIdToken();
      
      // Step 1: Create adhoc order in Shiprocket
      toast.info('Syncing order with Shiprocket...', { autoClose: 2000 });
      const createRes = await shiprocketService.createShiprocketOrder(bookingOrder.id, null, token);
      
      if (createRes.success && createRes.shipmentId) {
        // Step 2: Assign chosen Courier ID
        toast.info('Booking courier & assigning AWB...', { autoClose: 2000 });
        const awbRes = await shiprocketService.assignAWB(bookingOrder.id, createRes.shipmentId, courierId, token);
        
        if (awbRes.success) {
          // Step 3: Advance order status to 'packed' in Firestore (if currently processing)
          if (normalizeStatus(bookingOrder.status) === 'processing') {
            await updateOrderStatus(bookingOrder.id, 'packed', user, `Order synced to Shiprocket. Courier: ${awbRes.courier}, AWB: ${awbRes.awb}`);
          }
          
          toast.success(`Shipment created successfully! AWB: ${awbRes.awb} assigned.`);
          setBookingOrder(null);
        }
      }
    } catch (err) {
      console.error('Booking failed:', err);
      toast.error('Logistics booking failed: ' + err.message);
    } finally {
      setBookingInProgress(false);
    }
  };

  // 7. Generic shipment action handlers (Schedule pickup, labels, invoices, cancellation)
  const handleShipmentAction = async (action, orderId, paramId) => {
    setActionLoading(prev => ({ ...prev, [`${orderId}-${action}`]: true }));
    try {
      const token = await user.getIdToken();
      
      if (action === 'schedule_pickup') {
        const res = await shiprocketService.schedulePickup(orderId, paramId, token);
        if (res.success) {
          toast.success('Courier pickup scheduled successfully!');
        }
      } 
      else if (action === 'download_label') {
        const res = await shiprocketService.generateLabel(paramId, token);
        if (res.success && res.labelUrl) {
          window.open(res.labelUrl, '_blank');
          toast.success('Label downloaded successfully');
        }
      } 
      else if (action === 'download_invoice') {
        const res = await shiprocketService.generateInvoice(paramId, token);
        if (res.success && res.invoiceUrl) {
          window.open(res.invoiceUrl, '_blank');
          toast.success('Invoice downloaded successfully');
        }
      } 
      else if (action === 'cancel_shipment') {
        if (window.confirm('Are you sure you want to cancel this Shiprocket shipment? This action cannot be undone.')) {
          const res = await shiprocketService.cancelShipment(orderId, paramId, token);
          if (res.success) {
            toast.success('Shipment cancelled successfully.');
          }
        }
      }
    } catch (err) {
      console.error(`Shipment action ${action} failed:`, err);
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${orderId}-${action}`]: false }));
    }
  };

  // Filter lists based on search
  const filteredPending = useMemo(() => {
    return orders.filter(o => {
      // Ready to ship = order is 'processing' or 'packed', and doesn't have Shiprocket ID yet
      const status = normalizeStatus(o.status);
      const isPending = ['processing', 'packed'].includes(status) && !o.shiprocketOrderId;
      if (!isPending) return false;

      if (search) {
        const hay = [o.id, o.customerName, o.phone, o.city].join(' ').toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, search]);

  const filteredActive = useMemo(() => {
    return orders.filter(o => {
      // Active Shiprocket = has Shiprocket order ID
      const hasShiprocket = !!o.shiprocketOrderId;
      if (!hasShiprocket) return false;

      if (statusFilter !== 'All' && normalizeStatus(o.status) !== statusFilter) return false;

      if (search) {
        const hay = [o.id, o.customerName, o.awbNumber, o.courierName, o.city].join(' ').toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-6 max-w-[1350px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-2xl border border-luxury-100 shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-bold text-luxury-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-gold-600 animate-pulse" />
            Logistics & Shipping Center
          </h1>
          <p className="text-xs text-luxury-500 mt-1">
            Manage your Shiprocket integrations, track active shipments, schedule pickups, print labels, and audit execution logs.
          </p>
        </div>

        {/* Global toggler state */}
        <div className="flex items-center gap-2 bg-luxury-50 px-4 py-2.5 rounded-xl border border-luxury-200">
          <span className="text-xs font-bold text-luxury-700 uppercase tracking-wider">Shiprocket Status:</span>
          {shiprocketConfig.enabled ? (
            <span className="flex items-center gap-1 text-[10px] bg-green-150 text-green-700 px-2.5 py-1 rounded-full font-bold uppercase border border-green-200">
              <Check className="w-3 h-3" /> Enabled
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold uppercase border border-red-200">
              <AlertCircle className="w-3 h-3" /> Disabled
            </span>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-luxury-200 bg-white p-1 rounded-xl shadow-sm max-w-2xl flex-wrap gap-1">
        {[
          { key: 'pending', label: 'Ready to Ship', icon: Package, badge: filteredPending.length },
          { key: 'active_shipments', label: 'Active Shipments', icon: Truck, badge: filteredActive.length },
          { key: 'locations', label: 'Pickup Locations', icon: MapPin },
          { key: 'logs', label: 'Diagnostics Logs', icon: ClipboardList },
          { key: 'settings', label: 'Logistics Config', icon: Settings },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === t.key
                ? 'bg-gold-500 text-white shadow-sm'
                : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === t.key ? 'bg-white text-gold-600' : 'bg-luxury-100 text-luxury-600'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 1: READY TO SHIP (PENDING SYNC)
          ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-luxury-100 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search pending orders by ID, name, city..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <button
              onClick={() => exportOrdersCSV(filteredPending, 'ready-to-ship-orders')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-colors bg-white"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-luxury-100 shadow-sm overflow-hidden">
            {loadingOrders ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="py-16 text-center">
                <Box className="w-12 h-12 text-luxury-300 mx-auto mb-3" />
                <p className="font-semibold text-luxury-700">No orders ready to ship</p>
                <p className="text-xs text-luxury-400 mt-1">Fulfillments are up to date.</p>
              </div>
            ) : (
              <div className="divide-y divide-luxury-50">
                {filteredPending.map(order => {
                  const isEditing = editingId === order.id;
                  return (
                    <div key={order.id} className="p-5 hover:bg-luxury-50/20 transition-all">
                      <div className="flex items-start gap-4 flex-wrap justify-between">
                        {/* Order Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                              onClick={() => navigate(`/admin/orders/${order.id}`)}
                              className="text-sm font-bold text-luxury-900 font-mono hover:text-gold-600 transition-colors"
                            >
                              #{order.id?.slice(-8).toUpperCase()}
                            </button>
                            <StatusBadge status={order.status} />
                            <span className="text-[10px] bg-luxury-100 text-luxury-700 px-2 py-0.5 rounded-full font-bold uppercase border border-luxury-250">
                              {order.paymentMethod || 'Prepaid'}
                            </span>
                          </div>
                          
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-luxury-600">
                            <div><span className="text-luxury-400">Customer:</span> {order.customerName || order.name || '—'}</div>
                            <div><span className="text-luxury-400">Destination:</span> {order.city || '—'}, {order.pincode || '—'}</div>
                            <div><span className="text-luxury-400">Items:</span> {(order.items || []).reduce((acc, i) => acc + i.quantity, 0)} Pcs</div>
                            <div><span className="text-luxury-400">Total:</span> {formatINR(order.total)}</div>
                          </div>

                          {/* Fallback Manual form inline */}
                          {isEditing && (
                            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                              <p className="text-[11px] font-bold text-blue-700">Manual Logistics Fallback Form</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-luxury-700 mb-1">Courier</label>
                                  <select
                                    id={`manual-courier-${order.id}`}
                                    defaultValue={order.courierName || ''}
                                    className="w-full px-3 py-1.5 text-sm border border-luxury-200 rounded-lg bg-white focus:outline-none"
                                  >
                                    <option value="">Select courier…</option>
                                    {COURIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-luxury-700 mb-1">Tracking Number (AWB)</label>
                                  <input
                                    id={`manual-awb-${order.id}`}
                                    defaultValue={order.trackingNumber || ''}
                                    placeholder="AWB / Tracking ID"
                                    className="w-full px-3 py-1.5 text-sm border border-luxury-200 rounded-lg focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const courierName = document.getElementById(`manual-courier-${order.id}`).value;
                                    const trackingNumber = document.getElementById(`manual-awb-${order.id}`).value;
                                    if (!courierName || !trackingNumber) {
                                      toast.warn('Please fill in courier and tracking AWB number');
                                      return;
                                    }
                                    try {
                                      await updateTrackingInfo(order.id, { courierName, trackingNumber, trackingUrl: `https://shiprocket.co/tracking/${trackingNumber}` }, user);
                                      await updateOrderStatus(order.id, 'shipped', user, 'Manually entered tracking credentials.');
                                      toast.success('Manual tracking saved.');
                                      setEditingId(null);
                                    } catch (e) {
                                      toast.error('Failed to save manual tracking info');
                                    }
                                  }}
                                  className="flex-1 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
                                >
                                  Save & Mark Shipped
                                </button>
                                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg border border-luxury-200 text-xs text-luxury-600 hover:bg-luxury-50 bg-white">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Booking actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {shiprocketConfig.enabled ? (
                            <button
                              onClick={() => handleOpenBooking(order)}
                              className="px-4 py-2 rounded-xl bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <Truck className="w-3.5 h-3.5" /> Book Shiprocket
                            </button>
                          ) : (
                            <span className="text-[10px] text-luxury-400 font-bold bg-luxury-100 px-2.5 py-1.5 rounded-xl border border-luxury-200 select-none">
                              Shiprocket Disabled
                            </span>
                          )}
                          <button
                            onClick={() => setEditingId(isEditing ? null : order.id)}
                            className="px-3 py-2 rounded-xl border border-luxury-200 text-xs font-bold text-luxury-600 hover:bg-luxury-50 transition-colors bg-white"
                          >
                            Manual Ship
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 2: ACTIVE SHIPMENTS
          ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'active_shipments' && (
        <div className="space-y-4">
          {/* Filters card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-luxury-100 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search active shipments by AWB, courier, name..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-luxury-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-luxury-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option value="All">All statuses</option>
              <option value="packed">Ready to Ship (Packed)</option>
              <option value="shipped">Shipped (In Transit)</option>
              <option value="out of delivery">Out for Delivery</option>
            </select>
          </div>

          {/* Active Shipments grid */}
          <div className="bg-white rounded-2xl border border-luxury-100 shadow-sm overflow-hidden">
            {loadingOrders ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
              </div>
            ) : filteredActive.length === 0 ? (
              <div className="py-16 text-center">
                <Truck className="w-12 h-12 text-luxury-300 mx-auto mb-3" />
                <p className="font-semibold text-luxury-700">No active shipments found</p>
                <p className="text-xs text-luxury-400 mt-1">Book some shipments to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-luxury-50">
                {filteredActive.map(order => {
                  const shipmentId = order.shipmentId;
                  const srOrderId = order.shiprocketOrderId;

                  return (
                    <div key={order.id} className="p-5 hover:bg-luxury-50/20 transition-all">
                      <div className="flex items-start gap-4 flex-wrap justify-between">
                        {/* Shipment Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                              onClick={() => navigate(`/admin/orders/${order.id}`)}
                              className="text-sm font-bold text-luxury-900 font-mono hover:text-gold-600 transition-colors"
                            >
                              #{order.id?.slice(-8).toUpperCase()}
                            </button>
                            <StatusBadge status={order.status} />
                            
                            {order.awbNumber ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                                <Truck className="w-3 h-3" />
                                {order.courierName} — {order.awbNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-250">
                                AWB Assignment Pending
                              </span>
                            )}
                          </div>

                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-luxury-600">
                            <div><span className="text-luxury-400">Customer:</span> {order.customerName || '—'}</div>
                            <div><span className="text-luxury-400">Est. Delivery:</span> {order.estimatedDelivery || 'Pending Webhook'}</div>
                            <div><span className="text-luxury-400">Shipment ID:</span> {shipmentId || '—'}</div>
                            <div><span className="text-luxury-400">Shiprocket ID:</span> {srOrderId || '—'}</div>
                          </div>

                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-2 hover:underline"
                            >
                              Track Live Shipment <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Shipment Operations Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 1. Assign AWB (if missing) */}
                          {!order.awbNumber && (
                            <button
                              onClick={() => handleShipmentAction('assign_awb', order.id, shipmentId)}
                              disabled={actionLoading[`${order.id}-assign_awb`]}
                              className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-xs font-bold hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading[`${order.id}-assign_awb`] && <Loader2 className="w-3 h-3 animate-spin" />}
                              Assign AWB
                            </button>
                          )}

                          {/* 2. Schedule Pickup */}
                          {order.awbNumber && order.pickupStatus !== 'scheduled' && (
                            <button
                              onClick={() => handleShipmentAction('schedule_pickup', order.id, shipmentId)}
                              disabled={actionLoading[`${order.id}-schedule_pickup`]}
                              className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading[`${order.id}-schedule_pickup`] && <Loader2 className="w-3 h-3 animate-spin" />}
                              Schedule Pickup
                            </button>
                          )}

                          {/* 3. Print Label */}
                          {order.awbNumber && (
                            <button
                              onClick={() => handleShipmentAction('download_label', order.id, shipmentId)}
                              disabled={actionLoading[`${order.id}-download_label`]}
                              className="px-3 py-1.5 rounded-lg border border-luxury-200 text-xs font-bold text-luxury-600 hover:bg-luxury-50 bg-white disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading[`${order.id}-download_label`] && <Loader2 className="w-3 h-3 animate-spin" />}
                              <FileText className="w-3.5 h-3.5" /> Label
                            </button>
                          )}

                          {/* 4. Print Invoice */}
                          {srOrderId && (
                            <button
                              onClick={() => handleShipmentAction('download_invoice', order.id, srOrderId)}
                              disabled={actionLoading[`${order.id}-download_invoice`]}
                              className="px-3 py-1.5 rounded-lg border border-luxury-200 text-xs font-bold text-luxury-600 hover:bg-luxury-50 bg-white disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading[`${order.id}-download_invoice`] && <Loader2 className="w-3 h-3 animate-spin" />}
                              <Download className="w-3.5 h-3.5" /> Invoice
                            </button>
                          )}

                          {/* 5. Cancel Shipment */}
                          {srOrderId && normalizeStatus(order.status) !== 'delivered' && (
                            <button
                              onClick={() => handleShipmentAction('cancel_shipment', order.id, srOrderId)}
                              disabled={actionLoading[`${order.id}-cancel_shipment`]}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-650 hover:bg-red-50 bg-white disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading[`${order.id}-cancel_shipment`] && <Loader2 className="w-3.5 h-3 animate-spin" />}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 3: PICKUP LOCATIONS
          ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'locations' && (
        <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-luxury-100 pb-3 flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-luxury-900">Shiprocket Registered Pickup Locations</h3>
              <p className="text-xs text-luxury-500 mt-1">Locations fetched from your active Shiprocket account settings.</p>
            </div>
            <button
              onClick={loadShiprocketData}
              disabled={loadingConfig}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-luxury-200 text-xs text-luxury-650 bg-white hover:bg-luxury-50 font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loadingConfig ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          ) : pickupLocations.length === 0 ? (
            <div className="py-12 text-center text-luxury-500 text-sm">
              <MapPin className="w-10 h-10 text-luxury-300 mx-auto mb-2" />
              No pickup locations found. Add one in your Shiprocket Panel.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pickupLocations.map(loc => (
                <div
                  key={loc.id}
                  className={`p-5 rounded-2xl border-2 bg-white transition-all relative ${
                    shiprocketConfig.defaultPickupLocation === loc.pickup_location
                      ? 'border-gold-500 shadow-sm'
                      : 'border-luxury-100'
                  }`}
                >
                  {shiprocketConfig.defaultPickupLocation === loc.pickup_location && (
                    <span className="absolute top-4 right-4 bg-gold-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      Default Pickup
                    </span>
                  )}
                  <h4 className="font-bold text-sm text-luxury-900 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gold-500" />
                    {loc.pickup_location}
                  </h4>
                  <p className="text-xs text-luxury-600 mt-2 leading-relaxed">{loc.address}</p>
                  <div className="mt-3 pt-3 border-t border-luxury-50 flex justify-between text-xs text-luxury-500">
                    <span>Pincode: <strong className="text-luxury-705 font-bold">{loc.pincode}</strong></span>
                    <span>Phone: <strong>{loc.phone}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 4: DIAGNOSTICS & AUDIT LOGS
          ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Logs tab header */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-luxury-100 pb-3 flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-luxury-900">Shiprocket Integration Audit Trails</h3>
                <p className="text-xs text-luxury-500 mt-1">Real-time API requests and incoming webhook triggers audit log.</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={logsLimit}
                  onChange={e => setLogsLimit(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-luxury-200 rounded-lg bg-white"
                >
                  <option value="20">Show 20</option>
                  <option value="50">Show 50</option>
                  <option value="100">Show 100</option>
                </select>
                <button
                  onClick={loadLogs}
                  disabled={loadingLogs}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-luxury-200 text-xs text-luxury-650 bg-white hover:bg-luxury-50 font-bold"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} /> Sync Logs
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Shiprocket API Audit Logs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-luxury-600 tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-gold-500" /> API Execution Logs ({logs.length})
                  </h4>
                  <div className="border border-luxury-100 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto divide-y divide-luxury-50 text-xs bg-white">
                    {logs.map(log => (
                      <div key={log.id} className="p-3 hover:bg-luxury-50/50">
                        <div className="flex justify-between flex-wrap gap-2">
                          <span className="font-mono text-[10px] text-luxury-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="font-bold text-luxury-900 mt-1 font-mono text-[11px]">{log.action}</p>
                        <p className="text-luxury-500 mt-0.5">{log.message}</p>
                        {log.details && (
                          <details className="mt-1 cursor-pointer">
                            <summary className="text-[10px] text-gold-650 font-bold hover:underline">View Payload JSON</summary>
                            <pre className="mt-1 p-2 bg-luxury-900 text-luxury-100 rounded font-mono text-[9px] overflow-x-auto select-all max-h-32">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="p-4 text-center text-luxury-400">No execution logs recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* 2. Webhook Logs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-luxury-600 tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-gold-500" /> Webhook Events ({webhooks.length})
                  </h4>
                  <div className="border border-luxury-100 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto divide-y divide-luxury-50 text-xs bg-white">
                    {webhooks.map(wh => (
                      <div key={wh.id} className="p-3 hover:bg-luxury-50/50">
                        <div className="flex justify-between flex-wrap gap-2">
                          <span className="font-mono text-[10px] text-luxury-400">
                            {wh.timestamp ? new Date(wh.timestamp).toLocaleString() : '—'}
                          </span>
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase">
                            Webhook
                          </span>
                        </div>
                        <p className="font-bold text-luxury-900 mt-1 text-[11px]">
                          AWB: <span className="font-mono">{wh.payload?.awb || '—'}</span> | Order ID: <span className="font-mono">{wh.payload?.order_id || '—'}</span>
                        </p>
                        <p className="text-luxury-500 mt-0.5">
                          Status: <strong className="text-luxury-700 font-bold uppercase">{wh.payload?.status || 'scanned'}</strong> | Courier: {wh.payload?.courier_name || '—'}
                        </p>
                        <details className="mt-1 cursor-pointer">
                          <summary className="text-[10px] text-gold-650 font-bold hover:underline">View Payload JSON</summary>
                          <pre className="mt-1 p-2 bg-luxury-900 text-luxury-100 rounded font-mono text-[9px] overflow-x-auto select-all max-h-32">
                            {JSON.stringify(wh.payload, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                    {webhooks.length === 0 && (
                      <p className="p-4 text-center text-luxury-400">No webhooks received yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 5: LOGISTICS CONFIGURATION
          ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-luxury-900 border-b border-luxury-100 pb-3">Shiprocket Configuration</h3>
          
          <div className="space-y-5 max-w-2xl">
            {/* Toggle: Enable Shiprocket */}
            <div className="flex items-center justify-between bg-luxury-50 p-4 rounded-xl border border-luxury-200">
              <div>
                <p className="text-sm font-bold text-luxury-900">Enable Shiprocket Fulfillment</p>
                <p className="text-xs text-luxury-500 mt-0.5">Toggle to automate shipping calculations and logistics sync on checkout.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiprocketConfig.enabled}
                  onChange={e => setShiprocketConfig(p => ({ ...p, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            {/* Toggle: Auto AWB */}
            <div className="flex items-center justify-between bg-luxury-50 p-4 rounded-xl border border-luxury-200">
              <div>
                <p className="text-sm font-bold text-luxury-900">Auto-assign AWB Tracking Number</p>
                <p className="text-xs text-luxury-500 mt-0.5">Automatically select default courier and generate AWB upon order synchronization.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiprocketConfig.autoAwbEnabled}
                  onChange={e => setShiprocketConfig(p => ({ ...p, autoAwbEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Default Pickup location name</label>
                <select
                  value={shiprocketConfig.defaultPickupLocation}
                  onChange={e => {
                    const chosen = e.target.value;
                    const matchedLoc = pickupLocations.find(l => l.pickup_location === chosen);
                    setShiprocketConfig(p => ({
                      ...p,
                      defaultPickupLocation: chosen,
                      pickupPincode: matchedLoc ? matchedLoc.pincode : p.pickupPincode
                    }));
                  }}
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm bg-white focus:outline-none"
                >
                  {pickupLocations.length > 0 ? (
                    pickupLocations.map(l => (
                      <option key={l.id} value={l.pickup_location}>{l.pickup_location} ({l.pincode})</option>
                    ))
                  ) : (
                    <option value="Primary">Primary (560001)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Warehouse Origin Pincode</label>
                <input
                  value={shiprocketConfig.pickupPincode}
                  onChange={e => setShiprocketConfig(p => ({ ...p, pickupPincode: e.target.value }))}
                  placeholder="560001"
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Default Package Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={shiprocketConfig.defaultWeight}
                  onChange={e => setShiprocketConfig(p => ({ ...p, defaultWeight: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Default Dimensions (L x B x H in cm)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={shiprocketConfig.defaultLength}
                    onChange={e => setShiprocketConfig(p => ({ ...p, defaultLength: Number(e.target.value) }))}
                    placeholder="L"
                    className="w-full px-2 py-2 border border-luxury-200 rounded-lg text-sm text-center focus:outline-none"
                  />
                  <input
                    type="number"
                    value={shiprocketConfig.defaultBreadth}
                    onChange={e => setShiprocketConfig(p => ({ ...p, defaultBreadth: Number(e.target.value) }))}
                    placeholder="B"
                    className="w-full px-2 py-2 border border-luxury-200 rounded-lg text-sm text-center focus:outline-none"
                  />
                  <input
                    type="number"
                    value={shiprocketConfig.defaultHeight}
                    onChange={e => setShiprocketConfig(p => ({ ...p, defaultHeight: Number(e.target.value) }))}
                    placeholder="H"
                    className="w-full px-2 py-2 border border-luxury-200 rounded-lg text-sm text-center focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Configurations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          COURIER BOOKING comparison DRAWER/MODAL
          ─────────────────────────────────────────────────────────────────────── */}
      {bookingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col p-6 animate-slide-left overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex justify-between items-center border-b border-luxury-100 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-900">Shiprocket Courier Selection</h3>
                <p className="text-xs text-luxury-500 mt-1">Book courier partner for order #{bookingOrder.id?.slice(-8).toUpperCase()}</p>
              </div>
              <button
                onClick={() => setBookingOrder(null)}
                className="p-1 rounded-lg hover:bg-luxury-100 text-luxury-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Destination Pincode Alert */}
            <div className="mt-4 bg-luxury-50 border border-luxury-200 rounded-xl p-3.5 text-xs text-luxury-700 flex justify-between">
              <div>
                <span className="text-luxury-400">Destination:</span> {bookingOrder.city}, {bookingOrder.state} ({bookingOrder.pincode})
              </div>
              <div>
                <span className="text-luxury-400">Weight:</span> {(bookingOrder.items || []).reduce((acc, i) => acc + (Number(i.quantity || 1) * 0.1), 0).toFixed(2)} kg
              </div>
            </div>

            {/* Courier results list */}
            <div className="flex-1 mt-6">
              {fetchingCouriers ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-luxury-500 font-semibold">
                  <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
                  Checking serviceable couriers...
                </div>
              ) : courierError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 text-sm font-semibold flex items-center gap-2 justify-center">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> {courierError}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase text-luxury-600 tracking-wider">Available Couriers ({availableCouriers.length})</p>
                  
                  {/* Courier Card List */}
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {availableCouriers.map(courier => (
                      <div
                        key={courier.courier_id}
                        className="p-4 rounded-xl border border-luxury-150 bg-white hover:border-gold-300 transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-sm text-luxury-900">{courier.name}</p>
                          <div className="flex gap-3 text-[10px] text-luxury-500 mt-1 leading-relaxed">
                            <span>ETA: <strong className="text-luxury-700">{courier.estimated_delivery_days || '3-4 days'}</strong></span>
                            <span>Rating: <strong className="text-gold-650">{courier.rating.toFixed(1)} / 5.0</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-serif font-bold text-base text-luxury-900">
                            {formatINR(courier.rate)}
                          </span>
                          <button
                            onClick={() => handleBookShipment(courier.courier_id)}
                            disabled={bookingInProgress}
                            className="px-3.5 py-1.5 rounded-lg bg-luxury-900 text-white text-xs font-bold hover:bg-luxury-800 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {bookingInProgress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Book
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Auto Booking Fallback */}
                  <div className="pt-4 border-t border-luxury-100 flex justify-end">
                    <button
                      onClick={() => handleBookShipment(null)} // passing null triggers Shiprocket default selection
                      disabled={bookingInProgress}
                      className="px-4 py-2 rounded-xl bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      {bookingInProgress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Auto-Assign Best Courier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
