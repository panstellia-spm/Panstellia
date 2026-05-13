# TODO (Netlify -> Vercel migration)

## Step 1 — Remove Netlify artifacts
- [x] Delete `netlify.toml`
- [x] Delete `public/_redirects`


## Step 2 — Add Vercel SPA routing
- [x] Add `vercel.json` to route all paths to `index.html`

## Step 3 — Update payment client to production-safe env usage
- [x] Update `src/services/payment.js` to only use:
  - `import.meta.env.VITE_RAZORPAY_KEY_ID`
  - `import.meta.env.VITE_FIREBASE_CREATE_ORDER_URL`
  - `import.meta.env.VITE_FIREBASE_VERIFY_PAYMENT_URL`

- [x] Remove legacy *_OLD env fallbacks from `src/services/payment.js`
- [x] Add reusable API helper + robust async/await + better error mapping

## Step 4 — Ensure Checkout flow stays intact
- [ ] Confirm `src/pages/Checkout.jsx` uses create->open->verify flow correctly
- [ ] Improve loading/disabled state + error handling without changing UI structure
- [ ] Vercel env vars set for payment so Checkout doesn’t throw missing `VITE_FIREBASE_CREATE_ORDER_URL` / `VITE_RAZORPAY_KEY_ID`


## Step 5 — Remove Netlify references in docs
- [ ] Update `FIREBASE_RAZORPAY_SETUP.md` to remove Netlify mentions
- [ ] Update `TODO.md` (this file) to remove Netlify mentions

## Step 6 — Verify no Netlify references remain
- [ ] Search repo for `netlify` / `Netlify` / `/.netlify/` and fix any remaining occurrences

## Step 7 — Vite build
- [x] Run `npm run build`

## Step 8 — Report results
- [ ] Provide changed files + final folder structure
- [ ] Provide Vercel env var examples + Vercel deployment steps
- [ ] Provide removed Netlify files

