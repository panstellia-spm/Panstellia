/**
 * Netlify Function: Create Razorpay Order
 * Endpoint: POST /.netlify/functions/create-order
 *
 * Creates an order on Razorpay and returns the order_id
 */

import Razorpay from 'razorpay';

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Avoid throwing during module load; handler will return JSON error instead.
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};


const getMissingRazorpayEnv = () => {
  const missing = [];
  if (!process.env.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID');
  if (!process.env.RAZORPAY_KEY_SECRET) missing.push('RAZORPAY_KEY_SECRET');
  return missing;
};


export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const missing = getMissingRazorpayEnv();
    if (missing.length) {
      console.error('Missing Razorpay env vars:', missing);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: `Razorpay configuration error: missing ${missing.join(', ')}`
        })
      };
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const { amount, currency = 'INR', receipt, notes = {} } = body;

    // Extra validation to prevent Razorpay/client crashes
    if (!currency || typeof currency !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid currency' })
      };
    }

    if (receipt && typeof receipt !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid receipt' })
      };
    }

    if (notes && typeof notes !== 'object') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid notes' })
      };
    }




    // Validate amount (minimum 100 paise = ₹1)
    if (!amount || amount < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid amount. Minimum amount is 100 paise (₹1)'
        })
      };
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      // Safety net: env vars were checked above, but avoid crashing if something changes.
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Razorpay client not configured' })
      };
    }

    // Create order on Razorpay
    const order = await razorpay.orders.create({

      amount,
      currency,
      receipt,
      notes: {
        ...notes,
        // Add metadata
        platform: 'panstellia',
        created_at: new Date().toISOString()
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      })
    };

  } catch (error) {
    console.error('Error creating order:', error);

    // Handle Razorpay authentication errors
    if (error.statusCode === 401 || error.error?.code === 'AUTHENTICATION_FAILURE') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Payment gateway authentication failed' })
      };
    }

    // Handle other Razorpay API errors
    if (error.statusCode) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({
          error: error.error?.description || 'Failed to create order'
        })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
