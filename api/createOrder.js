import admin from './_firebaseAdmin.js';
import Razorpay from 'razorpay';
import { handleCors } from './_cors.js';

const FieldValue = admin.firestore.FieldValue;

function isRazorpayAuthError(error) {
  const statusCode = error?.statusCode || error?.error?.statusCode;
  const code = error?.error?.code || error?.code;
  const description = String(error?.error?.description || error?.message || "").toLowerCase();

  return (
    statusCode === 401 ||
    code === "AUTHENTICATION_FAILURE" ||
    description.includes("authentication failed")
  );
}

function getRazorpayClient() {
  let keyId = process.env.RAZORPAY_KEY_ID;
  let keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) return null;

  // Trim whitespace and remove surrounding quotes
  keyId = keyId.trim().replace(/^"|"$/g, '');
  keySecret = keySecret.trim().replace(/^"|"$/g, '');

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function getMissingRazorpayEnv() {
  const missing = [];
  if (!process.env.RAZORPAY_KEY_ID) missing.push("RAZORPAY_KEY_ID");
  if (!process.env.RAZORPAY_KEY_SECRET) missing.push("RAZORPAY_KEY_SECRET");
  return missing;
}

async function getAuthenticatedUser(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (authError) {
    console.error("[api/createOrder] Firebase auth token verification failed:", authError?.message || authError);
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    throw error;
  }
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function sanitizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.slice(0, 50).map((item) => ({
    id: String(item?.id || ""),
    name: String(item?.name || "Jewellery Item").slice(0, 160),
    price: toNumber(item?.price),
    quantity: Math.max(1, Math.min(99, Math.floor(toNumber(item?.quantity, 1)))),
    image: String(item?.image || ""),
    category: String(item?.category || ""),
  }));
}

function sanitizeCustomer(customer, token) {
  return {
    name: String(customer?.name || token.name || "").slice(0, 120),
    email: String(customer?.email || token.email || "").slice(0, 160),
    phone: String(customer?.phone || "").slice(0, 32),
  };
}

function sanitizeAddress(address) {
  return {
    address: String(address?.address || "").slice(0, 500),
    city: String(address?.city || "").slice(0, 120),
    state: String(address?.state || "").slice(0, 120),
    pincode: String(address?.pincode || "").slice(0, 20),
    apartment: address?.apartment ? String(address.apartment).slice(0, 120) : "",
    landmark: address?.landmark ? String(address.landmark).slice(0, 120) : "",
    country: address?.country ? String(address.country).slice(0, 120) : "",
    addressLabel: address?.addressLabel ? String(address.addressLabel).slice(0, 50) : "",
  };
}

