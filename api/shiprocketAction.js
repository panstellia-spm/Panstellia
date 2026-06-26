import { handleCors } from './cors.js';
import { shiprocketRequest, logShiprocketAction } from './shiprocketHelper.js';
import admin from './firebaseAdmin.js';

const db = admin.firestore();

function getFormattedDate(dateVal) {
  const dateObj = dateVal ? new Date(dateVal.seconds ? dateVal.toDate() : dateVal) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const { action, orderDocId, shipmentId, shiprocketOrderId, courierId, packageDetails } = req.body ?? {};

    if (!action) {
      return res.status(400).json({ error: 'Field "action" is required' });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 1: CREATE ORDER (Sync local order to Shiprocket)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'create_order') {
      if (!orderDocId) {
        return res.status(400).json({ error: 'Field "orderDocId" is required for create_order' });
      }

      // Fetch order from Firestore
      const orderRef = db.collection('orders').doc(orderDocId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: `Order document "${orderDocId}" not found` });
      }

      const order = orderSnap.data();

      // Read default dimensions & weights from config
      const configSnap = await db.collection('system_settings').doc('shiprocket').get();
      let defaultPickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
      let defaultWeight = 0.1;
      let defaultLength = 10;
      let defaultBreadth = 10;
      let defaultHeight = 5;

      if (configSnap.exists) {
        const config = configSnap.data();
        if (config.defaultPickupLocation) defaultPickupLocation = config.defaultPickupLocation;
        if (config.defaultWeight) defaultWeight = Number(config.defaultWeight);
        if (config.defaultLength) defaultLength = Number(config.defaultLength);
        if (config.defaultBreadth) defaultBreadth = Number(config.defaultBreadth);
        if (config.defaultHeight) defaultHeight = Number(config.defaultHeight);
      }

      // Read override parameters if sent
      const weight = packageDetails?.weight || defaultWeight;
      const length = packageDetails?.length || defaultLength;
      const breadth = packageDetails?.breadth || defaultBreadth;
      const height = packageDetails?.height || defaultHeight;

      // Map payment method
      const isCod = order.paymentMethod?.toLowerCase() === 'cod';
      const paymentMethod = isCod ? 'COD' : 'Prepaid';

      // Format customer name safely
      const nameParts = (order.customerName || 'Customer').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      // Format items
      const orderItems = (order.items || []).map(item => ({
        name: item.name || 'Jewellery Item',
        sku: item.skuCode || item.id || 'JEWEL-01',
        units: Number(item.quantity || 1),
        selling_price: String(item.price || 0),
        discount: '0',
        tax: '0'
      }));

      if (!orderItems.length) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
      }

      const payload = {
        order_id: order.orderId || orderDocId,
        order_date: getFormattedDate(order.createdAt),
        pickup_location: defaultPickupLocation,
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: order.address || 'N/A',
        billing_city: order.city || 'N/A',
        billing_pincode: String(order.pincode || ''),
        billing_state: order.state || 'N/A',
        billing_country: 'India',
        billing_email: order.customerEmail || 'no-email@panstellia.com',
        billing_phone: String(order.phone || ''),
        shipping_is_billing: true,
        order_items: orderItems,
        payment_method: paymentMethod,
        sub_total: Number(order.subtotal || order.total || 0),
        length: Number(length),
        breadth: Number(breadth),
        height: Number(height),
        weight: Number(weight)
      };

      console.log(`[api/shiprocketAction] Sending create order payload to Shiprocket:`, payload.order_id);
      const response = await shiprocketRequest('POST', 'v1/external/orders/create/adhoc', payload);

      if (response && response.order_id) {
        const updateData = {
          shiprocketOrderId: String(response.order_id),
          shipmentId: String(response.shipment_id),
          shipmentStatus: 'pending',
          courierName: 'Pending Assignment',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await orderRef.update(updateData);
        await logShiprocketAction('shipment', 'create_order', 'success', `Successfully created Shiprocket order ${response.order_id} for order ${orderDocId}`, response);

        // Auto AWB booking if enabled in settings
        let autoAwb = false;
        if (configSnap.exists) {
          autoAwb = configSnap.data().autoAwbEnabled ?? false;
        }

        if (autoAwb && response.shipment_id) {
          try {
            console.log(`[api/shiprocketAction] Auto-assigning AWB for shipment ${response.shipment_id}`);
            const awbResponse = await shiprocketRequest('POST', 'v1/external/courier/assign/awb', {
              shipment_id: response.shipment_id
            });

            if (awbResponse && awbResponse.status === 200 && awbResponse.response?.data?.awb_code) {
              const awbData = awbResponse.response.data;
              await orderRef.update({
                awbNumber: awbData.awb_code,
                courierName: awbData.courier_name || 'Assigned Courier',
                shipmentStatus: 'packed',
                trackingUrl: `https://shiprocket.co/tracking/${awbData.awb_code}`
              });
              await logShiprocketAction('shipment', 'auto_awb', 'success', `Auto-assigned AWB ${awbData.awb_code} to shipment ${response.shipment_id}`);
            }
          } catch (awbErr) {
            console.warn('[api/shiprocketAction] Auto AWB allocation failed:', awbErr.message);
          }
        }

        return res.status(200).json({
          success: true,
          shiprocketOrderId: response.order_id,
          shipmentId: response.shipment_id
        });
      } else {
        throw new Error('Invalid response received from Shiprocket order creation API');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 2: ASSIGN AWB (Generate Air Waybill for Shipment)
    // ─────────────────────────────────────────────────────────────────────────
    else if (action === 'assign_awb') {
      if (!shipmentId || !orderDocId) {
        return res.status(400).json({ error: 'Fields "shipmentId" and "orderDocId" are required for assign_awb' });
      }

      const payload = {
        shipment_id: Number(shipmentId)
      };

      if (courierId) {
        payload.courier_id = Number(courierId);
      }

      console.log(`[api/shiprocketAction] Requesting AWB for shipment ${shipmentId}, courier=${courierId || 'auto'}`);
      const response = await shiprocketRequest('POST', 'v1/external/courier/assign/awb', payload);

      if (response && response.response?.data?.awb_code) {
        const awbData = response.response.data;
        const orderRef = db.collection('orders').doc(orderDocId);
        
        await orderRef.update({
          awbNumber: awbData.awb_code,
          courierName: awbData.courier_name || 'Assigned Courier',
          shipmentStatus: 'packed', // Normalized status in our system
          trackingUrl: `https://shiprocket.co/tracking/${awbData.awb_code}`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logShiprocketAction('shipment', 'assign_awb', 'success', `Assigned AWB ${awbData.awb_code} to shipment ${shipmentId}`, response);

        return res.status(200).json({
          success: true,
          awb: awbData.awb_code,
          courier: awbData.courier_name
        });
      } else {
        throw new Error(response?.response?.data?.message || 'Failed to assign AWB or response is empty.');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 3: SCHEDULE PICKUP
    // ─────────────────────────────────────────────────────────────────────────
    else if (action === 'schedule_pickup') {
      if (!shipmentId || !orderDocId) {
        return res.status(400).json({ error: 'Fields "shipmentId" and "orderDocId" are required for schedule_pickup' });
      }

      console.log(`[api/shiprocketAction] Scheduling pickup for shipment ${shipmentId}`);
      const response = await shiprocketRequest('POST', 'v1/external/courier/generate/pickup', {
        shipment_id: [Number(shipmentId)]
      });

      if (response && response.pickup_status === 1) {
        const orderRef = db.collection('orders').doc(orderDocId);
        
        await orderRef.update({
          pickupStatus: 'scheduled',
          shipmentStatus: 'shipped', // Transition to Shipped once pickup is generated
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logShiprocketAction('shipment', 'schedule_pickup', 'success', `Scheduled pickup for shipment ${shipmentId}`, response);

        return res.status(200).json({
          success: true,
          message: 'Pickup scheduled successfully',
          pickup_id: response.pickup_id
        });
      } else {
        throw new Error(response?.response?.message || 'Failed to schedule pickup');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 4: GENERATE LABEL (Print Label download link)
    // ─────────────────────────────────────────────────────────────────────────
    else if (action === 'generate_label') {
      if (!shipmentId) {
        return res.status(400).json({ error: 'Field "shipmentId" is required for generate_label' });
      }

      console.log(`[api/shiprocketAction] Generating label for shipment ${shipmentId}`);
      const response = await shiprocketRequest('POST', 'v1/external/courier/generate/label', {
        shipment_id: [Number(shipmentId)]
      });

      if (response && response.label_created) {
        await logShiprocketAction('shipment', 'generate_label', 'success', `Generated label for shipment ${shipmentId}`);
        return res.status(200).json({
          success: true,
          labelUrl: response.label_url
        });
      } else {
        throw new Error('Label creation failed');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 5: GENERATE INVOICE (Print Invoice download link)
    // ─────────────────────────────────────────────────────────────────────────
    else if (action === 'generate_invoice') {
      if (!shiprocketOrderId) {
        return res.status(400).json({ error: 'Field "shiprocketOrderId" is required for generate_invoice' });
      }

      console.log(`[api/shiprocketAction] Generating invoice for order ${shiprocketOrderId}`);
      const response = await shiprocketRequest('POST', 'v1/external/orders/print/invoice', {
        ids: [Number(shiprocketOrderId)]
      });

      if (response && response.is_invoice_created) {
        await logShiprocketAction('shipment', 'generate_invoice', 'success', `Generated invoice for order ${shiprocketOrderId}`);
        return res.status(200).json({
          success: true,
          invoiceUrl: response.invoice_url
        });
      } else {
        throw new Error('Invoice print failed');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 6: CANCEL SHIPMENT
    // ─────────────────────────────────────────────────────────────────────────
    else if (action === 'cancel_shipment') {
      if (!shiprocketOrderId || !orderDocId) {
        return res.status(400).json({ error: 'Fields "shiprocketOrderId" and "orderDocId" are required for cancel_shipment' });
      }

      console.log(`[api/shiprocketAction] Canceling order ${shiprocketOrderId}`);
      const response = await shiprocketRequest('POST', 'v1/external/orders/cancel', {
        ids: [Number(shiprocketOrderId)]
      });

      if (response && response.status_code === 200) {
        const orderRef = db.collection('orders').doc(orderDocId);
        
        await orderRef.update({
          shipmentStatus: 'cancelled',
          awbNumber: '',
          shipmentId: '',
          shiprocketOrderId: '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logShiprocketAction('shipment', 'cancel_shipment', 'success', `Cancelled Shiprocket order ${shiprocketOrderId} for order ${orderDocId}`, response);

        return res.status(200).json({
          success: true,
          message: 'Shipment cancelled successfully'
        });
      } else {
        throw new Error('Cancellation failed');
      }
    }

    // Invalid Action
    else {
      return res.status(400).json({ error: `Action "${action}" is not recognized.` });
    }

  } catch (err) {
    console.error('[api/shiprocketAction] Error executing action:', err.message);
    return res.status(500).json({ error: err.message || 'Action execution failed' });
  }
}
