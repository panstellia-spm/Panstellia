import admin from './firebaseAdmin.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { handleCors } from './cors.js';

const FieldValue = admin.firestore.FieldValue;

function signaturesMatch(expectedSignature, receivedSignature) {
  const expected = Buffer.from(String(expectedSignature), "hex");
  const received = Buffer.from(String(receivedSignature), "hex");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

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
    console.error("[api/verifyPayment] Firebase auth token verification failed:", authError?.message || authError);
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    throw error;
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const authUser = await getAuthenticatedUser(req);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body ?? {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        error: "Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature",
      });
    }

    let keySecret = process.env.RAZORPAY_KEY_SECRET;
    let keyId = process.env.RAZORPAY_KEY_ID;

    if (keySecret) {
      keySecret = keySecret.trim().replace(/^"|"$/g, '');
    }
    if (keyId) {
      keyId = keyId.trim().replace(/^"|"$/g, '');
    }

    if (!keySecret) {
      console.error("[api/verifyPayment] RAZORPAY_KEY_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Signature verification
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, razorpay_signature)) {
      console.error("[api/verifyPayment] Payment signature verification failed");
      const pendingPayment = await findPendingPaymentByRazorpayOrderId(razorpay_order_id, authUser.uid);
      if (pendingPayment) {
        const failedUpdate = {
          paymentStatus: "Failed",
          status: "payment_failed",
          razorpayPaymentId: razorpay_payment_id,
          failureReason: "Signature mismatch",
          updatedAt: FieldValue.serverTimestamp(),
        };
        await pendingPayment.ref.update(failedUpdate);

        const orderDocId = pendingPayment.data()?.orderDocId;
        if (orderDocId) {
          await admin.firestore().collection("orders").doc(orderDocId).update(failedUpdate);
        }
      }
      return res.status(400).json({ error: "Payment verification failed. Signature mismatch." });
    }

    // Optional extra guard: verify payment status against Razorpay API
    try {
      if (keyId) {
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        const allowedStatuses = new Set([
          "authorized",
          "captured",
          "paid",
          "settled",
        ]);

        if (payment?.status && !allowedStatuses.has(payment.status)) {
          return res.status(400).json({
            error: `Payment not authorized or completed. status=${payment.status}`,
          });
        }
      }
    } catch (razorpayError) {
      console.warn(
        "[api/verifyPayment] Razorpay API verification failed, continuing with signature verification:",
        razorpayError?.message || razorpayError
      );
    }

    console.log("[api/verifyPayment] Payment verified", {
      razorpay_payment_id,
      razorpay_order_id,
    });

    const pendingPayment = await findPendingPaymentByRazorpayOrderId(razorpay_order_id, authUser.uid);
    if (!pendingPayment) {
      return res.status(404).json({ error: "Pending payment order not found" });
    }

    const db = admin.firestore();
    const verificationResult = await db.runTransaction(async (transaction) => {
      const paymentDocRef = db.collection("payments").doc(pendingPayment.id);
      const paymentDocSnap = await transaction.get(paymentDocRef);
      if (!paymentDocSnap.exists) {
        throw new Error("Payment record not found");
      }
      const pData = paymentDocSnap.data();

      // Avoid double processing
      if (pData.status !== "pending_payment") {
        if (pData.status === "cancelled") {
          throw new Error("Order was cancelled. Payment cannot be accepted.");
        }
        return {
          alreadyProcessed: true,
          order_number: pData.orderId,
          local_order_id: pData.orderDocId,
        };
      }

      const productDocs = [];
      for (const item of pData.items) {
        const productRef = db.collection("products").doc(item.id);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists) {
          productDocs.push({ ref: productRef, snap: productSnap, item });
        }
      }

      // Deduct stock for each item
      for (const { ref, snap, item } of productDocs) {
        const prodData = snap.data();
        const oldStock = Number(prodData.stockQuantity ?? 0);
        const oldReserved = Number(prodData.reservedQuantity ?? 0);

        const newStock = Math.max(0, oldStock - item.quantity);
        const newReserved = Math.max(0, oldReserved - item.quantity);
        const newAvailable = newStock - newReserved;

        let inventoryStatus = 'in_stock';
        if (newStock <= 0) {
          inventoryStatus = 'out_of_stock';
        } else if (newStock <= Number(prodData.reorderThreshold ?? 5)) {
          inventoryStatus = 'low_stock';
        }

        transaction.update(ref, {
          stockQuantity: newStock,
          reservedQuantity: newReserved,
          availableQuantity: newAvailable,
          inventoryStatus,
          lastStockUpdate: new Date().toISOString(),
          stockUpdatedBy: 'System (Purchase)',
          inventoryValue: newStock * Number(prodData.price ?? 0),
        });

        // Log stock change in inventory_logs
        const logRef = db.collection("inventory_logs").doc();
        transaction.set(logRef, {
          productId: item.id,
          productName: item.name,
          skuCode: prodData.skuCode || '',
          action: 'Stock Decrease',
          change: -item.quantity,
          previousValue: oldStock,
          newValue: newStock,
          adminId: authUser.uid,
          adminName: authUser.name || authUser.email || 'System (Purchase)',
          timestamp: FieldValue.serverTimestamp(),
          reason: `Razorpay Order #${pData.orderId} Completed`,
        });

        // Low stock alert write inside transaction
        if (newStock <= Number(prodData.reorderThreshold ?? 5)) {
          const notifRef = db.collection("admin_notifications").doc(`lowstock-${item.id}-${pData.orderId}`);
          transaction.set(notifRef, {
            title: "Low Stock Alert",
            message: `Product "${item.name}" is low in stock (${newStock} left)`,
            type: "inventory",
            targetId: item.id,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      const isPartial = pData.isPartialPayment === true;
      const paidUpdate = {
        paymentStatus: isPartial ? "Partially Paid" : "Paid",
        status: "processing",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      transaction.update(paymentDocRef, paidUpdate);

      // Update coupon uses if applied
      if (pData.couponCode) {
        const couponRef = db.collection("offers").doc(pData.couponCode);
        const couponSnap = await transaction.get(couponRef);
        if (couponSnap.exists) {
          const cData = couponSnap.data();
          const currentUses = Number(cData.currentUses || 0);
          transaction.update(couponRef, {
            currentUses: currentUses + 1,
          });
        }
      }

      if (pData.orderDocId) {
        transaction.update(db.collection("orders").doc(pData.orderDocId), paidUpdate);

        // Order notification write inside transaction
        const orderNotifRef = db.collection("admin_notifications").doc(`order-${pData.orderId}`);
        transaction.set(orderNotifRef, {
          title: "New Order Placed",
          message: `Order #${pData.orderId} was placed by ${pData.customerName || "Customer"} for ₹${(Number(pData.total) || 0).toLocaleString()}`,
          type: "order",
          targetId: pData.orderDocId,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        alreadyProcessed: false,
        order_number: pData.orderId,
        local_order_id: pData.orderDocId,
      };
    });

    return res.status(200).json({
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      local_order_id: verificationResult.local_order_id || null,
      order_number: verificationResult.order_number || razorpay_order_id,
    });
  } catch (error) {
    console.error("[api/verifyPayment] Error verifying payment:", error);
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Internal server error" });
  }
}
