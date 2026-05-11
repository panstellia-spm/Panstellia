# Firebase Razorpay Backend (Functions v2) - Panstellia

This repo uses **Firebase Functions v2 as the standalone backend** for Razorpay:
- `create-order` (POST)
- `verify-payment` (POST)

Frontend (Vite + React) is hosted separately (Netlify). It calls Functions via full REST URLs.

## 1) Prerequisites
- Firebase CLI installed
- Node.js 20

## 2) Create/Select Firebase project
```bash
firebase login
firebase projects:list
firebase use <YOUR_FIREBASE_PROJECT_ID>
```

## 3) Initialize Functions (if not already)
From repo root:
```bash
firebase init functions
```
- Choose **JavaScript**
- Choose **ESLint** as you prefer
- The CLI may generate a `functions/` folder; in this repo we already have one.

## 4) Install dependencies for Functions
From repo root:
```bash
npm install
cd functions && npm install
cd ..
```

## 5) Configure runtime environment variables (Secrets)
Set Razorpay keys in Functions runtime. Never put these in frontend.

```bash
firebase functions:config:set \
  razorpay.key_id="<YOUR_RAZORPAY_KEY_ID>" \
  razorpay.key_secret="<YOUR_RAZORPAY_KEY_SECRET>" \
  cors.origin="https://<YOUR_NETLIFY_SITE>.netlify.app"
```

Then update code to read `functions.config()` OR use `firebase functions:secrets:set` (preferred).

### Preferred approach: Firebase Functions secrets
Run (adjust names):
```bash
firebase functions:secrets:set razorpay-key-id="<YOUR_RAZORPAY_KEY_ID>" razorpay-key-secret="<YOUR_RAZORPAY_KEY_SECRET>"
```

> Note: Current `functions/index.js` reads `process.env.RAZORPAY_KEY_ID` / `process.env.RAZORPAY_KEY_SECRET` / `process.env.CORS_ORIGIN`.
>
> Use either environment variable injection supported by your Firebase setup, or ensure your deployment sets those env vars.

## 6) Ensure CORS origin is correct
Edit `functions/.env.example`:
- `CORS_ORIGIN=https://<YOUR_NETLIFY_SITE>.netlify.app`

For production, set it in your Functions environment.

## 7) Deploy Functions v2
Deploy only these endpoints:
```bash
firebase deploy --only functions:createOrder,functions:verifyPayment
```

If you need to deploy all functions:
```bash
firebase deploy --only functions
```

After deployment, Firebase CLI prints URLs like:
- `.../createOrder`
- `.../verifyPayment`

## 8) Configure frontend environment variables (Netlify)
On Netlify, set:
- `VITE_RAZORPAY_KEY_ID` (public checkout key)
- `VITE_FIREBASE_CREATE_ORDER_URL` (full URL to `createOrder`)
- `VITE_FIREBASE_VERIFY_PAYMENT_URL` (full URL to `verifyPayment`)

Example:
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
VITE_FIREBASE_CREATE_ORDER_URL=https://<region>-<project>.cloudfunctions.net/createOrder
VITE_FIREBASE_VERIFY_PAYMENT_URL=https://<region>-<project>.cloudfunctions.net/verifyPayment
```

## 9) Test locally
- Start Vite app
- Ensure Functions are deployed or provide reachable URLs.

> The frontend will not use mock payments. Verification is required by the backend.

## 10) Security notes / production checklist
- `RAZORPAY_KEY_SECRET` exists **only** in Functions runtime.
- Frontend only uses `VITE_RAZORPAY_KEY_ID`.
- `verify-payment` signature comparison uses constant-time equality.
- CORS is restricted to your Netlify origin.
- Errors return generic messages and do not leak internal stack traces.

