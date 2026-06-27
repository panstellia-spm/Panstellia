import admin from './_firebaseAdmin.js';
import Razorpay from 'razorpay';
import { handleCors } from './_cors.js';

const FieldValue = admin.firestore.FieldValue;

function getRazorpayClient() {
  let keyId = process.env.RAZORPAY_KEY_ID;
  let keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) return null;

  keyId = keyId.trim().replace(/^"|"$/g, '');
  keySecret = keySecret.trim().replace(/^"|"$/g, '');

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

async function getAuthenticatedUser(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (authError) {
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    throw error;
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const authUser = await getAuthenticatedUser(req);
    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay configuration error" });
    }

    const { local_order_id } = req.body ?? {};
    if (!local_order_id) {
      return res.status(400).json({ error: "Missing local_order_id" });
    }

    const db = admin.firestore();
    const orderRef = db.collection("orders").doc(local_order_id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderData = orderSnap.data();

    // Verify ownership
    if (orderData.userId !== authUser.uid) {
      return res.status(403).json({ error: "Unauthorized access to order" });
    }

    // Verify status
    if (orderData.status !== "pending_payment" && (orderData.paymentStatus || "").toLowerCase() !== "pending") {
      return res.status(400).json({ error: "Order is not in pending payment state" });
    }

    // Sanity check stock availability
    for (const item of (orderData.items || [])) {
      const pSnap = await db.collection("products").doc(item.id).get();
      if (pSnap.exists) {
        const pData = pSnap.data();
        const stockQuantity = Number(pData.stockQuantity ?? 0);
        const reservedQuantity = Number(pData.reservedQuantity ?? 0);
        // If stock is severely negative or 0, we shouldn't allow retry
        if (stockQuantity <= 0) {
          return res.status(400).json({ error: `Product "${item.name}" is currently out of stock.` });
        }
      }
    }

    const amountNum = Number(orderData.amount);
    if (!amountNum || amountNum < 100) {
      return res.status(400).json({ error: "Invalid order amount" });
    }

    console.log(`[api/createRetryOrder] Creating new Razorpay order for ${local_order_id}`);

    const newRazorpayOrder = await razorpay.orders.create({
      amount: amountNum,
      currency: orderData.currency || "INR",
      receipt: `retry_${local_order_id}_${Date.now()}`.slice(0, 40),
      notes: {
        order_number: orderData.orderId,
        user_id: authUser.uid,
        local_order_id: local_order_id,
        is_retry: "true"
      },
    });

    // Update orders and payments collection
    await db.runTransaction(async (transaction) => {
      // Find the corresponding payment doc
      const paymentsQuery = await transaction.get(
        db.collection("payments").where("orderDocId", "==", local_order_id).limit(1)
      );

      transaction.update(orderRef, {
        razorpayOrderId: newRazorpayOrder.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (!paymentsQuery.empty) {
        transaction.update(paymentsQuery.docs[0].ref, {
          razorpayOrderId: newRazorpayOrder.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return res.status(200).json({
      order_id: newRazorpayOrder.id,
      amount: newRazorpayOrder.amount,
      currency: newRazorpayOrder.currency,
      local_order_id: local_order_id,
      order_number: orderData.orderId
    });

  } catch (error) {
    console.error("[api/createRetryOrder] Error:", error);
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Internal server error" });
  }
}
