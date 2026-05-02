// Razorpay Payment Service
// Uses Netlify Functions for server-side order creation and payment verification
// Falls back to simulation mode for local development

const NETLIFY_FUNCTIONS_BASE = ''; // Empty string uses same origin (works with Netlify)
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SkY8Bdi8iAl2go';


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
    // Try Netlify Functions first (works in both dev and prod if Functions are accessible)
    const response = await fetch(`${NETLIFY_FUNCTIONS_BASE}/.netlify/functions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: options.receipt,
        notes: options.notes || {}
      }),
    });

    if (response.ok) {
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        if (data.order_id) {
          return data;
        }
      }
    }
    
    // If Netlify Functions failed, check for local development
    // Use direct Razorpay API for local development
    if (isLocal) {
      console.log('Using direct Razorpay API for local development');
      
      // Get credentials from environment
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      const keySecret = import.meta.env.VITE_RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        console.warn('Missing Razorpay credentials for direct API call');
        // Fall back to creating a mock order for UI testing
        return createMockOrder(amount, currency, options);
      }
      
      const auth = btoa(`${keyId}:${keySecret}`);
      
      const apiResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: options.receipt,
          notes: options.notes || {}
        }),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(errorText || `Razorpay API error: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      return {
        order_id: data.id,
        amount: data.amount,
        currency: data.currency
      };
    }
    
    // If we get here, something went wrong
    throw new Error('Payment server unavailable');
    
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      // Network error - might be running locally without backend
      if (isLocal) {
        console.warn('Network error - creating mock order for testing');
        return createMockOrder(amount, currency, options);
      }
      throw new Error('Unable to connect to payment server. Please try again.');
    }
    
    if (error.message.includes('401') || error.message.includes('AUTHENTICATION_FAILURE')) {
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
 * - Production: Uses Netlify Functions
 * - Local Dev: Skips server verification (for testing)
 */
export const verifyPayment = async (paymentId, orderId, signature) => {
  const isLocal = isLocalDev();
  
  try {
    // Try Netlify Functions first
    const response = await fetch(`${NETLIFY_FUNCTIONS_BASE}/.netlify/functions/verify-payment`, {
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
    }
    
    // If Netlify Functions failed and we're in local dev mode
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
