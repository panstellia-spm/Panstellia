import admin from './_firebaseAdmin.js';
import Razorpay from 'razorpay';
import { handleCors } from './_cors.js';

const db = admin.firestore();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_p0y8W5r8T8L8P8', // secure fallback/placeholder if not set in process.env
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_key_placeholder',
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return handleCors(req, res);
  }
  handleCors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate Admin Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split('Bearer ')[1];
    const authUser = await admin.auth().verifyIdToken(token);

    // Verify admin role in Firestore
    const userDoc = await db.collection('users').doc(authUser.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { orderDocId, amount, reason } = req.body;
    if (!orderDocId) {
      return res.status(400).json({ error: 'Missing required field: orderDocId' });
    }

    // 2. Fetch Order Document
    const orderRef = db.collection('orders').doc(orderDocId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderSnap.data();
    const paymentMethod = orderData.paymentMethod || 'razorpay';
    const razorpayPaymentId = orderData.razorpayPaymentId;
    const refundAmount = Number(amount || orderData.total || 0);
    const refundReason = reason || 'No reason provided';
    const adminName = authUser.name || authUser.email || 'Admin';

    if (refundAmount <= 0) {
      return res.status(400).json({ error: 'Refund amount must be greater than 0' });
    }

    let refundResponse = null;

    // 3. Perform Gateway Refund if using Razorpay
    if (paymentMethod === 'razorpay') {
      if (!razorpayPaymentId) {
        return res.status(400).json({ 
          error: 'Cannot initiate gateway refund: Razorpay Payment ID is missing on this order.' 
        });
      }

      try {
        console.log(`[api/refundOrder] Initiating Razorpay refund for payment ${razorpayPaymentId} of amount ₹${refundAmount}`);
        refundResponse = await razorpay.payments.refund(razorpayPaymentId, {
          amount: Math.round(refundAmount * 100), // in paise
          notes: {
            orderDocId,
            reason: refundReason,
            initiatedBy: authUser.email
          }
        });
        console.log('[api/refundOrder] Razorpay Refund success:', refundResponse.id);
      } catch (rzpErr) {
        console.error('[api/refundOrder] Razorpay Refund error:', rzpErr);
        return res.status(500).json({ 
          error: `Razorpay Refund API failed: ${rzpErr.description || rzpErr.message || 'Unknown error'}` 
        });
      }
    } else {
      console.log(`[api/refundOrder] Processing COD/manual refund for order ${orderDocId}`);
    }

    // 4. Update Firestore Order & payment status
    const updateData = {
      refundStatus: 'completed',
      refundAmount,
      refundReason,
      refundCompletedAt: new Date().toISOString(),
      refundCompletedBy: adminName,
      status: 'refunded',
      lastUpdatedBy: adminName,
      lastUpdatedAt: new Date().toISOString(),
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: 'refunded',
        timestamp: new Date().toISOString(),
        adminId: authUser.uid,
        adminName,
        note: `Refund processed: ₹${refundAmount} — ${refundReason}. ${refundResponse ? `Razorpay ID: ${refundResponse.id}` : 'Manual Refund (COD)'}`
      })
    };

    await orderRef.update(updateData);

    // Also update associated payment doc if it exists
    const paymentsQuery = await db.collection('payments')
      .where('orderDocId', '==', orderDocId)
      .limit(1)
      .get();
    
    if (!paymentsQuery.empty) {
      await paymentsQuery.docs[0].ref.update({
        refundStatus: 'completed',
        refundAmount,
        refundReason,
        status: 'refunded',
        paymentStatus: 'Refunded',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 5. Log Activity in fulfillment / admin logs
    const activityLogRef = db.collection('activity_logs').doc();
    await activityLogRef.set({
      module: 'orders',
      action: 'ORDER_REFUNDED',
      targetId: orderDocId,
      targetType: 'order',
      description: `Refund completed for order #${orderDocId.slice(-8).toUpperCase()}: ₹${refundAmount}. ${refundResponse ? `RZP ID: ${refundResponse.id}` : '(Manual)'}`,
      status: 'success',
      adminInfo: {
        uid: authUser.uid,
        email: authUser.email,
        name: adminName
      },
      timestamp: new Date().toISOString()
    });

    // 6. Notify customer (Optional / system flag)
    try {
      const notificationRef = db.collection('notifications').doc();
      await notificationRef.set({
        userId: orderData.userId,
        title: 'Order Refunded',
        message: `A refund of ₹${refundAmount} has been processed for your order #${orderData.orderId}.`,
        type: 'refund',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (notifErr) {
      console.warn('[api/refundOrder] Failed to create customer notification document:', notifErr);
    }

    return res.status(200).json({ 
      success: true, 
      refundId: refundResponse ? refundResponse.id : 'manual',
      amount: refundAmount
    });
  } catch (error) {
    console.error('[api/refundOrder] Critical error processing refund:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
