// Razorpay Payment Service (Frontend)
// Calls Firebase Functions REST endpoints securely.

import firebaseApp from './firebase';

const rawKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_ID = rawKeyId.trim().replace(/^"|"$/g, '');

// These are REST endpoint URLs pointing to Vercel Serverless Functions.
const CREATE_ORDER_URL = '/api/createOrder';
const VERIFY_PAYMENT_URL = '/api/verifyPayment';
const MARK_PAYMENT_FAILED_URL = '/api/markPaymentFailed';



const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function removeRazorpayScript() {
  document
    .querySelectorAll(`script[src="${RAZORPAY_SCRIPT_URL}"]`)
    .forEach((script) => script.remove());
}

function createRazorpayInstance(RazorpayCheckout, options) {
  if (typeof RazorpayCheckout !== 'function') {
    throw new Error('Razorpay checkout script did not load correctly');
  }

  const candidates = [];

  try {
    candidates.push(new RazorpayCheckout(options));
  } catch (error) {
    console.warn('Razorpay constructor failed:', error);
  }

  try {
    candidates.push(RazorpayCheckout(options));
  } catch (error) {
    console.warn('Razorpay factory call failed:', error);
  }

  const instance = candidates.find((candidate) => candidate && typeof candidate.open === 'function');
  if (instance) return instance;

  const shape = candidates
    .filter(Boolean)
    .map((candidate) => Object.keys(candidate).slice(0, 10).join(', '))
    .filter(Boolean)
    .join(' | ');

  throw new Error(
    shape
      ? `Razorpay checkout is unavailable. Loaded object keys: ${shape}`
      : 'Razorpay checkout is unavailable. Please refresh and try again.'
  );
}

/**
 * Load Razorpay checkout script.
 * @param {{ forceReload?: boolean }} options
 * @returns {Promise<any>} Resolves with window.Razorpay constructor.
 */
export const loadRazorpay = ({ forceReload = false } = {}) => {
  return new Promise((resolve, reject) => {
    if (forceReload) {
      removeRazorpayScript();
      delete window.Razorpay;
    }

    if (typeof window.Razorpay === 'function') {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (typeof window.Razorpay === 'function') resolve(window.Razorpay);
        else reject(new Error('Failed to load Razorpay'));
      }, 100);
    };
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));

    document.body.appendChild(script);
  });
};

async function parseErrorResponse(response) {
  let text = '';
  try {
    text = await response.text();
  } catch {
    // ignore
  }

  if (!text) return null;

  try {
    const data = JSON.parse(text);
    return data?.error || data?.message || null;
  } catch {
    return text;
  }
}

/**
 * Create a Razorpay order via Firebase Functions.
 * @param {number} amountPaise Amount in paise (smallest currency unit)
 * @param {string} currency
 * @param {object} options receipt/notes
 * @returns {Promise<{order_id: string, amount: number, currency: string}>}
 */
export const createRazorpayOrder = async (amountPaise, currency = 'INR', options = {}) => {
  const missing = [];
  if (!CREATE_ORDER_URL) missing.push('VITE_FIREBASE_CREATE_ORDER_URL');
  if (!RAZORPAY_KEY_ID) missing.push('VITE_RAZORPAY_KEY_ID');

  if (missing.length) {
    throw new Error(
      `Razorpay/Payments configuration error: missing ${missing.join(', ')}. ` +
        `Set these in your Vite/hosting environment.`
    );
  }

  const response = await fetch(CREATE_ORDER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: options.receipt,
      notes: options.notes || {},
      customer: options.customer,
      items: options.items,
      totals: options.totals,
      shippingAddress: options.shippingAddress,
    }),
  });

  if (!response.ok) {
    const err = await parseErrorResponse(response);
    throw new Error(err || `Failed to create payment order (${response.status})`);
  }

  const data = await response.json();
  if (!data?.order_id) throw new Error('Invalid order response');
  
  if (data?.key_id) {
    const cleanBackendKey = String(data.key_id).trim().replace(/^"|"$/g, '');
    if (cleanBackendKey !== RAZORPAY_KEY_ID) {
      const mask = (k) => k ? `${k.substring(0, 8)}...${k.substring(k.length - 4)}` : 'undefined';
      throw new Error(
        `Razorpay key mismatch: Frontend key (${mask(RAZORPAY_KEY_ID)}) does not match Backend key (${mask(cleanBackendKey)}). ` +
        `Please ensure VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_ID in Vercel settings are identical.`
      );
    }
  }

  return data;
};


/**
 * Verify Razorpay payment signature via Firebase Functions.
 * Signature verification happens server-side using RAZORPAY_KEY_SECRET.
 */
export const verifyPayment = async (paymentId, orderId, signature, options = {}) => {
  if (!VERIFY_PAYMENT_URL) throw new Error('Missing VITE_FIREBASE_VERIFY_PAYMENT_URL');

  const response = await fetch(VERIFY_PAYMENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
    },
    body: JSON.stringify({
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature,
    }),
  });

  if (!response.ok) {
    const err = await parseErrorResponse(response);
    throw new Error(err || 'Payment verification failed');
  }

  const data = await response.json();
  if (data?.verified !== true) throw new Error('Payment not verified');
  return data;
};

export const markPaymentFailed = async (orderId, options = {}) => {
  if (!MARK_PAYMENT_FAILED_URL) throw new Error('Missing VITE_FIREBASE_MARK_PAYMENT_FAILED_URL');
  if (!orderId) return null;

  const response = await fetch(MARK_PAYMENT_FAILED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
    },
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: options.paymentId,
      reason: options.reason || 'Payment was not completed',
    }),
  });

  if (!response.ok) {
    const err = await parseErrorResponse(response);
    throw new Error(err || 'Failed to update payment status');
  }

  return response.json();
};


/**
 * Open Razorpay checkout modal.
 * @param {object} options Razorpay checkout options plus:
 *  - onSuccess(response)
 *  - onFailure(response)
 *  - onDismiss()
 */
export const openCheckout = async (options) => {
  if (!RAZORPAY_KEY_ID) {
    throw new Error('Razorpay configuration error: missing VITE_RAZORPAY_KEY_ID');
  }
  if (!options) throw new Error('Missing checkout options');

  const checkoutOptions = {
    key: RAZORPAY_KEY_ID,
    ...options,
    handler: (response) => {
      if (typeof options.onSuccess === 'function') options.onSuccess(response);
    },
    modal: {
      ...(options.modal || {}),
      ondismiss: () => {
        if (typeof options.onDismiss === 'function') options.onDismiss();
      },
    },
  };

  let RazorpayCheckout = await loadRazorpay();
  let rzp;

  try {
    rzp = createRazorpayInstance(RazorpayCheckout, checkoutOptions);
  } catch (error) {
    console.warn('Reloading Razorpay checkout after invalid instance:', error);
    RazorpayCheckout = await loadRazorpay({ forceReload: true });
    rzp = createRazorpayInstance(RazorpayCheckout, checkoutOptions);
  }

  if (typeof options.onFailure === 'function' && typeof rzp.on === 'function') {
    rzp.on('payment.failed', options.onFailure);
  }

  rzp.open();
  return rzp;
};

export default {
  loadRazorpay,
  createRazorpayOrder,
  verifyPayment,
  markPaymentFailed,
  openCheckout,
};

