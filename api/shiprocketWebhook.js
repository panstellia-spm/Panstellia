import admin from './_firebaseAdmin.js';
import { logShiprocketAction } from './_shiprocketHelper.js';

const db = admin.firestore();

function mapShiprocketStatus(srStatus) {
  const lower = String(srStatus || '').toLowerCase().trim();
  
  if (['picked_up', 'picked', 'dispatched', '6', 'shipped'].includes(lower)) {
    return 'shipped';
  }
  if (['in_transit', 'transit', '7', 'in-transit'].includes(lower)) {
    return 'shipped';
  }
  if (['out_for_delivery', 'out_for_del', '17', 'out-for-delivery'].includes(lower)) {
    return 'out of delivery';
  }
  if (['delivered', 'del', '2'].includes(lower)) {
    return 'delivered';
  }
  if (['canceled', 'cancelled', '3'].includes(lower)) {
    return 'cancelled';
  }
  if (['ndr', 'failed', 'undelivered', '4', '18'].includes(lower)) {
    // Keeps current status but will set shipmentStatus to failed/delayed
    return null;
  }
  
  return null;
}

export default async function handler(req, res) {
  // Webhooks are POST requests from Shiprocket
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const payload = req.body ?? {};

  try {
    // Log raw webhook payload for debugging
    await db.collection('shiprocket_webhooks').add({
      payload: payload,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const awb = payload.awb ? String(payload.awb).trim() : null;
    const orderId = payload.order_id ? String(payload.order_id).trim() : null;
    const shipmentId = payload.shipment_id ? String(payload.shipment_id).trim() : null;
    const srStatus = payload.status ? String(payload.status).trim() : null;
    const courier = payload.courier_name ? String(payload.courier_name).trim() : null;
    const edd = payload.edd || payload.estimated_delivery || null;

    if (!awb && !orderId && !shipmentId) {
      return res.status(400).json({ error: 'Invalid payload: awb, order_id or shipment_id is required' });
    }

    console.log(`[shiprocketWebhook] Received webhook. order_id=${orderId}, awb=${awb}, status=${srStatus}`);

    // Find the order document in Firestore.
    // We try to find by orderId (which corresponds to local orderId like PAN-12345-XYZ)
    // or by awbNumber, or by shipmentId.
    let orderDoc = null;
    let orderRef = null;

    if (orderId) {
      const snap = await db.collection('orders').where('orderId', '==', orderId).limit(1).get();
      if (!snap.empty) {
        orderDoc = snap.docs[0].data();
        orderRef = snap.docs[0].ref;
      }
    }

    if (!orderRef && awb) {
      const snap = await db.collection('orders').where('awbNumber', '==', awb).limit(1).get();
      if (!snap.empty) {
        orderDoc = snap.docs[0].data();
        orderRef = snap.docs[0].ref;
      }
    }

    if (!orderRef && shipmentId) {
      const snap = await db.collection('orders').where('shipmentId', '==', shipmentId).limit(1).get();
      if (!snap.empty) {
        orderDoc = snap.docs[0].data();
        orderRef = snap.docs[0].ref;
      }
    }

    if (!orderRef) {
      const msg = `Order not found in database for webhook search: orderId=${orderId}, awb=${awb}, shipmentId=${shipmentId}`;
      console.warn(`[shiprocketWebhook] ${msg}`);
      await logShiprocketAction('webhook', 'receive_update', 'failed', msg, payload);
      // Respond 200 OK to Shiprocket anyway so they don't keep retrying
      return res.status(200).json({ status: 'ignored', reason: 'order_not_found' });
    }

    // Map Shiprocket status to local order status
    const mappedOrderStatus = mapShiprocketStatus(srStatus);
    const normalizedSrStatus = String(srStatus || '').toLowerCase().trim();

    const updates = {
      shipmentStatus: normalizedSrStatus,
      deliveryStatus: normalizedSrStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (courier) {
      updates.courierName = courier;
    }
    if (edd) {
      updates.estimatedDelivery = edd;
    }
    if (awb) {
      updates.awbNumber = awb;
    }

    // Update main order status if mapped successfully and not already terminal/same
    if (mappedOrderStatus && orderDoc.status !== mappedOrderStatus) {
      // Avoid overwriting terminal states like cancelled/refunded
      if (!['cancelled', 'refunded'].includes(orderDoc.status)) {
        updates.status = mappedOrderStatus;
        
        // Append to order status history
        updates.statusHistory = admin.firestore.FieldValue.arrayUnion({
          status: mappedOrderStatus,
          timestamp: new Date().toISOString(),
          adminName: 'System (Shiprocket Webhook)',
          note: `Courier Status Update: ${payload.current_status || srStatus || 'In Transit'}`
        });

        // Trigger low-priority notification if order is delivered
        if (mappedOrderStatus === 'delivered') {
          updates.paymentStatus = 'Paid'; // Automatically mark as Paid if delivered (for COD)
          
          await db.collection('admin_notifications').add({
            title: 'Order Delivered',
            message: `Order #${orderDoc.orderId} has been successfully delivered by ${courier || 'courier'}.`,
            type: 'order',
            targetId: orderRef.id,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    // Append to detailed shipment checkpoint history
    if (payload.scans || payload.tracking_data) {
      const history = payload.scans || payload.tracking_data.scans || [];
      if (Array.isArray(history)) {
        updates.shipmentHistory = history.map(h => ({
          status: h.activity || h.status || 'scanned',
          activity: h.activity || 'Package scan at hub',
          location: h.location || 'Hub',
          timestamp: h.timestamp || h.date || new Date().toISOString()
        }));
      }
    } else {
      // Fallback single checkpoint entry
      updates.shipmentHistory = admin.firestore.FieldValue.arrayUnion({
        status: normalizedSrStatus,
        activity: payload.current_status || `Status updated to ${srStatus}`,
        location: payload.location || 'In Transit Hub',
        timestamp: new Date().toISOString()
      });
    }

    await orderRef.update(updates);
    
    // Also update payments document if it exists to maintain sync
    try {
      const paymentSnap = await db.collection('payments').where('orderId', '==', orderDoc.orderId).limit(1).get();
      if (!paymentSnap.empty) {
        const pUpdates = { ...updates };
        delete pUpdates.statusHistory; // Payments don't need statusHistory
        await paymentSnap.docs[0].ref.update(pUpdates);
      }
    } catch (payErr) {
      console.warn('[shiprocketWebhook] Failed to update payments document:', payErr.message);
    }

    await logShiprocketAction('webhook', 'receive_update', 'success', `Processed status update "${srStatus}" for order ${orderDoc.orderId}`, payload);
    return res.status(200).json({ status: 'success', orderId: orderDoc.orderId });

  } catch (err) {
    console.error('[shiprocketWebhook] Error processing webhook:', err.message);
    await logShiprocketAction('webhook', 'receive_update', 'failed', err.message, payload);
    return res.status(500).json({ error: err.message || 'Internal webhook error' });
  }
}
