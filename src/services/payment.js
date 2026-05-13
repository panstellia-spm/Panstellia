// Razorpay Payment Service (Frontend)
// Calls Firebase Functions REST endpoints securely.

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// These are REST endpoint URLs (NO secrets).
const CREATE_ORDER_URL = import.meta.env.VITE_FIREBASE_CREATE_ORDER_URL;
const VERIFY_PAYMENT_URL = import.meta.env.VITE_FIREBASE_VERIFY_PAYMENT_URL;



/**
 * Load Razorpay checkout script.
 * @returns {Promise<any>} Resolves with window.Razorpay constructor.
 */
export const loadRazorpay = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/razorpay.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Failed to load Razorpay'));
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
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: options.receipt,
      notes: options.notes || {},
    }),
  });

  if (!response.ok) {
    const err = await parseErrorResponse(response);
    throw new Error(err || 'Failed to create payment order');
  }

  const data = await response.json();
  if (!data?.order_id) throw new Error('Invalid order response');

  return data;
};


/**
 * Verify Razorpay payment signature via Firebase Functions.
 * Signature verification happens server-side using RAZORPAY_KEY_SECRET.
 */
export const verifyPayment = async (paymentId, orderId, signature) => {
  if (!VERIFY_PAYMENT_URL) throw new Error('Missing VITE_FIREBASE_VERIFY_PAYMENT_URL');

  const response = await fetch(VERIFY_PAYMENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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


/**
 * Open Razorpay checkout modal.
 * @param {object} options Razorpay checkout options plus:
 *  - onSuccess(response)
 *  - onDismiss()
 */
export const openCheckout = async (options) => {
  if (!RAZORPAY_KEY_ID) {
    throw new Error('Razorpay configuration error: missing VITE_RAZORPAY_KEY_ID');
  }
  if (!options) throw new Error('Missing checkout options');

  const razorpay = await loadRazorpay();

  const rzp = new razorpay({
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
  });

  rzp.open();
  return rzp;
};

export default {
  loadRazorpay,
  createRazorpayOrder,
  verifyPayment,
  openCheckout,
};

