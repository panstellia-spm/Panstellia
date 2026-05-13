const cors = require("cors");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Firebase Functions v2
const { onRequest } = require("firebase-functions/v2/https");

// Initialize Firebase Admin (if you later need Firestore; harmless otherwise)
try {
  admin.initializeApp();
} catch (e) {
  // ignore if already initialized
}

const allowedOrigins = [
  "http://localhost:5173",
  "https://panstellia.vercel.app",
  "https://panstellia-6ursnuep7-panstellia-spms-projects.vercel.app",
];

const corsMiddleware = cors({
  // Reflect only explicitly allowed origins
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
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
  if (!allowedOrigins.includes(origin)) return;

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
  return onRequest(async (req, res) => {
    // Log minimal request info for debugging CORS/preflight
    console.log("[functions] incoming request", {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      host: req.headers.host,
    });

    // Ensure we always set the CORS headers before responding.
    setExplicitCorsHeaders(req, res);

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
  });
}


function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) return null;

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function getMissingRazorpayEnv() {
  const missing = [];
  if (!process.env.RAZORPAY_KEY_ID) missing.push("RAZORPAY_KEY_ID");
  if (!process.env.RAZORPAY_KEY_SECRET) missing.push("RAZORPAY_KEY_SECRET");
  return missing;
}

async function createOrderHandler(req, res) {
  try {
    const razorpay = getRazorpayClient();
    const missing = getMissingRazorpayEnv();

    if (missing.length) {
      console.error("[functions] Missing Razorpay env vars:", missing);
      return res
        .status(500)
        .json({ error: `Razorpay configuration error: missing ${missing.join(", ")}` });
    }

    const { amount, currency = "INR", receipt, notes = {} } = req.body ?? {};

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
        error: "Invalid amount. Minimum amount is 100 paise (₹1)",
      });
    }

    console.log("[functions] Creating Razorpay order", {
      amount: amountNum,
      currency,
      receipt,
    });

    const order = await razorpay.orders.create({
      amount: amountNum,
      currency,
      receipt,
      notes: {
        ...notes,
        platform: "panstellia",
        created_at: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("[functions] Error creating order:", error);

    const statusCode = error?.statusCode || 500;
    const code = error?.error?.code;

    if (statusCode === 401 || code === "AUTHENTICATION_FAILURE") {
      return res.status(401).json({ error: "Payment gateway authentication failed" });
    }

    if (statusCode && statusCode !== 500) {
      return res.status(statusCode).json({
        error: error?.error?.description || "Failed to create order",
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}

async function verifyPaymentHandler(req, res) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body ?? {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        error: "Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const keyId = process.env.RAZORPAY_KEY_ID;

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

    if (expectedSignature !== razorpay_signature) {
      console.error("[functions] Payment signature verification failed");
      return res.status(400).json({ error: "Payment verification failed. Signature mismatch." });
    }

    // Optional extra guard: verify payment status against Razorpay API
    // (Do NOT fail hard if Razorpay API fetch fails; signature is the main guard)
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

    return res.status(200).json({
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (error) {
    console.error("[functions] Error verifying payment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------- Firestore billing persistence (optional) ----------------
// Note: your firestore.rules currently allow creating /orders/{orderId} only when
// request.auth != null AND request.resource.data.userId == request.auth.uid.
// Since you selected option B (no auth token), client writes cannot satisfy
// those rules. Therefore, we do NOT write into /orders or /payments here to
// avoid breaking production.
//
// If you switch to option A later, we can persist using request.auth.uid safely.

exports.createOrder = withCors(createOrderHandler);
exports.verifyPayment = withCors(verifyPaymentHandler);


