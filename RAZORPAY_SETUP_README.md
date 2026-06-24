# 💳 Razorpay Payment Integration — Panstellia

> Complete setup guide: diagnosis, local development, Firebase Functions deployment, and Vercel production configuration.

---

## 📌 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Why It's Not Working Right Now](#why-its-not-working-right-now)
3. [Credentials You Need](#credentials-you-need)
4. [Step 1 — Local Development Setup](#step-1--local-development-setup)
5. [Step 2 — Firebase Functions Secrets (Backend)](#step-2--firebase-functions-secrets-backend)
6. [Step 3 — Deploy Firebase Functions](#step-3--deploy-firebase-functions)
7. [Step 4 — Vercel Production Setup](#step-4--vercel-production-setup)
8. [Step 5 — Test the Payment Flow](#step-5--test-the-payment-flow)
9. [Payment Flow Diagram](#payment-flow-diagram)
10. [Firestore Collections Created](#firestore-collections-created)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Common Errors and Fixes](#common-errors-and-fixes)
13. [Security Rules](#security-rules)

---

## Architecture Overview

```
User Browser (React/Vite)
        │
        │  HTTPS REST calls (no secrets exposed)
        ▼
Firebase Functions v2  ──► Razorpay API (createOrder, verifyPayment)
  asia-south1                    │
        │                        │ Secrets stored in
        ▼                        ▼ Firebase Secret Manager
   Firestore DB           RAZORPAY_KEY_ID
 (orders, payments)       RAZORPAY_KEY_SECRET
```

- **Frontend** → Vercel (React/Vite, only `VITE_RAZORPAY_KEY_ID` exposed)
- **Backend** → Firebase Functions v2 (`asia-south1`) with secrets in Firebase Secret Manager
- **Razorpay secrets** are **NEVER** sent to the browser

### Firebase Functions (3 endpoints)

| Function | Endpoint | Purpose |
|---|---|---|
| `createOrder` | `POST /createOrder` | Creates Razorpay order + pending Firestore record |
| `verifyPayment` | `POST /verifyPayment` | Server-side signature verification, marks order paid |
| `markPaymentFailed` | `POST /markPaymentFailed` | Marks abandoned orders as failed, releases stock |

---

## Why It's Not Working Right Now

Based on the error log (`razorpay-server.err.log`):

```
Error: Authentication failed
statusCode: 401
razorpayError: { description: 'Authentication failed', code: 'BAD_REQUEST_ERROR' }
```

### Root Causes Found

| # | Problem | Location | Fix |
|---|---|---|---|
| 1 | `RAZORPAY_KEY_SECRET` **never set** in Firebase Secret Manager | Firebase Functions | Run `firebase functions:secrets:set RAZORPAY_KEY_SECRET` |
| 2 | Firebase Functions **URLs missing** in `.env.local` | `.env.local` | Add `VITE_FIREBASE_CREATE_ORDER_URL` etc. |
| 3 | Live key `rzp_live_SnfBggBgnsFeSI` appears **truncated** | `.env.local` | Verify the full key from Razorpay Dashboard |
| 4 | Functions may not be deployed yet | Firebase | Run `firebase deploy --only functions` |

> ⚠️ The `RAZORPAY_KEY_SECRET` must **never** go in `.env.local` or Vercel. It must only be set via `firebase functions:secrets:set`.

---

## Credentials You Need

Before you begin, collect these from your **Razorpay Dashboard** → Settings → API Keys:

| Credential | Where to Get It | Where It Goes |
|---|---|---|
| `Key ID` | Razorpay Dashboard → API Keys | `.env.local` + Vercel env |
| `Key Secret` | Razorpay Dashboard → API Keys | Firebase Secret Manager ONLY |

> 🔑 **Test Mode**: Key ID starts with `rzp_test_`  
> 🔑 **Live Mode**: Key ID starts with `rzp_live_`  
> ⚠️ Never mix test Key ID with live Key Secret or vice versa — this causes the 401 error.

---

## Step 1 — Local Development Setup

### 1.1 Update `.env.local` in the project root

Open `C:\Users\deepa\OneDrive\Desktop\Internship\Panstellia\.env.local` and make sure it has:

```env
# ─── Razorpay (Frontend only — Key ID is safe to expose) ───────────────────
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXXXXXX
# Replace with your FULL Key ID from Razorpay Dashboard

# ─── Firebase Functions Region ─────────────────────────────────────────────
VITE_FIREBASE_FUNCTIONS_REGION=asia-south1

# ─── Firebase Functions Endpoints ──────────────────────────────────────────
# For LOCAL development with Firebase Emulator, use:
VITE_FIREBASE_CREATE_ORDER_URL=http://127.0.0.1:5001/panstellia-65653/asia-south1/createOrder
VITE_FIREBASE_VERIFY_PAYMENT_URL=http://127.0.0.1:5001/panstellia-65653/asia-south1/verifyPayment
VITE_FIREBASE_MARK_PAYMENT_FAILED_URL=http://127.0.0.1:5001/panstellia-65653/asia-south1/markPaymentFailed

# For DEPLOYED functions (use these after Step 3):
# VITE_FIREBASE_CREATE_ORDER_URL=https://asia-south1-panstellia-65653.cloudfunctions.net/createOrder
# VITE_FIREBASE_VERIFY_PAYMENT_URL=https://asia-south1-panstellia-65653.cloudfunctions.net/verifyPayment
# VITE_FIREBASE_MARK_PAYMENT_FAILED_URL=https://asia-south1-panstellia-65653.cloudfunctions.net/markPaymentFailed
```

> ⚠️ Do NOT add `RAZORPAY_KEY_SECRET` to `.env.local`. It belongs only in Firebase.

---

### 1.2 Create `functions/.env` for Local Emulator

Create a new file: `functions/.env` (this is for the Firebase emulator only, **not committed to git**)

```env
# functions/.env  — Local emulator only. DO NOT COMMIT.
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

### 1.3 Run the Firebase Emulator + Vite Dev Server

Open **two terminals** side by side:

**Terminal 1 — Firebase Functions Emulator:**
```bash
cd C:\Users\deepa\OneDrive\Desktop\Internship\Panstellia
firebase emulators:start --only functions
```

Expected output:
```
✔  functions[asia-south1-createOrder]: http function initialized (http://127.0.0.1:5001/panstellia-65653/asia-south1/createOrder)
✔  functions[asia-south1-verifyPayment]: http function initialized (...)
✔  functions[asia-south1-markPaymentFailed]: http function initialized (...)
```

**Terminal 2 — Vite Dev Server:**
```bash
cd C:\Users\deepa\OneDrive\Desktop\Internship\Panstellia
npm run dev
```

---

## Step 2 — Firebase Functions Secrets (Backend)

These commands store the secret keys **inside Google's Secret Manager** — they never touch your code or `.env` files.

### 2.1 Login and select the project

```bash
firebase login
firebase use panstellia-65653
```

### 2.2 Set the Razorpay Key ID secret

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
```
When prompted, paste your **Key ID** (e.g., `rzp_test_XXXXXXXXXXXXXXXXXXXX` or `rzp_live_XXXXXXXXXXXXXXXXXXXX`).

### 2.3 Set the Razorpay Key Secret

```bash
firebase functions:secrets:set RAZORPAY_KEY_SECRET
```
When prompted, paste your **Key Secret** (the long secret string from Razorpay Dashboard).

### 2.4 Verify the secrets are set

```bash
firebase functions:secrets:access RAZORPAY_KEY_ID
firebase functions:secrets:access RAZORPAY_KEY_SECRET
```

> ✅ Both must return values (not empty). If either is empty, the 401 error will persist.

---

## Step 3 — Deploy Firebase Functions

After setting secrets, deploy the three functions:

```bash
firebase deploy --only functions:createOrder,functions:verifyPayment,functions:markPaymentFailed
```

Expected output:
```
✔  functions[createOrder(asia-south1)]: Successful create operation.
✔  functions[verifyPayment(asia-south1)]: Successful create operation.
✔  functions[markPaymentFailed(asia-south1)]: Successful create operation.

Function URLs:
createOrder:        https://asia-south1-panstellia-65653.cloudfunctions.net/createOrder
verifyPayment:      https://asia-south1-panstellia-65653.cloudfunctions.net/verifyPayment
markPaymentFailed:  https://asia-south1-panstellia-65653.cloudfunctions.net/markPaymentFailed
```

> 🔴 **Important**: After deploying, switch `.env.local` `VITE_FIREBASE_*_URL` values from emulator URLs to the live `cloudfunctions.net` URLs above.

---

## Step 4 — Vercel Production Setup

Go to **Vercel Dashboard** → Your Project → Settings → Environment Variables.

Add the following variables for **Production** AND **Preview** environments:

| Variable Name | Value | Notes |
|---|---|---|
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_XXXX` or `rzp_live_XXXX` | Must match the mode of the secret in Firebase |
| `VITE_FIREBASE_FUNCTIONS_REGION` | `asia-south1` | Must match functions region |
| `VITE_FIREBASE_CREATE_ORDER_URL` | `https://asia-south1-panstellia-65653.cloudfunctions.net/createOrder` | From Step 3 output |
| `VITE_FIREBASE_VERIFY_PAYMENT_URL` | `https://asia-south1-panstellia-65653.cloudfunctions.net/verifyPayment` | From Step 3 output |
| `VITE_FIREBASE_MARK_PAYMENT_FAILED_URL` | `https://asia-south1-panstellia-65653.cloudfunctions.net/markPaymentFailed` | From Step 3 output |

> ⛔ **NEVER add `RAZORPAY_KEY_SECRET` to Vercel.** It lives only in Firebase Secret Manager.

After adding all variables, go to **Deployments** → **Redeploy** (do not use cached build).

---

## Step 5 — Test the Payment Flow

### Test Mode Checklist

Use Razorpay's test card details during testing:

| Field | Value |
|---|---|
| Card Number | `4111 1111 1111 1111` |
| Expiry | Any future date (e.g., `12/26`) |
| CVV | Any 3 digits (e.g., `123`) |
| OTP | `1234` |
| UPI ID | `success@razorpay` |
| Net Banking | Select any bank → use test credentials |

### Verify the flow

1. Add items to cart → Proceed to Checkout
2. Select a saved address and fill in phone number
3. Select **"Pay Online (Razorpay)"** as payment method
4. Click **"Place Order"**
5. Razorpay modal should open
6. Complete payment with test card
7. Should redirect to **Order Success** page
8. Check **Firestore** → `orders` collection → order status should be `processing`

---

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER CHECKOUT FLOW                         │
└─────────────────────────────────────────────────────────────────┘

  User clicks "Place Order"
          │
          ▼
  [Frontend] Gets Firebase Auth ID token
          │
          ▼
  POST /createOrder (Firebase Function)
  ├── Verifies Firebase Auth token
  ├── Checks stock availability in Firestore
  ├── Creates Razorpay order via Razorpay API
  ├── Reserves stock in Firestore (transaction)
  ├── Creates orders/{id} with status: pending_payment
  └── Creates payments/{id} with razorpayOrderId
          │
          ▼
  [Frontend] Opens Razorpay Modal
  ├── User enters card/UPI/net banking
  └── Razorpay processes payment
          │
     ┌────┴─────┐
     │          │
  SUCCESS     DISMISS/FAIL
     │          │
     ▼          ▼
  POST /verifyPayment    POST /markPaymentFailed
  ├── Verify HMAC sig    ├── Updates order → payment_failed
  ├── Call Razorpay API  └── Releases reserved stock
  ├── Deduct stock
  ├── Update order → processing
  └── Update payment → Paid
          │
          ▼
  [Frontend] Redirect to /order-success
```

---

## Firestore Collections Created

| Collection | Document Fields | Created When |
|---|---|---|
| `orders` | `userId`, `razorpayOrderId`, `items`, `total`, `status`, `paymentStatus`, `address`, `createdAt` | `createOrder` called |
| `payments` | Same as orders + `orderDocId`, `razorpayPaymentId`, `razorpaySignature` | `createOrder` called |
| `inventory_logs` | `productId`, `action`, `change`, `previousValue`, `newValue`, `reason` | `verifyPayment` succeeds |

### Order Status Lifecycle

```
pending_payment  →  processing  →  shipped  →  delivered
                 ↘  payment_failed
```

---

## Environment Variables Reference

### Frontend (`root/.env.local` or Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_RAZORPAY_KEY_ID` | ✅ Yes | Razorpay Key ID (starts with `rzp_test_` or `rzp_live_`) |
| `VITE_FIREBASE_FUNCTIONS_REGION` | ✅ Yes | Always `asia-south1` |
| `VITE_FIREBASE_CREATE_ORDER_URL` | ✅ Yes | Firebase Function URL |
| `VITE_FIREBASE_VERIFY_PAYMENT_URL` | ✅ Yes | Firebase Function URL |
| `VITE_FIREBASE_MARK_PAYMENT_FAILED_URL` | ✅ Yes | Firebase Function URL |

### Backend (Firebase Secret Manager only)

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
```

| Secret | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Same Key ID as frontend — keeps backend self-contained |
| `RAZORPAY_KEY_SECRET` | Secret key — NEVER in frontend or Vercel |

### Optional (Firebase Function env)

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | hardcoded list | Extra comma-separated allowed origins |
| `FUNCTION_REGION` | `asia-south1` | Override region |

---

## Common Errors and Fixes

### ❌ `401 Authentication Failed`

**Cause**: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are missing, mismatched (test vs live), or the Functions weren't redeployed after setting secrets.

**Fix**:
```bash
firebase functions:secrets:set RAZORPAY_KEY_ID    # paste the Key ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET # paste the Key Secret
firebase deploy --only functions:createOrder,functions:verifyPayment,functions:markPaymentFailed
```

---

### ❌ `Razorpay configuration error: missing VITE_RAZORPAY_KEY_ID`

**Cause**: The variable is not in `.env.local` (local) or not added in Vercel (production).

**Fix**: Add `VITE_RAZORPAY_KEY_ID=rzp_test_XXXX` to `.env.local` and restart Vite. For production, add in Vercel and redeploy.

---

### ❌ `Razorpay key mismatch`

**Cause**: `VITE_RAZORPAY_KEY_ID` in Vercel/`.env.local` is different from `RAZORPAY_KEY_ID` in Firebase Secrets.

**Fix**: Both must be the **exact same key**, from the **same mode** (test or live).

---

### ❌ `Failed to create payment order (403)` — CORS blocked

**Cause**: The frontend's origin is not in the allowed list in `functions/index.js`.

**Fix**: Add your custom domain to `defaultAllowedOrigins` in `functions/index.js`:
```js
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "https://panstellia.vercel.app",
  "https://panstellia.com",
  "https://your-custom-domain.com",  // ← add here
];
```
Then redeploy: `firebase deploy --only functions`

---

### ❌ `Missing customer name, email, or phone`

**Cause**: The checkout form didn't pass phone/name/email to the `createOrder` call.

**Fix**: Ensure the checkout form collects `phone` in the customer section and passes it to `createRazorpayOrder()`.

---

### ❌ Razorpay modal opens but payment succeeds and order doesn't update

**Cause**: `verifyPayment` function failed silently, or `RAZORPAY_KEY_SECRET` is wrong.

**Fix**: Check Firebase Function logs:
```bash
firebase functions:log --only verifyPayment
```

---

### ❌ Functions not found (404) locally

**Cause**: Firebase emulator isn't running or `.env.local` still points to emulator URLs after deploying.

**Fix**: Start emulator with `firebase emulators:start --only functions`, or switch the URLs in `.env.local` to live `cloudfunctions.net` URLs.

---

## Security Rules

The Razorpay integration follows these security principles:

| Principle | Implementation |
|---|---|
| ✅ Secret never in browser | `RAZORPAY_KEY_SECRET` stored only in Firebase Secret Manager |
| ✅ Auth required | All 3 functions verify Firebase Auth JWT before processing |
| ✅ Server-side signature verification | HMAC-SHA256 verified in `verifyPayment` function, not frontend |
| ✅ Stock reservation | Stock reserved atomically in Firestore before charging user |
| ✅ Double-payment protection | `verifyPayment` checks `status !== 'pending_payment'` before processing |
| ✅ CORS locked | Only allowed origins can call the functions |
| ✅ Amount validated | Minimum 100 paise (₹1) enforced server-side |

---

## Quick Setup Checklist

```
When you receive your Razorpay credentials:

□ 1. Verify both keys are from the SAME mode (both test OR both live)
□ 2. Set RAZORPAY_KEY_ID in Firebase:
     firebase functions:secrets:set RAZORPAY_KEY_ID
□ 3. Set RAZORPAY_KEY_SECRET in Firebase:
     firebase functions:secrets:set RAZORPAY_KEY_SECRET
□ 4. Deploy functions:
     firebase deploy --only functions:createOrder,functions:verifyPayment,functions:markPaymentFailed
□ 5. Copy deployed function URLs from terminal output
□ 6. Update Vercel environment variables (5 variables)
□ 7. Redeploy Vercel frontend (Deployments → Redeploy)
□ 8. Test with Razorpay test card: 4111 1111 1111 1111
□ 9. Check Firestore orders collection for status: "processing"
□ 10. Switch to live keys when ready for production
```

---

## Firebase Project Info

| Setting | Value |
|---|---|
| Project ID | `panstellia-65653` |
| Functions Region | `asia-south1` |
| Firebase Console | https://console.firebase.google.com/project/panstellia-65653 |
| Razorpay Dashboard | https://dashboard.razorpay.com |

---

*Generated for Panstellia — Luxury Jewellery E-commerce Platform*
