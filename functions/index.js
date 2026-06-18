const cors = require("cors");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Firebase Functions v2
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

const FUNCTION_REGION = process.env.FUNCTION_REGION || "asia-south1";

// Initialize Firebase Admin (if you later need Firestore; harmless otherwise)
try {
  admin.initializeApp();
} catch (e) {
  // ignore if already initialized
}

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://panstellia.vercel.app",
  "https://panstellia.com",
  "https://www.panstellia.com",
];

function getAllowedOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...defaultAllowedOrigins, ...configuredOrigins]);
}

function isOriginAllowed(origin) {
  return !origin || getAllowedOrigins().has(origin);
}

function isRazorpayAuthError(error) {
  const statusCode = error?.statusCode || error?.error?.statusCode;
  const code = error?.error?.code || error?.code;
  const description = String(error?.error?.description || error?.message || "").toLowerCase();

  return (
    statusCode === 401 ||
    code === "AUTHENTICATION_FAILURE" ||
    description.includes("authentication failed")
  );
}

const corsMiddleware = cors({
  // Reflect only explicitly allowed origins
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl)
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },

  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],

  // Keep false so browsers don't require credentials/withCredentials.
  credentials: false,
});

function setExplicitCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  if (!isOriginAllowed(origin)) return;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

/**
 * Wraps an onRequest handler with CORS.
 * Important: handle OPTIONS preflight without invoking the main handler.
 */
function withCors(handler) {
  return onRequest(
    {
      region: FUNCTION_REGION,
      secrets: [razorpayKeyId, razorpayKeySecret],
    },
    async (req, res) => {
    // Log minimal request info for debugging CORS/preflight
    console.log("[functions] incoming request", {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      host: req.headers.host,
    });

    // Ensure we always set the CORS headers before responding.
    setExplicitCorsHeaders(req, res);

    if (!isOriginAllowed(req.headers.origin)) {
      console.warn("[functions] blocked CORS origin", req.headers.origin);
      return res.status(403).json({ error: "CORS blocked" });
    }

    // Run CORS middleware to apply its headers as well.
    corsMiddleware(req, res, (err) => {
      // If origin isn't allowed, respond with 403 but still avoid missing headers.
      if (err) {
        console.error("[functions] CORS error:", err?.message || err);
        // If origin not allowed, browsers will treat as blocked anyway.
        return res.status(403).json({ error: "CORS blocked" });
      }

      // Preflight: respond immediately.
      if (req.method === "OPTIONS") {
        console.log("[functions] OPTIONS preflight ok -> 204");
        return res.status(204).send("");
      }

      // Only allow POST after preflight
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
      }

      return handler(req, res);
    });
    }
  );
}

function readEnvOrSecret(secretParam, envName) {
  try {
    const secretValue = secretParam.value();
    if (secretValue) return secretValue;
  } catch {
    // Falls back to process.env for local emulator and non-secret env usage.
  }

  return process.env[envName];
}

