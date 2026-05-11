# TODO

## Firebase + Razorpay checklist (current code)

### Step 1 — Confirm Functions runtime env vars exist
Ensure the deployed Firebase Functions have these env var names (because `functions/index.js` reads `process.env.*`):
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CORS_ORIGIN`

### Step 2 — Deploy Functions v2 endpoints
Deploy only:
- `functions:createOrder`
- `functions:verifyPayment`

Command:
- `firebase deploy --only functions:createOrder,functions:verifyPayment`

### Step 3 — Set Netlify environment variables for the frontend
In Netlify site settings set:
- `VITE_RAZORPAY_KEY_ID`
- `VITE_FIREBASE_CREATE_ORDER_URL`
- `VITE_FIREBASE_VERIFY_PAYMENT_URL`

### Step 4 — Verify CORS
Set `CORS_ORIGIN` in Functions to your Netlify frontend origin (exact match), e.g. `https://<site>.netlify.app`.

### Step 5 — Smoke test
- Create payment order
- Verify signature

Expected:
- createOrder returns `{ order_id, amount, currency }` with HTTP 200
- verifyPayment returns `{ verified: true, payment_id, order_id }` with HTTP 200

### Step 6 — If failing, collect evidence
If anything fails, capture:
- failing endpoint URL
- HTTP status code
- response body from the browser Network tab
- any console error

