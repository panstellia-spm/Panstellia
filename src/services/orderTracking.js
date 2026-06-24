/**
 * Panstellia — Order Tracking Service
 *
 * Provides:
 * - Real-time Firestore listeners (onSnapshot)
 * - Status update with history appending
 * - Tracking info management
 * - Admin notes
 * - Bulk operations
 * - Refund request management
 */

import { db } from './firebase';
import {
  doc, collection, addDoc, updateDoc, writeBatch,
  onSnapshot, query, orderBy, limit,
  serverTimestamp, arrayUnion,
  getDoc, where,
} from 'firebase/firestore';
import { isValidTransition, isHighValueOrder, detectAutoPriority } from './orderStatus';
import { logActivity, LOG_ACTIONS, LOG_MODULES, LOG_STATUS, buildAdminInfo } from './activityLogger';

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME LISTENERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to a single order document in real time.
 * @param {string} orderId
 * @param {function} callback - called with (order | null, error | null)
 * @returns {function} unsubscribe
 */
export function subscribeToOrder(orderId, callback) {
  if (!orderId) return () => {};
  const ref = doc(db, 'orders', orderId);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() }, null);
      } else {
        callback(null, null);
      }
    },
    (error) => {
      console.error('[subscribeToOrder] error:', error);
      callback(null, error);
    }
  );
}

/**
 * Subscribe to all orders (admin) with real-time updates.
 * @param {function} callback - called with (orders[], error | null)
 * @param {{ limitCount?: number }} options
 * @returns {function} unsubscribe
 */
