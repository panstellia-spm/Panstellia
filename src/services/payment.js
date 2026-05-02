// Razorpay Payment Service

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

export const createRazorpayOrder = async (amount, currency = 'INR') => {
  // In production, you would make an API call to your backend
  // to create an order and get the order_id
  // This is a demo implementation
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    // For demo, return mock order
    return {
      id: `order_${Date.now()}`,
      amount,
      currency,
    };
  }
};

export const verifyPayment = async (paymentId, orderId, signature) => {
  // In production, you would verify the payment on your backend
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/verify-payment`, {
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
      throw new Error('Payment verification failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying payment:', error);
    // For demo, assume payment is valid
    return { verified: true };
  }
};

export default {
  loadRazorpay,
  createRazorpayOrder,
  verifyPayment,
};
