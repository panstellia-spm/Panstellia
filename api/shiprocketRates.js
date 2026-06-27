import { handleCors } from './_cors.js';
import { shiprocketRequest } from './_shiprocketHelper.js';
import admin from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const { pincode, subtotal = 0, weight = 0.1, isCod = false } = req.body ?? {};

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: 'Valid 6-digit destination pincode is required' });
    }

    const db = admin.firestore();

    // 1. Fetch Store's Standard Shipping Settings
    const shippingSettingsSnap = await db.collection('ShippingSettings').doc('config').get();
    let shippingEnabled = true;
    let freeShippingEnabled = true;
    let standardShippingCharge = 99;
    let freeShippingThreshold = 999;

    if (shippingSettingsSnap.exists) {
      const data = shippingSettingsSnap.data();
      shippingEnabled = data.shippingEnabled ?? true;
      freeShippingEnabled = data.freeShippingEnabled ?? true;
      standardShippingCharge = Number(data.shippingCharge ?? 99);
      freeShippingThreshold = Number(data.freeShippingThreshold ?? 999);
    }

    // If shipping is disabled globally, shipping is free
    if (!shippingEnabled) {
      return res.status(200).json({ rate: 0, isFree: true, method: 'free' });
    }

    // If subtotal qualifies for free shipping
    if (freeShippingEnabled && Number(subtotal) >= freeShippingThreshold) {
      return res.status(200).json({ rate: 0, isFree: true, method: 'free_threshold' });
    }

    // 2. Fetch Shiprocket Configuration
    const shiprocketConfigSnap = await db.collection('system_settings').doc('shiprocket').get();
    let shiprocketEnabled = false;
    let pickupPincode = '560001';

    if (shiprocketConfigSnap.exists) {
      const sData = shiprocketConfigSnap.data();
      shiprocketEnabled = sData.enabled ?? false;
      if (sData.pickupPincode) {
        pickupPincode = String(sData.pickupPincode).trim();
      }
    }

    // If Shiprocket is disabled, return standard flat rate
    if (!shiprocketEnabled) {
      return res.status(200).json({
        rate: standardShippingCharge,
        isFree: false,
        method: 'standard_flat',
        courier: 'Standard Courier'
      });
    }

    // 3. Call Shiprocket Courier Serviceability to get live rates
    const params = {
      pickup_postcode: pickupPincode,
      delivery_postcode: String(pincode),
      weight: String(weight),
      cod: isCod ? '1' : '0'
    };

    console.log(`[api/shiprocketRates] Calculating Shiprocket live rates for ${pincode}`);
    try {
      const response = await shiprocketRequest('GET', 'v1/external/courier/serviceability/', null, params);

      if (response && response.status === 200 && response.data) {
        const availableCouriers = response.data.available_courier_companies || [];
        if (availableCouriers.length > 0) {
          // Find the cheapest courier
          let cheapestRate = Infinity;
          let selectedCourier = null;

          availableCouriers.forEach(c => {
            const rate = Number(c.rate || 999999);
            if (rate < cheapestRate) {
              cheapestRate = rate;
              selectedCourier = c;
            }
          });

          if (selectedCourier) {
            return res.status(200).json({
              rate: Math.ceil(cheapestRate),
              isFree: false,
              method: 'shiprocket_live',
              courier: selectedCourier.courier_name,
              est_days: selectedCourier.estimated_delivery_days || '3-5 days',
              etd: selectedCourier.etd || ''
            });
          }
        }
      }

      // Fallback if no couriers are serviceable or response is empty
      console.warn(`[api/shiprocketRates] No serviceable couriers found for pincode ${pincode}, falling back to standard charge.`);
      return res.status(200).json({
        rate: standardShippingCharge,
        isFree: false,
        method: 'standard_fallback',
        courier: 'Standard Courier (Fallback)'
      });

    } catch (apiErr) {
      console.error('[api/shiprocketRates] Shiprocket rate API failed, using standard fallback:', apiErr.message);
      return res.status(200).json({
        rate: standardShippingCharge,
        isFree: false,
        method: 'standard_fallback_error',
        courier: 'Standard Courier (Fallback)'
      });
    }

  } catch (err) {
    console.error('[api/shiprocketRates] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
