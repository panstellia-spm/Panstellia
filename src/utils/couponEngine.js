/**
 * Panstellia — Enterprise Coupon Validation & Discount Engine
 */

export const validateCoupon = (coupon, { subtotal, cartItems = [], userOrdersCount = 0 }) => {
  if (!coupon) {
    return { valid: false, error: 'Coupon not found' };
  }

  if (coupon.archived) {
    return { valid: false, error: 'This coupon is archived or invalid' };
  }

  if (coupon.enabled === false) {
    return { valid: false, error: 'This coupon is currently disabled' };
  }

  // 1. Expiry Check
  if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
    return { valid: false, error: 'This coupon has expired' };
  }

  // 2. Start Date Check
  if (coupon.startDate && new Date(coupon.startDate) > new Date()) {
    return { valid: false, error: 'This coupon is not active yet' };
  }

  // 3. Max Usage Limit Check
  const currentUses = Number(coupon.currentUses || 0);
  const maxUses = Number(coupon.maxUses || 100);
  if (currentUses >= maxUses) {
    return { valid: false, error: 'This coupon usage limit has been reached' };
  }

  // 4. One-time Usage / User Eligibility Check
  if ((coupon.oneTimePerUser === true || coupon.type === 'one_time') && userOrdersCount > 0) {
    return { valid: false, error: 'You have already used this coupon code' };
  }

  // 5. Minimum Order Value Check
  if (subtotal < (coupon.minCartValue || 0)) {
    return { valid: false, error: `Minimum order value of ₹${coupon.minCartValue} is required for this coupon` };
  }

  // 6. Product / Category / Collection Eligibility Check
  const hasProductEligibility = Array.isArray(coupon.eligibleProducts) && coupon.eligibleProducts.length > 0;
  const hasCategoryEligibility = Array.isArray(coupon.eligibleCategories) && coupon.eligibleCategories.length > 0;
  const hasCollectionEligibility = Array.isArray(coupon.eligibleCollections) && coupon.eligibleCollections.length > 0;

  if (hasProductEligibility || hasCategoryEligibility || hasCollectionEligibility) {
    const isEligible = cartItems.some(item => {
      if (hasProductEligibility && coupon.eligibleProducts.includes(item.id)) return true;
      if (hasCategoryEligibility && coupon.eligibleCategories.includes(item.category)) return true;
      // Note: Collection check relies on the item having a collection property
      if (hasCollectionEligibility && item.collection && coupon.eligibleCollections.includes(item.collection)) return true;
      return false;
    });

    if (!isEligible) {
      return { valid: false, error: 'Your cart does not contain any eligible products for this coupon code' };
    }
  }

  return { valid: true };
};

export const calculateCouponDiscount = (coupon, { subtotal, cartItems = [] }) => {
  const subtotalVal = Number(subtotal || 0);
  if (!coupon) return 0;

  // Identify eligible subtotal if coupon has item constraints
  const hasProductEligibility = Array.isArray(coupon.eligibleProducts) && coupon.eligibleProducts.length > 0;
  const hasCategoryEligibility = Array.isArray(coupon.eligibleCategories) && coupon.eligibleCategories.length > 0;
  const hasCollectionEligibility = Array.isArray(coupon.eligibleCollections) && coupon.eligibleCollections.length > 0;

  let eligibleSubtotal = subtotalVal;
  let eligibleItems = [...cartItems];

  if (hasProductEligibility || hasCategoryEligibility || hasCollectionEligibility) {
    eligibleItems = cartItems.filter(item => {
      if (hasProductEligibility && coupon.eligibleProducts.includes(item.id)) return true;
      if (hasCategoryEligibility && coupon.eligibleCategories.includes(item.category)) return true;
      if (hasCollectionEligibility && item.collection && coupon.eligibleCollections.includes(item.collection)) return true;
      return false;
    });
    eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  let discount = 0;

  if (coupon.type === 'percentage') {
    discount = Math.round((eligibleSubtotal * Number(coupon.value || 0)) / 100);
  } else if (coupon.type === 'flat') {
    discount = Number(coupon.value || 0);
  } else if (coupon.type === 'buy_x_get_y') {
    const buyQty = Number(coupon.buyQty || 2);
    const getQty = Number(coupon.getQty || 1);
    const totalQty = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

    if (totalQty >= buyQty) {
      const itemPrices = [];
      eligibleItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          itemPrices.push(Number(item.price));
        }
      });
      itemPrices.sort((a, b) => a - b);
      const freeItemsCount = Math.min(getQty, itemPrices.length);
      for (let i = 0; i < freeItemsCount; i++) {
        discount += itemPrices[i];
      }
    }
  }

  // Apply maximum discount limit if configured
  if (coupon.maxDiscount && coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  return Math.min(discount, subtotalVal);
};
