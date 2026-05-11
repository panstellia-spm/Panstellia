// Razorpay Payment Service
// Uses standalone server for server-side order creation and payment verification
// Falls back to simulation mode for local development

const PAYMENT_BACKEND_BASE = import.meta.env.VITE_PAYMENT_BACKEND_URL || '';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;


/**
 * Check if we're running in local development mode
 */
const isLocalDev = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};


/**
 * Load Razorpay checkout script
 * @returns {Promise} - Resolves with Razorpay object
 */
export const loadRazorpay = () => {
  return new Promise((resolve, reject) => {
    // Check if Razorpay script is already loaded
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/razorpay.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error('Failed to load Razorpay'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay script'));
    };
    document.body.appendChild(script);
  });
};


/**
 * Create a Razorpay order
 * - Production: Uses Netlify Functions to call Razorpay API
 * - Local Dev: Uses Netlify Functions (deployed) or direct Razorpay API
 */
export const createRazorpayOrder = async (amount, currency = 'INR', options = {}) => {
  const isLocal = isLocalDev();

  try {
    // 1) Preferred: Standalone backend (server-side Razorpay credentials)
    const response = await fetch(`${PAYMENT_BACKEND_BASE}/create-order`, {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: options.receipt,
        notes: options.notes || {},
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.order_id) return data;
      throw new Error('Payment server returned an unexpected response (missing order_id)');
    }

    // 2) For non-2xx, try to surface backend error body
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      // ignore
    }

    if (errorText) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData?.error) throw new Error(errorData.error);
        if (errorData?.message) throw new Error(errorData.message);
      } catch {
        // ignore (non-json)
      }
    }

    // 3) Retry once on transient gateway errors
    if ([502, 503, 504].includes(response.status)) {
      console.warn(`Payment server error (HTTP ${response.status}). Retrying once...`);
      const response2 = await fetch(`${PAYMENT_BACKEND_BASE}/create-order`, {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: options.receipt,
          notes: options.notes || {},
        }),
      });

      if (response2.ok) {
        const data2 = await response2.json();
        if (data2?.order_id) return data2;
      }

      let errorText2 = '';
      try {
        errorText2 = await response2.text();
      } catch {
        // ignore
      }
      throw new Error(
        `Payment server unavailable (HTTP ${response2.status})${errorText2 ? `: ${errorText2}` : ''}`
      );
    }

    // 4) If we’re here, server rejected the request; in local dev we can fall back.
    if (isLocal) {
      console.warn('Payment server rejected request in local mode - falling back');
      return createMockOrder(amount, currency, options);
    }

    throw new Error(
      `Payment server unavailable (HTTP ${response.status})${errorText ? `: ${errorText}` : ''}`
    );
  } catch (error) {
    console.error('Error creating Razorpay order:', error);

    // Network error - likely no backend available locally
    const msg = error?.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      if (isLocal) {
        console.warn('Network error - creating mock order for testing');
        return createMockOrder(amount, currency, options);
      }
      throw new Error('Unable to connect to payment server. Please try again.');
    }

    if (msg.includes('401') || msg.includes('AUTHENTICATION_FAILURE')) {
      throw new Error('Payment configuration error. Please contact support.');
    }

    throw error;
  }
};



/**
 * Create a mock order for local testing when no backend is available
 */
const createMockOrder = (amount, currency, options) => {
  const mockOrderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  console.log('Created mock order:', mockOrderId, 'for amount:', amount);
  
  return {
    order_id: mockOrderId,
    amount,
    currency
  };
};


/**
 * Verify payment signature
 * - Production: Uses standalone backend
 * - Local Dev: Skips server verification (for testing)
 */
export const verifyPayment = async (paymentId, orderId, signature) => {
  const isLocal = isLocalDev();
  
  try {
    // Try standalone backend first
    const response = await fetch(`${PAYMENT_BACKEND_BASE}/verify-payment`, {

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

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      // Try to get error message from response
      let errorMessage = 'Payment verification failed';
      try {
        const errorText = await response.text();
        if (errorText) {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      } catch (parseError) {
        // Ignore parse errors, use default message
      }
      throw new Error(errorMessage);
    }
    if (isLocal) {
      console.log('Skipping server verification in local dev mode');
      return {
        verified: true,
        payment_id: paymentId,
        order_id: orderId
      };
    }
    
    throw new Error('Payment verification failed');
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    // In local dev mode, allow mock verification
    if (isLocal) {
      console.warn('Verification error in local mode - allowing for testing');
      return {
        verified: true,
        payment_id: paymentId,
        order_id: orderId
      };
    }
    
    throw error;
  }
};


/**
 * Open Razorpay checkout modal
 * @param {object} options - Razorpay checkout options
 * @returns {Promise} - Payment response
 */
export const openCheckout = async (options) => {
  if (!RAZORPAY_KEY_ID) {
    throw new Error('Razorpay configuration error: missing VITE_RAZORPAY_KEY_ID');
  }

  const razorpay = await loadRazorpay();
  
  const defaultOptions = {
    key: RAZORPAY_KEY_ID,
    handler: (response) => {
      if (options.onSuccess) {
        options.onSuccess(response);
      }
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      }
    }
  };

  const rzp = new razorpay({
    ...defaultOptions,
    ...options
  });

  rzp.open();

  return rzp;
};


export default {
  loadRazorpay,
  createRazorpayOrder,
  verifyPayment,
  openCheckout
};
