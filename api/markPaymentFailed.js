import admin from './firebaseAdmin.js';
import { handleCors } from './cors.js';

const FieldValue = admin.firestore.FieldValue;

async function findPendingPaymentByRazorpayOrderId(razorpayOrderId, userId) {
  const snapshot = await admin
    .firestore()
    .collection("payments")
    .where("razorpayOrderId", "==", razorpayOrderId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0];
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
    console.error("[api/markPaymentFailed] Firebase auth token verification failed:", authError?.message || authError);
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    throw error;
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const authUser = await getAuthenticatedUser(req);
    const { razorpay_order_id, razorpay_payment_id, reason = "Payment was not completed" } = req.body ?? {};

    if (!razorpay_order_id) {
      return res.status(400).json({ error: "Missing required field: razorpay_order_id" });
    }

    const pendingPayment = await findPendingPaymentByRazorpayOrderId(razorpay_order_id, authUser.uid);
    if (!pendingPayment) {
      return res.status(404).json({ error: "Pending payment order not found" });
    }

    const db = admin.firestore();
    const failResult = await db.runTransaction(async (transaction) => {
      const paymentDocRef = db.collection("payments").doc(pendingPayment.id);
      const paymentDocSnap = await transaction.get(paymentDocRef);
      if (!paymentDocSnap.exists) {
        throw new Error("Payment record not found");
      }
      const pData = paymentDocSnap.data();

      // Only release if it was still in pending_payment status
      if (pData.status === "pending_payment") {
        const productDocs = [];
        for (const item of pData.items) {
          const productRef = db.collection("products").doc(item.id);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists) {
            productDocs.push({ ref: productRef, snap: productSnap, item });
          }
        }

        for (const { ref, snap, item } of productDocs) {
          const prodData = snap.data();
          const oldReserved = Number(prodData.reservedQuantity ?? 0);
          const oldStock = Number(prodData.stockQuantity ?? 0);

          const newReserved = Math.max(0, oldReserved - item.quantity);
          const newAvailable = oldStock - newReserved;

          transaction.update(ref, {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            lastStockUpdate: new Date().toISOString(),
            stockUpdatedBy: 'System (Failed Payment Release)',
          });
        }

        const failedUpdate = {
          paymentStatus: "Failed",
          status: "payment_failed",
          razorpayPaymentId: razorpay_payment_id || null,
          failureReason: String(reason).slice(0, 300),
          updatedAt: FieldValue.serverTimestamp(),
        };

        transaction.update(paymentDocRef, failedUpdate);
        if (pData.orderDocId) {
          transaction.update(db.collection("orders").doc(pData.orderDocId), failedUpdate);
        }
      }

      return {
        orderDocId: pData.orderDocId || null,
        orderId: pData.orderId || razorpay_order_id,
      };
    });

    return res.status(200).json({
      ok: true,
      paymentStatus: "Failed",
      local_order_id: failResult.orderDocId || null,
      order_number: failResult.orderId,
    });
  } catch (error) {
    console.error("[api/markPaymentFailed] Error marking payment failed:", error);
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Internal server error" });
  }
}
