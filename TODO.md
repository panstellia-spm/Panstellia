# TODO

- [x] Fix Razorpay order creation control flow in `src/services/payment.js` (reached correct return path; cleaned unreachable code).
- [x] Relax/adjust payment status strictness in `netlify/functions/verify-payment.js` to avoid rejecting legitimate payments when `payment.status` isn’t exactly `authorized`.
- [ ] Sanity-check build/lint and verify checkout + verification response.



