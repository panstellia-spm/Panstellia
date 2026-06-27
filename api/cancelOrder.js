import admin from './_firebaseAdmin.js';
import { handleCors } from './_cors.js';

const FieldValue = admin.firestore.FieldValue;

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
    const { order_id } = req.body ?? {};

    if (!order_id) {
      return res.status(400).json({ error: "Missing order_id" });
    }

    const db = admin.firestore();
    
    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection("orders").doc(order_id);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error("Order not found");
      }

      const orderData = orderSnap.data();

      if (orderData.userId !== authUser.uid && authUser.email !== process.env.VITE_ADMIN_EMAIL) {
        throw new Error("Unauthorized access to order");
      }

      if (orderData.status === "cancelled") {
        throw new Error("Order is already cancelled");
      }

      const isPending = orderData.status === "pending_payment" || (orderData.paymentStatus || "").toLowerCase() === "pending";
      
      if (!isPending) {
        throw new Error("Only pending orders can be cancelled by the user");
      }

      // Mark order as cancelled
      transaction.update(orderRef, {
        status: "cancelled",
        paymentStatus: "Cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Mark payment doc as cancelled
      const paymentsQuery = await transaction.get(
        db.collection("payments").where("orderDocId", "==", order_id).limit(1)
      );

      if (!paymentsQuery.empty) {
        transaction.update(paymentsQuery.docs[0].ref, {
          paymentStatus: "Cancelled",
          status: "cancelled",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Restore inventory (release reserved quantity)
      // Note: If Checkout.jsx already released this, it might result in a double release.
      // But we use Math.max(0) to prevent negative reserved quantities.
      for (const item of (orderData.items || [])) {
        const productRef = db.collection("products").doc(item.id);
        const pSnap = await transaction.get(productRef);
        if (pSnap.exists) {
          const pData = pSnap.data();
          const oldReserved = Number(pData.reservedQuantity ?? 0);
          const oldStock = Number(pData.stockQuantity ?? 0);
          
          const newReserved = Math.max(0, oldReserved - item.quantity);
          const newAvailable = oldStock - newReserved;

          transaction.update(productRef, {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            lastStockUpdate: new Date().toISOString(),
            stockUpdatedBy: `System (Cancel Order #${orderData.orderId})`,
          });
        }
      }

      // Log cancellation in inventory logs
      const logRef = db.collection("inventory_logs").doc();
      transaction.set(logRef, {
        productId: "MULTIPLE",
        productName: "Order Cancellation",
        action: "Reservation Released",
        adminId: authUser.uid,
        adminName: authUser.name || authUser.email || 'Customer',
        timestamp: FieldValue.serverTimestamp(),
        reason: `Order #${orderData.orderId} cancelled by user`,
      });

    });

    return res.status(200).json({ success: true, message: "Order cancelled successfully" });

  } catch (error) {
    console.error("[api/cancelOrder] Error:", error);
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Internal server error" });
  }
}
