import { handleCors } from './_cors.js';
import { shiprocketRequest } from './_shiprocketHelper.js';
import admin from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const { pincode, weight = 0.1, isCod = false } = req.body ?? {};

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: 'Valid 6-digit destination pincode is required' });
    }

    const db = admin.firestore();
    const configSnap = await db.collection('system_settings').doc('shiprocket').get();
    let pickupPincode = '607303'; // Default Panstellia pincode fallback
    let defaultPickupLocation = (process.env.SHIPROCKET_PICKUP_LOCATION || 'PANSTELLIA').trim().replace(/^"|"$/g, '');

    if (configSnap.exists) {
      const config = configSnap.data();
      if (config.pickupPincode && config.pickupPincode !== '560001') {
        pickupPincode = String(config.pickupPincode).trim();
      }
      if (config.defaultPickupLocation && config.defaultPickupLocation !== 'Primary') {
        defaultPickupLocation = config.defaultPickupLocation;
      }
    }

    // Call Shiprocket Courier Serviceability API
    // GET /v1/external/courier/serviceability/
    const params = {
      pickup_postcode: pickupPincode,
      delivery_postcode: String(pincode),
      weight: String(weight),
      cod: isCod ? '1' : '0'
    };

    console.log(`[api/shiprocketServiceability] Checking serviceability: from ${pickupPincode} to ${pincode}, weight=${weight}kg`);
    const response = await shiprocketRequest('GET', 'v1/external/courier/serviceability/', null, params);

    // Parse courier response
    if (response && response.status === 200 && response.data) {
      const data = response.data;
      const availableCouriers = data.available_courier_companies || [];
      const deliverable = availableCouriers.length > 0;

      let cheapestCourier = null;
      let fastestCourier = null;

      if (deliverable) {
        // Find cheapest and fastest couriers
        availableCouriers.forEach(c => {
          const rate = Number(c.rate || 999999);
          const etdDays = parseInt(c.estimated_delivery_days) || 7;

          if (!cheapestCourier || rate < Number(cheapestCourier.rate)) {
            cheapestCourier = c;
          }
          if (!fastestCourier || etdDays < (parseInt(fastestCourier.estimated_delivery_days) || 7)) {
            fastestCourier = c;
          }
        });
      }

      return res.status(200).json({
        deliverable,
        pickup_pincode: pickupPincode,
        delivery_pincode: pincode,
        est_days: cheapestCourier ? (cheapestCourier.estimated_delivery_days || '3-5 days') : '5-7 days',
        etd: cheapestCourier ? (cheapestCourier.etd || '') : '',
        rate: cheapestCourier ? Number(cheapestCourier.rate) : 0,
        couriers_count: availableCouriers.length,
        couriers: availableCouriers.map(c => ({
          courier_id: c.courier_company_id || c.courier_id,
          name: c.courier_name,
          rate: Number(c.rate),
          etd: c.etd,
          estimated_delivery_days: c.estimated_delivery_days,
          rating: c.delivery_performance || 4.5
        }))
      });
    } else {
      return res.status(200).json({
        deliverable: false,
        error: 'Pincode not serviceable or Shiprocket returned invalid response.'
      });
    }
  } catch (err) {
    console.error('[api/shiprocketServiceability] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
