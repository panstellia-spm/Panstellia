# Vercel Environment Variables (Frontend)

Set these in Vercel project settings under **Environment Variables** (Production + Preview as needed).

- `VITE_RAZORPAY_KEY_ID` (public)
- `VITE_FIREBASE_CREATE_ORDER_URL` (public REST URL for `create-order` endpoint)
- `VITE_FIREBASE_VERIFY_PAYMENT_URL` (public REST URL for `verify-payment` endpoint)

## Example
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
VITE_FIREBASE_CREATE_ORDER_URL=https://<region>-<project>.cloudfunctions.net/createOrder
VITE_FIREBASE_VERIFY_PAYMENT_URL=https://<region>-<project>.cloudfunctions.net/verifyPayment
```

> Secrets like `RAZORPAY_KEY_SECRET` must be stored only in the Functions runtime, never in Vercel/Frontend.