export function subscribeToAllOrders(callback, options = {}) {
  const { limitCount = 500 } = options;
  const q = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(orders, null);
    },
    (error) => {
      console.error('[subscribeToAllOrders] error:', error);
      callback([], error);
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update order status and append an entry to statusHistory[].
 * Also auto-computes isHighValue and priority.
 * @param {string} orderId
 * @param {string} newStatus - canonical status key
 * @param {object} adminUser - Firebase auth user object
 * @param {string} [note] - optional note for this transition
 */
export async function updateOrderStatus(orderId, newStatus, adminUser, note = '') {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error('Order not found');

  const orderData = orderSnap.data();
  const prevStatus = orderData.status || 'processing';
  const adminName = adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin';
  const adminId = adminUser?.uid || 'unknown';

  // Strict Workflow validation (Phase 3)
  if (!isValidTransition(prevStatus, newStatus)) {
    throw new Error(`Invalid status transition: "${prevStatus}" ➔ "${newStatus}"`);
  }

  // Handle Cancellation Inventory Restoration (Phase 15)
  if (newStatus === 'cancelled' && prevStatus !== 'cancelled' && prevStatus !== 'refunded') {
    if (orderData.items?.length) {
      for (const item of orderData.items) {
        const productRef = doc(db, 'products', item.id);
        const pSnap = await getDoc(productRef);
        if (pSnap.exists()) {
          const pd = pSnap.data();
          const oldStock = Number(pd.stockQuantity || 0);
          const newStock = oldStock + Number(item.quantity || 0);
          await updateDoc(productRef, {
            stockQuantity: newStock,
            availableQuantity: newStock - Number(pd.reservedQuantity || 0),
          });

          // Log stock restoration
          await addDoc(collection(db, 'inventory_logs'), {
            productId: item.id,
            productName: item.name,
            skuCode: pd.skuCode || '',
            action: 'Stock Restore (Cancel)',
            change: item.quantity,
            previousValue: oldStock,
            newValue: newStock,
            adminId,
            adminName,
            timestamp: new Date().toISOString(),
            reason: `Order #${orderId} cancelled`,
          });
        }
      }
    }
  }

  const historyEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    adminId,
    adminName,
    note: note || '',
  };

  const updates = {
    status: newStatus,
    statusHistory: arrayUnion(historyEntry),
    lastUpdatedBy: adminName,
    lastUpdatedAt: new Date().toISOString(),
    isHighValue: isHighValueOrder(orderData),
  };

  // Auto-set priority if not already manually set
  if (!orderData.priority || orderData.priority === 'normal') {
    updates.priority = detectAutoPriority(orderData);
  }

  // Handle COD payment status on delivery
  if (newStatus === 'delivered' && (orderData.paymentStatus || '').toLowerCase() === 'pending') {
    updates.paymentStatus = 'Paid';
    
    // Also update the corresponding payment document if it exists
    try {
      const paymentsRef = collection(db, 'payments');
      const q = query(paymentsRef, where('orderDocId', '==', orderId), limit(1));
      const paySnap = await getDocs(q);
      if (!paySnap.empty) {
        await updateDoc(paySnap.docs[0].ref, {
          paymentStatus: 'Paid',
          updatedAt: new Date().toISOString()
        });
      }
    } catch(err) {
      console.error('Failed to update payment doc status on delivery', err);
    }
  }

  await updateDoc(orderRef, updates);

  // Write detailed log in fulfillmentLogs (Phase 14 & 16)
  await addDoc(collection(db, 'fulfillmentLogs'), {
    orderId,
    adminId,
    adminName,
    action: `Status change: "${prevStatus}" ➔ "${newStatus}"`,
    oldStatus: prevStatus,
    newStatus,
    note: note || '',
    timestamp: new Date().toISOString(),
  });

  // Create shipment record on shipped status (Phase 7 & 16)
  if (newStatus === 'shipped' && prevStatus !== 'shipped') {
    await addDoc(collection(db, 'shipments'), {
      orderId,
      userId: orderData.userId || 'unknown',
      courierName: orderData.courierName || 'Courier Partner',
      trackingNumber: orderData.trackingNumber || 'TBD',
      shippedAt: new Date().toISOString(),
      expectedDelivery: orderData.estimatedDelivery || '',
      items: orderData.items || [],
      total: orderData.total || 0,
      customerName: orderData.customerName || orderData.name || 'Customer',
    });
  }

  // Log the action
  logActivity({
    module: LOG_MODULES.ORDERS,
    action: LOG_ACTIONS.ORDER_STATUS_CHANGED,
    targetId: orderId,
    targetType: 'order',
    description: `Order #${orderId.slice(-8).toUpperCase()} status: "${prevStatus}" → "${newStatus}"${note ? ` | Note: ${note}` : ''}`,
    oldValue: prevStatus,
    newValue: newStatus,
    status: LOG_STATUS.SUCCESS,
    adminInfo: buildAdminInfo(adminUser),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACKING INFO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save shipping tracking information to the order document.
 */
export async function updateTrackingInfo(orderId, trackingData, adminUser) {
  const {
    trackingNumber = '',
    courierName = '',
    trackingUrl = '',
    estimatedDelivery = '',
  } = trackingData;

  const orderRef = doc(db, 'orders', orderId);
  const adminName = adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin';

  await updateDoc(orderRef, {
    trackingNumber,
    courierName,
    trackingUrl,
    estimatedDelivery: estimatedDelivery || '',
    lastUpdatedBy: adminName,
    lastUpdatedAt: new Date().toISOString(),
    statusHistory: arrayUnion({
      status: 'tracking_updated',
      timestamp: new Date().toISOString(),
      adminId: adminUser?.uid || 'unknown',
      adminName,
      note: `Tracking: ${courierName} ${trackingNumber}`,
    }),
  });

  // Create a record in fulfillmentLogs for tracking update (Phase 14 & 16)
  await addDoc(collection(db, 'fulfillmentLogs'), {
    orderId,
    adminId: adminUser?.uid || 'unknown',
    adminName,
    action: `Tracking Updated: ${courierName} (${trackingNumber})`,
    timestamp: new Date().toISOString(),
    note: `ETA: ${estimatedDelivery}`,
  });

  logActivity({
    module: LOG_MODULES.ORDERS,
    action: LOG_ACTIONS.ORDER_TRACKING_UPDATED,
    targetId: orderId,
    targetType: 'order',
    description: `Tracking updated for #${orderId.slice(-8).toUpperCase()}: ${courierName} — ${trackingNumber}`,
    status: LOG_STATUS.SUCCESS,
    adminInfo: buildAdminInfo(adminUser),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER NOTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an internal admin note to the order_notes sub-collection.
 */
export async function addOrderNote(orderId, noteText, adminUser) {
  if (!noteText?.trim()) throw new Error('Note cannot be empty');

  const adminName = adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin';

  await addDoc(collection(db, 'order_notes'), {
    orderId,
    note: noteText.trim(),
    adminId: adminUser?.uid || 'unknown',
    adminName,
    adminEmail: adminUser?.email || '',
    createdAt: new Date().toISOString(),
    timestamp: serverTimestamp(),
  });

  logActivity({
    module: LOG_MODULES.ORDERS,
    action: LOG_ACTIONS.ORDER_NOTE_ADDED,
    targetId: orderId,
    targetType: 'order',
    description: `Note added to #${orderId.slice(-8).toUpperCase()} by ${adminName}`,
    status: LOG_STATUS.SUCCESS,
    adminInfo: buildAdminInfo(adminUser),
  });
}

/**
 * Subscribe to notes for a specific order.
 * @returns {function} unsubscribe
 */
export function subscribeToOrderNotes(orderId, callback) {
  if (!orderId) return () => {};
  const q = query(
    collection(db, 'order_notes'),
    where('orderId', '==', orderId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })), null),
    (err) => callback([], err)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderPriority(orderId, priority, adminUser) {
  const orderRef = doc(db, 'orders', orderId);
  const adminName = adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin';

  await updateDoc(orderRef, {
    priority,
    lastUpdatedBy: adminName,
    lastUpdatedAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REFUND MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initiate a refund request for a cancelled/delivered order.
 */
export async function requestRefund(orderId, { amount, reason }, adminUser) {
  const orderRef = doc(db, 'orders', orderId);
  const adminName = adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin';

  await updateDoc(orderRef, {
    refundStatus: 'requested',
    refundAmount: Number(amount || 0),
    refundReason: reason || '',
    refundRequestedAt: new Date().toISOString(),
    refundRequestedBy: adminName,
    lastUpdatedBy: adminName,
    lastUpdatedAt: new Date().toISOString(),
    statusHistory: arrayUnion({
      status: 'refund_requested',
      timestamp: new Date().toISOString(),
      adminId: adminUser?.uid || 'unknown',
      adminName,
      note: `Refund requested: ₹${amount} — ${reason}`,
    }),
  });

  logActivity({
    module: LOG_MODULES.ORDERS,
    action: LOG_ACTIONS.ORDER_REFUNDED,
    targetId: orderId,
    targetType: 'order',
    description: `Refund requested for #${orderId.slice(-8).toUpperCase()}: ₹${amount}`,
    status: LOG_STATUS.SUCCESS,
    adminInfo: buildAdminInfo(adminUser),
  });
}

export async function processRefund(orderId, adminUser) {
  const orderRef = doc(db, 'orders', orderId);
  const adminName = adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin';

  await updateDoc(orderRef, {
    refundStatus: 'completed',
    refundCompletedAt: new Date().toISOString(),
    refundCompletedBy: adminName,
    status: 'refunded',
    lastUpdatedBy: adminName,
    lastUpdatedAt: new Date().toISOString(),
    statusHistory: arrayUnion({
      status: 'refunded',
      timestamp: new Date().toISOString(),
      adminId: adminUser?.uid || 'unknown',
      adminName,
      note: 'Refund completed',
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update multiple orders to a new status in a single batch.
 * Firestore batch limit is 500 writes; we chunk if needed.
 */
export async function bulkUpdateStatus(orderIds, newStatus, adminUser, note = '') {
  if (!orderIds?.length) return;

  const adminName = adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin';
  const adminId = adminUser?.uid || 'unknown';
  const historyEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    adminId,
    adminName,
    note: note || `Bulk update to ${newStatus}`,
  };

  const CHUNK = 200; // well under 500 limit (each order = 1 write)
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const chunk = orderIds.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      const ref = doc(db, 'orders', id);
      batch.update(ref, {
        status: newStatus,
        statusHistory: arrayUnion(historyEntry),
        lastUpdatedBy: adminName,
        lastUpdatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  }

  logActivity({
    module: LOG_MODULES.ORDERS,
    action: LOG_ACTIONS.BULK_STATUS_UPDATE,
    targetType: 'order',
    description: `Bulk status update: ${orderIds.length} orders → "${newStatus}"`,
    newValue: newStatus,
    status: LOG_STATUS.SUCCESS,
    adminInfo: buildAdminInfo(adminUser),
  });
}

/**
 * Export orders array to a CSV Blob URL and trigger download.
 */
export function exportOrdersCSV(orders, filename = 'orders') {
  const safeStr = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'City', 'Total', 'Status', 'Priority', 'Tracking #', 'Items'];
  const rows = orders.map(o => [
    o.id?.slice(-8).toUpperCase(),
    o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—',
    o.customerName || o.name || '—',
    o.phone || o.mobile || '—',
    o.city || '—',
    o.total || 0,
    o.status || 'processing',
    o.priority || 'normal',
    o.trackingNumber || '—',
    (o.items || []).map(i => `${i.name}×${i.quantity}`).join('; '),
  ]);

  const csv = [headers, ...rows].map(r => r.map(safeStr).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Subscribe to all fulfillment logs (admin) with real-time updates.
 */
export function subscribeToFulfillmentLogs(callback) {
  const q = query(
    collection(db, 'fulfillmentLogs'),
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(logs, null);
    },
    (error) => {
      console.error('[subscribeToFulfillmentLogs] error:', error);
      callback([], error);
    }
  );
}
