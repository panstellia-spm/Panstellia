# TODO

- [x] Fix CORS preflight failing for Firebase Functions endpoints (createOrder/verifyPayment)
  - [x] Update `functions/index.js` to correctly handle OPTIONS and always return `Access-Control-Allow-Origin` for allowed origins
  - [x] Ensure preflight responses return required headers (Allow-Methods/Allow-Headers) and status 204
  - [x] Ensure POST responses also include the CORS headers

- [ ] Run quick local/CI check (lint/tests) if available

