/**
 * Panstellia — Centralized Shipping & Checkout Calculation Engine (Backend Version)
 * 
 * Enforces Phase 2 (Shipping Charge Logic) and Phase 3 (COD Logic) rules.
 */

export const calculateShipping = (subtotal, method = 'standard') => {
  const subtotalVal = Number(subtotal || 0);
  if (method === 'premium') {
    return 129;
  }
  // Standard shipping rules: FREE on orders >= ₹999, else ₹49
  return subtotalVal >= 999 ? 0 : 49;
};

export const getShippingETA = (method = 'standard') => {
  return method === 'premium' ? 'Blue Dart (2–4 Days)' : 'Surface (Up to 7 Days)';
};

export const calculateCheckout = ({ subtotal, shippingMethod = 'standard', paymentMethod = 'razorpay', discount = 0 }) => {
  const subtotalVal = Number(subtotal || 0);
  const discountVal = Number(discount || 0);
  
  const shipping = calculateShipping(subtotalVal, shippingMethod);
  const codCharge = paymentMethod === 'cod' ? 69 : 0;
  
  const total = Math.max(0, subtotalVal + shipping + codCharge - discountVal);
  
  return {
    subtotal: subtotalVal,
    shipping,
    codCharge,
    discount: discountVal,
    tax: 0,
    total
  };
};