function buildOrderNumber(prefix = "PAN") {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const authUser = await getAuthenticatedUser(req);
    const razorpay = getRazorpayClient();
    const missing = getMissingRazorpayEnv();

    if (missing.length) {
      console.error("[api/createOrder] Missing Razorpay env vars:", missing);
      return res
        .status(500)
        .json({ error: `Razorpay configuration error: missing ${missing.join(", ")}` });
    }

    const {
      amount,
      currency = "INR",
      receipt,
      notes = {},
      customer,
      items,
      totals = {},
      shippingAddress,
    } = req.body ?? {};

    if (!currency || typeof currency !== "string") {
      return res.status(400).json({ error: "Invalid currency" });
    }

    if (receipt && typeof receipt !== "string") {
      return res.status(400).json({ error: "Invalid receipt" });
    }

    if (notes && typeof notes !== "object") {
      return res.status(400).json({ error: "Invalid notes" });
    }

    const amountNum = Number(amount);
    if (!amountNum || !Number.isFinite(amountNum) || amountNum < 100) {
      return res.status(400).json({
        error: "Invalid amount. Minimum amount is 100 paise (Rs. 1)",
      });
    }

    const orderItems = sanitizeItems(items);
    if (!orderItems.length) {
      return res.status(400).json({ error: "Order must include at least one item" });
    }

    const customerInfo = sanitizeCustomer(customer, authUser);
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      return res.status(400).json({ error: "Missing customer name, email, or phone" });
    }

    const addressInfo = sanitizeAddress(shippingAddress);
    if (!addressInfo.address) {
      return res.status(400).json({ error: "Missing shipping address" });
    }

    const orderNumber = buildOrderNumber();
    const db = admin.firestore();

    // Verify stock availability, fetch authentic prices, and recalculate totals before calling Razorpay API
    let calculatedSubtotal = 0;
    const verifiedItems = [];
    for (const item of orderItems) {
      const pSnap = await db.collection("products").doc(item.id).get();
      if (!pSnap.exists) {
        return res.status(404).json({ error: `Product "${item.name}" not found.` });
      }
      const pData = pSnap.data();
      const stockQuantity = Number(pData.stockQuantity ?? 0);
      const reservedQuantity = Number(pData.reservedQuantity ?? 0);
      const available = stockQuantity - reservedQuantity;
      if (available < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for "${item.name}". Only ${available} available.` });
      }

      const realPrice = Number(pData.price ?? 0);
      calculatedSubtotal += realPrice * item.quantity;
      verifiedItems.push({
        ...item,
        price: realPrice
      });
    }

    // Fetch shipping settings securely from db to verify shipping charge
    const shipSettingsSnap = await db.collection('ShippingSettings').doc('config').get();
    let shippingCharge = 99;
    let freeShippingThreshold = 999;
    let shippingEnabled = true;
    let freeShippingEnabled = true;
    if (shipSettingsSnap.exists) {
      const sData = shipSettingsSnap.data();
      shippingCharge = Number(sData.shippingCharge ?? 99);
      freeShippingThreshold = Number(sData.freeShippingThreshold ?? 999);
      shippingEnabled = sData.shippingEnabled ?? true;
      freeShippingEnabled = sData.freeShippingEnabled ?? true;
    }

    let calculatedShipping = 0;
    if (shippingEnabled) {
      if (freeShippingEnabled) {
        if (freeShippingThreshold === 0) {
          calculatedShipping = 0;
        } else {
          calculatedShipping = calculatedSubtotal >= freeShippingThreshold ? 0 : shippingCharge;
        }
      } else {
        calculatedShipping = shippingCharge;
      }
    }

    // Recalculate coupon discount securely
    let calculatedDiscount = 0;
    if (totals.couponCode) {
      const couponRef = db.collection('offers').doc(String(totals.couponCode).toUpperCase());
      const couponSnap = await couponRef.get();
      if (couponSnap.exists) {
        const coupon = couponSnap.data();
        const isNotExpired = !coupon.endDate || new Date(coupon.endDate) >= new Date();
        const isStarted = !coupon.startDate || new Date(coupon.startDate) <= new Date();
        const isEnabled = coupon.enabled && !coupon.archived;
        const currentUses = Number(coupon.currentUses || 0);
        const maxUses = Number(coupon.maxUses || 100);
        const isUsesAvailable = currentUses < maxUses;
        const hasMinCart = calculatedSubtotal >= (coupon.minCartValue || 0);

        if (isNotExpired && isStarted && isEnabled && isUsesAvailable && hasMinCart) {
          if (coupon.type === 'percentage') {
            calculatedDiscount = Math.round((calculatedSubtotal * Number(coupon.value || 0)) / 100);
          } else if (coupon.type === 'flat') {
            calculatedDiscount = Number(coupon.value || 0);
          } else if (coupon.type === 'buy_x_get_y') {
            const buyQty = Number(coupon.buyQty || 2);
            const getQty = Number(coupon.getQty || 1);
            const totalQty = verifiedItems.reduce((sum, item) => sum + item.quantity, 0);
            if (totalQty >= buyQty) {
              const itemPrices = [];
              verifiedItems.forEach(item => {
                for (let i = 0; i < item.quantity; i++) {
                  itemPrices.push(item.price);
                }
              });
              itemPrices.sort((a, b) => a - b);
              const freeItemsCount = Math.min(getQty, itemPrices.length);
              for (let i = 0; i < freeItemsCount; i++) {
                calculatedDiscount += itemPrices[i];
              }
            }
          }
          calculatedDiscount = Math.min(calculatedDiscount, calculatedSubtotal);
        }
      }
    }

    const calculatedTax = calculatedSubtotal * 0.05;
    const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedShipping + calculatedTax - calculatedDiscount);
    const amountNum = Math.round(calculatedTotal * 100); // Override with securely calculated amount in paise

    console.log("[api/createOrder] Creating Razorpay order", {
      amount: amountNum,
      currency,
      receipt,
      orderNumber,
    });

    const order = await razorpay.orders.create({
      amount: amountNum,
      currency,
      receipt,
      notes: {
        ...notes,
        order_number: orderNumber,
        user_id: authUser.uid,
        platform: "panstellia",
        created_at: new Date().toISOString(),
      },
    });

    // Save payment intent document (draft order) to Firestore
    const paymentRef = db.collection("payments").doc();

    const commonOrderData = {
      userId: authUser.uid,
      orderId: orderNumber,
      razorpayOrderId: order.id,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      phone: customerInfo.phone,
      items: verifiedItems,
      subtotal: calculatedSubtotal,
      shipping: calculatedShipping,
      tax: calculatedTax,
      couponCode: totals.couponCode || null,
      couponDiscount: calculatedDiscount,
      total: calculatedTotal,
      amount: amountNum,
      amountPaid: amountNum / 100,
      isPartialPayment: notes.is_partial === "true",
      currency,
      paymentMethod: "razorpay",
      paymentStatus: "Pending",
      status: "pending_payment",
      address: addressInfo.address,
      city: addressInfo.city,
      state: addressInfo.state,
      pincode: addressInfo.pincode,
      apartment: addressInfo.apartment || "",
      landmark: addressInfo.landmark || "",
      country: addressInfo.country || "",
      addressLabel: addressInfo.addressLabel || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await paymentRef.set({
      ...commonOrderData,
      orderDocId: null, // order not created yet
    });

    const transactionResult = {
      orderDocId: null,
      paymentDocId: paymentRef.id,
    };

    return res.status(200).json({
      order_id: order.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      local_order_id: transactionResult.orderDocId,
      payment_record_id: transactionResult.paymentDocId,
      order_number: orderNumber,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("[api/createOrder] Error creating order:", error);

    const statusCode = error?.statusCode || 500;

    if (isRazorpayAuthError(error)) {
      const detailedMessage = error?.error?.description || error?.message || "";
      return res.status(401).json({
        error:
          `Razorpay authentication failed: ${detailedMessage}. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are from the same Razorpay key pair, and have no spaces or quotes, then redeploy functions.`,
      });
    }

    if (statusCode && statusCode !== 500) {
      return res.status(statusCode).json({
        error: error?.error?.description || error?.message || "Failed to create order",
      });
    }

    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}
