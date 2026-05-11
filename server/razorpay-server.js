import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const getMissingEnv = () => {
  const missing = [];
  if (!process.env.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID');
  if (!process.env.RAZORPAY_KEY_SECRET) missing.push('RAZORPAY_KEY_SECRET');
  return missing;
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) return null;

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

app.post('/create-order', async (req, res) => {
  const razorpay = getRazorpayClient();
  const missing = getMissingEnv();

  if (missing.length) {
    console.error('Missing Razorpay env vars:', missing);
    return res.status(500).json({
      error: `Razorpay configuration error: missing ${missing.join(', ')}`,
    });
  }

  const { amount, currency = 'INR', receipt, notes = {} } = req.body ?? {};

  if (!currency || typeof currency !== 'string') {
    return res.status(400).json({ error: 'Invalid currency' });
  }
  if (receipt && typeof receipt !== 'string') {
    return res.status(400).json({ error: 'Invalid receipt' });
  }
  if (notes && typeof notes !== 'object') {
    return res.status(400).json({ error: 'Invalid notes' });
  }
  if (!amount || Number(amount) < 100) {
    return res.status(400).json({
      error: 'Invalid amount. Minimum amount is 100 paise (₹1)',
    });
  }

  if (!razorpay) {
    return res.status(500).json({ error: 'Razorpay client not configured' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Number(amount),
      currency,
      receipt,
      notes: {
        ...notes,
        platform: 'panstellia',
        created_at: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Error creating order:', error);

    if (error?.statusCode === 401 || error?.error?.code === 'AUTHENTICATION_FAILURE') {
      return res.status(401).json({ error: 'Payment gateway authentication failed' });
    }

    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        error: error?.error?.description || 'Failed to create order',
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/verify-payment', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body ?? {};

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({
      error: 'Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature',
    });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;

  if (!keySecret) {
    console.error('RAZORPAY_KEY_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    console.error('Payment signature verification failed');
    return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
  }

  // Optional extra guard: verify payment status against Razorpay API
  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const allowedStatuses = new Set(['authorized', 'captured', 'paid', 'settled']);
    if (payment?.status && !allowedStatuses.has(payment.status)) {
      return res.status(400).json({
        error: `Payment not authorized or completed. status=${payment.status}`,
      });
    }
  } catch (razorpayError) {
    console.warn(
      'Razorpay API verification failed, continuing with signature verification:',
      razorpayError?.message || razorpayError
    );
  }

  return res.status(200).json({
    verified: true,
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Razorpay server listening on port ${PORT}`);
});

