/*
  Firebase Functions v2 - Razorpay backend (REST-style HTTPS endpoints)

  Endpoints:
    POST /create-order
    POST /verify-payment

  Security requirements satisfied:
    - RAZORPAY_KEY_SECRET is ONLY used inside Functions runtime env vars.
    - Frontend never sees secrets.
    - verify-payment uses constant-time signature comparison.
    - Strict input validation + generic error messages.
*/

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');

// Initialize Admin SDK (safe even if you only use Functions)
admin.initializeApp();

// Configure CORS.
// Recommended: set CORS_ORIGIN to your Netlify frontend origin, e.g. https://your-site.netlify.app
const corsOrigin = process.env.CORS_ORIGIN || '';
const corsMiddleware = cors({
  origin: (origin, cb) => {
    // If you need support for requests without Origin header, allow them.
    // But keep in mind: CORS is a browser protection; verification is enforced server-side.
    if (!origin) return cb(null, true);

    // If CORS_ORIGIN is not set, default to rejecting cross-origin requests.
    if (!corsOrigin) return cb(null, false);

    // Allow exact match.
    if (origin === corsOrigin) return cb(null, true);

    // Reject everything else.
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Helper: wrap endpoint with CORS + JSON parsing.
async function handleWithCors(req, res, handler) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    corsMiddleware(req, res, () => {
      res.status(204).send('');
    });
    return;
  }

  // Apply CORS
  corsMiddleware(req, res, () => handler(req, res));
}

function jsonError(res, statusCode, message) {
  return res.status(statusCode).json({ error: message });
}

function getRazorpayKeySecretOrNull() {
  return process.env.RAZORPAY_KEY_SECRET || null;
}

function getRazorpayKeyIdOrNull() {
  return process.env.RAZORPAY_KEY_ID || null;
}

function getRazorpayClientOrThrow() {
  const keyId = getRazorpayKeyIdOrNull();
  const keySecret = getRazorpayKeySecretOrNull();

  if (!keyId || !keySecret) {
    // Throw so we can return a safe generic message.
    throw new Error('Razorpay env vars missing');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function parseJsonBody(req) {
  // Functions v2 provides express-like req/res. Body may already be parsed.
  // We'll safely parse only if it's a string.
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        const obj = JSON.parse(req.body);
        return resolve(obj);
      } catch (e) {
        return reject(new Error('Invalid JSON'));
      }
    }

    // If body is undefined, treat as invalid.
    return reject(new Error('Missing body'));
  });
}

function validateAmount(amount) {
  // Razorpay amount is in smallest currency unit (paise for INR).
  // Enforce numeric and minimum of 100 paise = ₹1.
  const n = Number(amount);
  if (!Number.isFinite(n)) return { ok: false, reason: 'Invalid amount type' };
  if (n < 100) return { ok: false, reason: 'Amount too small' };
  // Razorpay expects integer amounts for paise.
  if (!Number.isInteger(n)) return { ok: false, reason: 'Amount must be an integer' };
  return { ok: true, value: n };
}

function safeReceipt(receipt) {
  if (!receipt) return undefined;
  if (typeof receipt !== 'string') throw new Error('Invalid receipt');
  // Limit length to avoid huge payloads
  if (receipt.length > 200) throw new Error('Receipt too long');
  return receipt;
}

function safeNotes(notes) {
  if (notes == null) return undefined;
  if (typeof notes !== 'object' || Array.isArray(notes)) throw new Error('Invalid notes');

  // Only allow primitive string/number values to avoid nested objects
  const out = {};
  for (const [k, v] of Object.entries(notes)) {
    if (typeof v === 'string') out[k] = v.slice(0, 200);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (v == null) continue;
    else throw new Error('Invalid notes value');
  }

  return out;
}

function constantTimeEqual(a, b) {
  // Use timingSafeEqual when lengths match; otherwise return false.
  // Razorpay signature is hex string.
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return crypto.timingSafeEqual(bufA, bufB);
}

