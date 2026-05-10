/**
 * Netlify Function: Verify Razorpay Payment
 * Endpoint: POST /.netlify/functions/verify-payment
 *
 * Verifies the payment signature to ensure the payment is authentic
 */

import crypto from 'crypto';
import Razorpay from 'razorpay';

export const handler = async (event) => {
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
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature'
        })
      };
    }

    // Get key_secret from environment
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Generate expected signature
    // Signature format: HMAC-SHA256(order_id + "|" + payment_id)
    const payload = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    // Compare signatures
    const signatureMatch = expectedSignature === razorpay_signature;

    if (!signatureMatch) {
      console.error('Payment signature verification failed');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Payment verification failed. Signature mismatch.'
        })
      };
    }

    // Optionally: Verify the payment with Razorpay API
    // This provides additional security by confirming payment exists on Razorpay
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: keySecret
      });

      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      // Check if payment is authorized
      if (payment.status !== 'authorized') {
        console.error('Payment not authorized:', payment.status);
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Payment not authorized'
          })
        };
      }
    } catch (razorpayError) {
      // If Razorpay API call fails, still allow if our signature matched
      // This is a graceful degradation
      console.warn('Razorpay API verification failed, continuing with signature verification:', razorpayError.message);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      })
    };

  } catch (error) {
    console.error('Error verifying payment:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
