/**
 * Netlify Function: Create Razorpay Order
 * Endpoint: POST /.netlify/functions/create-order
 * 
 * Creates an order on Razorpay and returns the order_id
 */

const Razorpay = require('razorpay');

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { amount, currency = 'INR', receipt, notes = {} } = body;

    // Validate amount (minimum 100 paise = ₹1)
    if (!amount || amount < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid amount. Minimum amount is 100 paise (₹1)' 
        })
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