// Create Razorpay order
const createOrderHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method Not Allowed');
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (e) {
    return jsonError(res, 400, 'Invalid request body');
  }

  const { amount, currency = 'INR', receipt, notes } = body ?? {};

  if (!currency || typeof currency !== 'string') {
    return jsonError(res, 400, 'Invalid currency');
  }

  const amountValidation = validateAmount(amount);
  if (!amountValidation.ok) {
    return jsonError(res, 400, 'Invalid amount');
  }

  let safeReceiptValue;
  let safeNotesValue;
  try {
    safeReceiptValue = safeReceipt(receipt);
    safeNotesValue = safeNotes(notes);
  } catch {
    return jsonError(res, 400, 'Invalid receipt/notes');
  }

  // Create order
  let razorpay;
  try {
    // Ensure secrets exist (throws if not)
    razorpay = getRazorpayClientOrThrow();
  } catch {
    return jsonError(res, 500, 'Server configuration error');
  }

  try {
    const order = await razorpay.orders.create({
      amount: amountValidation.value,
      currency,
      receipt: safeReceiptValue,
      notes: {
        // Keep metadata in notes
        platform: 'panstellia',
        created_at: new Date().toISOString(),
        ...(safeNotesValue || {}),
      },
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    // Avoid leaking details
    // Common auth failures: 401
    if (err?.statusCode === 401 || err?.error?.code === 'AUTHENTICATION_FAILURE') {
      return jsonError(res, 401, 'Payment gateway authentication failed');
    }

    // Generic gateway failure
    return jsonError(res, 502, 'Failed to create payment order');
  }
};

// Verify payment signature
const verifyPaymentHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method Not Allowed');
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    return jsonError(res, 400, 'Invalid request body');
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body ?? {};

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return jsonError(
      res,
      400,
      'Missing required fields'
    );
  }

  if (typeof razorpay_payment_id !== 'string' || typeof razorpay_order_id !== 'string' || typeof razorpay_signature !== 'string') {
    return jsonError(res, 400, 'Invalid fields');
  }

  const keySecret = getRazorpayKeySecretOrNull();
  const keyId = getRazorpayKeyIdOrNull();

  if (!keySecret || !keyId) {
    return jsonError(res, 500, 'Server configuration error');
  }

  // Signature payload per Razorpay spec: order_id|payment_id
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  const signatureMatch = constantTimeEqual(expectedSignature, razorpay_signature);
  if (!signatureMatch) {
    return jsonError(res, 400, 'Payment verification failed');
  }

  // Optional strictness: verify payment status exists/allowed via Razorpay API.
  // If Razorpay API fails, we still keep signature verification as the primary check.
  // You can change this to reject hard if you want.
  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const allowedStatuses = new Set(['authorized', 'captured', 'paid', 'settled']);

    if (payment?.status && !allowedStatuses.has(payment.status)) {
      return jsonError(res, 400, 'Payment not in a successful state');
    }
  } catch {
    // Signature is primary security guarantee; don't leak or block on fetch failure.
  }

  // Persist payment verification details to Firestore.
  // Collection: payments/{razorpayPaymentId}
  // Notes: We intentionally store only non-secret, verification-related fields.
  try {
    const paymentDoc = {
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      razorpay_signature,
      verified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Best-effort: store Razorpay status if we managed to fetch it.
    };

    // If Razorpay fetch succeeded above, attempt to extract common fields.
    // (We didn't keep `payment` from the try/catch scope; re-fetch lightly is costly.
    // So we only store the verification fields here.)

    await admin.firestore().collection('payments').doc(razorpay_payment_id).set(paymentDoc, { merge: true });
  } catch (e) {
    // Payment is already verified; don't fail the API call because persistence failed.
    console.error('Failed to persist payment details:', e);
  }

  return res.status(200).json({
    verified: true,
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
  });
};


// Use functions v2 with express-like onRequest
// Note: functions v2 doesn't automatically add body parsing; we use parseJsonBody above.
exports.createOrder = functions
  .onRequest(async (req, res) => {
    await handleWithCors(req, res, createOrderHandler);
  })
  .runWith({
    timeoutSeconds: 30,
    // memory default is usually fine; increase if needed.
    // ensure Node 20 runtime is used by Firebase.
  });

exports.verifyPayment = functions
  .onRequest(async (req, res) => {
    await handleWithCors(req, res, verifyPaymentHandler);
  })
  .runWith({
    timeoutSeconds: 30,
  });