function getRazorpayClient() {
  const keyId = readEnvOrSecret(razorpayKeyId, "RAZORPAY_KEY_ID");
  const keySecret = readEnvOrSecret(razorpayKeySecret, "RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) return null;

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function getMissingRazorpayEnv() {
  const missing = [];
  if (!readEnvOrSecret(razorpayKeyId, "RAZORPAY_KEY_ID")) missing.push("RAZORPAY_KEY_ID");
  if (!readEnvOrSecret(razorpayKeySecret, "RAZORPAY_KEY_SECRET")) missing.push("RAZORPAY_KEY_SECRET");
  return missing;
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
    console.error("[functions] Firebase auth token verification failed:", authError?.message || authError);
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    throw error;
  }
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function sanitizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.slice(0, 50).map((item) => ({
    id: String(item?.id || ""),
    name: String(item?.name || "Jewellery Item").slice(0, 160),
    price: toNumber(item?.price),
    quantity: Math.max(1, Math.min(99, Math.floor(toNumber(item?.quantity, 1)))),
    image: String(item?.image || ""),
    category: String(item?.category || ""),
  }));
}

function sanitizeCustomer(customer, token) {
  return {
    name: String(customer?.name || token.name || "").slice(0, 120),
    email: String(customer?.email || token.email || "").slice(0, 160),
    phone: String(customer?.phone || "").slice(0, 32),
  };
}

function sanitizeAddress(address) {
  return {
    address: String(address?.address || "").slice(0, 500),
    city: String(address?.city || "").slice(0, 120),
    state: String(address?.state || "").slice(0, 120),
    pincode: String(address?.pincode || "").slice(0, 20),
    apartment: address?.apartment ? String(address.apartment).slice(0, 120) : "",
    landmark: address?.landmark ? String(address.landmark).slice(0, 120) : "",
    country: address?.country ? String(address.country).slice(0, 120) : "",
    addressLabel: address?.addressLabel ? String(address.addressLabel).slice(0, 50) : "",
  };
}

function buildOrderNumber(prefix = "PAN") {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

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

async function createOrderHandler(req, res) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const razorpay = getRazorpayClient();
    const missing = getMissingRazorpayEnv();

    if (missing.length) {
      console.error("[functions] Missing Razorpay env vars:", missing);
      return res
        .status(500)
        .json({ error: `Razorpay configuration error: missing ${missing.join(", ")}` });
    }

    const {
      amount,
      currency = "INR",
      receipt,
      notes = {},
      customer,
      items,
      totals = {},
      shippingAddress,
    } = req.body ?? {};

    if (!currency || typeof currency !== "string") {
      return res.status(400).json({ error: "Invalid currency" });
    }

    if (receipt && typeof receipt !== "string") {
      return res.status(400).json({ error: "Invalid receipt" });
    }

    if (notes && typeof notes !== "object") {
      return res.status(400).json({ error: "Invalid notes" });
    }

    const amountNum = Number(amount);
    if (!amountNum || !Number.isFinite(amountNum) || amountNum < 100) {
      return res.status(400).json({
        error: "Invalid amount. Minimum amount is 100 paise (Rs. 1)",
      });
    }

    const orderItems = sanitizeItems(items);
    if (!orderItems.length) {
      return res.status(400).json({ error: "Order must include at least one item" });
    }

    const customerInfo = sanitizeCustomer(customer, authUser);
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      return res.status(400).json({ error: "Missing customer name, email, or phone" });
    }

    const addressInfo = sanitizeAddress(shippingAddress);
    if (!addressInfo.address) {
      return res.status(400).json({ error: "Missing shipping address" });
    }

    const orderNumber = buildOrderNumber();

    const db = admin.firestore();

    // Verify stock availability before calling Razorpay API
    for (const item of orderItems) {
      const pSnap = await db.collection("products").doc(item.id).get();
      if (!pSnap.exists) {
        return res.status(404).json({ error: `Product "${item.name}" not found.` });
      }
      const pData = pSnap.data();
      const stockQuantity = Number(pData.stockQuantity ?? 0);
      const reservedQuantity = Number(pData.reservedQuantity ?? 0);
      const available = stockQuantity - reservedQuantity;
      if (available < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for "${item.name}". Only ${available} available.` });
      }
    }

    console.log("[functions] Creating Razorpay order", {
      amount: amountNum,
      currency,
      receipt,
      orderNumber,
    });

    const order = await razorpay.orders.create({
      amount: amountNum,
      currency,
      receipt,
      notes: {
        ...notes,
        order_number: orderNumber,
        user_id: authUser.uid,
        platform: "panstellia",
        created_at: new Date().toISOString(),
      },
    });

    // Run transaction to reserve stock and save order/payment
    const transactionResult = await db.runTransaction(async (transaction) => {
      const productDocs = [];
      for (const item of orderItems) {
        const productRef = db.collection("products").doc(item.id);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists) {
          throw new Error(`Product ${item.name} not found`);
        }
        productDocs.push({ ref: productRef, snap: productSnap, item });
      }

      const productUpdates = [];
      for (const { ref, snap, item } of productDocs) {
        const data = snap.data();
        const stockQuantity = Number(data.stockQuantity ?? 0);
        const reservedQuantity = Number(data.reservedQuantity ?? 0);
        const availableQuantity = stockQuantity - reservedQuantity;

        if (availableQuantity < item.quantity) {
          throw new Error(`Insufficient stock for "${item.name}". Only ${availableQuantity} available.`);
        }

        const newReserved = reservedQuantity + item.quantity;
        const newAvailable = stockQuantity - newReserved;

        let inventoryStatus = 'in_stock';
        if (stockQuantity <= 0) {
          inventoryStatus = 'out_of_stock';
        } else if (stockQuantity <= Number(data.reorderThreshold ?? 5)) {
          inventoryStatus = 'low_stock';
        }

        productUpdates.push({
          ref,
          data: {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            inventoryStatus,
            lastStockUpdate: new Date().toISOString(),
            stockUpdatedBy: `System (Reservation #${orderNumber})`,
          }
        });
      }

      for (const update of productUpdates) {
        transaction.update(update.ref, update.data);
      }

      const orderRef = db.collection("orders").doc();
      const paymentRef = db.collection("payments").doc();

      const commonOrderData = {
        userId: authUser.uid,
        orderId: orderNumber,
        razorpayOrderId: order.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        phone: customerInfo.phone,
        items: orderItems,
        subtotal: toNumber(totals.subtotal),
        shipping: toNumber(totals.shipping),
        tax: toNumber(totals.tax),
        total: amountNum / 100,
        amount: amountNum,
        currency,
        paymentMethod: "razorpay",
        paymentStatus: "Pending",
        status: "pending_payment",
        address: addressInfo.address,
        city: addressInfo.city,
        state: addressInfo.state,
        pincode: addressInfo.pincode,
        apartment: addressInfo.apartment || "",
        landmark: addressInfo.landmark || "",
        country: addressInfo.country || "",
        addressLabel: addressInfo.addressLabel || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(orderRef, commonOrderData);
      transaction.set(paymentRef, {
        ...commonOrderData,
        orderDocId: orderRef.id,
      });

      return {
        orderDocId: orderRef.id,
        paymentDocId: paymentRef.id,
      };
    });

    return res.status(200).json({
      order_id: order.id,
      key_id: readEnvOrSecret(razorpayKeyId, "RAZORPAY_KEY_ID"),
      local_order_id: transactionResult.orderDocId,
      payment_record_id: transactionResult.paymentDocId,
      order_number: orderNumber,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("[functions] Error creating order:", error);

    const statusCode = error?.statusCode || 500;

    if (isRazorpayAuthError(error)) {
      return res.status(401).json({
        error:
          "Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are from the same Razorpay key pair, then redeploy functions.",
      });
    }

    if (statusCode && statusCode !== 500) {
      return res.status(statusCode).json({
        error: error?.error?.description || error?.message || "Failed to create order",
      });
    }

    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}

async function verifyPaymentHandler(req, res) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body ?? {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        error: "Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature",
      });
    }

    const keySecret = readEnvOrSecret(razorpayKeySecret, "RAZORPAY_KEY_SECRET");
    const keyId = readEnvOrSecret(razorpayKeyId, "RAZORPAY_KEY_ID");

    if (!keySecret) {
      console.error("[functions] RAZORPAY_KEY_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Signature verification
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, razorpay_signature)) {
      console.error("[functions] Payment signature verification failed");
      const pendingPayment = await findPendingPaymentByRazorpayOrderId(razorpay_order_id, authUser.uid);
      if (pendingPayment) {
        const failedUpdate = {
          paymentStatus: "Failed",
          status: "payment_failed",
          razorpayPaymentId: razorpay_payment_id,
          failureReason: "Signature mismatch",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
        "[functions] Razorpay API verification failed, continuing with signature verification:",
        razorpayError?.message || razorpayError
      );
    }

    console.log("[functions] Payment verified", {
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
        return {
          alreadyProcessed: true,
          order_number: pData.orderId,
          local_order_id: pData.orderDocId,
        };
      }

      // Deduct stock for each item
      for (const item of pData.items) {
        const productRef = db.collection("products").doc(item.id);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists) {
          const prodData = productSnap.data();
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

          transaction.update(productRef, {
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
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            reason: `Razorpay Order #${pData.orderId} Completed`,
          });
        }
      }

      const paidUpdate = {
        paymentStatus: "Paid",
        status: "processing",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.update(paymentDocRef, paidUpdate);
      if (pData.orderDocId) {
        transaction.update(db.collection("orders").doc(pData.orderDocId), paidUpdate);
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
    console.error("[functions] Error verifying payment:", error);
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Internal server error" });
  }
}

async function markPaymentFailedHandler(req, res) {
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
        for (const item of pData.items) {
          const productRef = db.collection("products").doc(item.id);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists) {
            const prodData = productSnap.data();
            const oldStock = Number(prodData.stockQuantity ?? 0);
            const oldReserved = Number(prodData.reservedQuantity ?? 0);

            const newReserved = Math.max(0, oldReserved - item.quantity);
            const newAvailable = oldStock - newReserved;

            transaction.update(productRef, {
              reservedQuantity: newReserved,
              availableQuantity: newAvailable,
              lastStockUpdate: new Date().toISOString(),
              stockUpdatedBy: 'System (Failed Payment Release)',
            });
          }
        }

        const failedUpdate = {
          paymentStatus: "Failed",
          status: "payment_failed",
          razorpayPaymentId: razorpay_payment_id || null,
          failureReason: String(reason).slice(0, 300),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    console.error("[functions] Error marking payment failed:", error);
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Internal server error" });
  }
}

exports.createOrder = withCors(createOrderHandler);
exports.verifyPayment = withCors(verifyPaymentHandler);
exports.markPaymentFailed = withCors(markPaymentFailedHandler);


