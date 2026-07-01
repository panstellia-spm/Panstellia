import { handleCors } from './_cors.js';
import { shiprocketRequest } from './_shiprocketHelper.js';
import admin from './_firebaseAdmin.js';

const db = admin.firestore();

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const { action, config, limit = 50 } = req.body ?? {};

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION 1: GET CONFIG & PICKUP LOCATIONS & LOGS
    // ─────────────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      
      // Get current configurations
      if (action === 'get_config') {
        // 1. Fetch active pickup locations from Shiprocket API first
        let pickupLocations = [];
        try {
          console.log('[api/shiprocketConfig] Fetching pickup addresses from Shiprocket');
          const response = await shiprocketRequest('GET', 'v1/external/settings/company/pickup');
          if (response && response.data && response.data.shipping_address) {
            pickupLocations = Array.isArray(response.data.shipping_address) 
              ? response.data.shipping_address 
              : Object.values(response.data.shipping_address);
          }
        } catch (apiErr) {
          console.warn('[api/shiprocketConfig] Failed to fetch pickup locations from Shiprocket:', apiErr.message);
        }

        const mappedLocations = pickupLocations.map(loc => ({
          id: loc.id,
          pickup_location: loc.pickup_location,
          pincode: loc.pin_code || loc.pincode || '',
          address: `${loc.address || ''}, ${loc.city || ''}, ${loc.state || ''}`,
          phone: loc.phone || ''
        }));

        // 2. Fetch configurations
        const configSnap = await db.collection('system_settings').doc('shiprocket').get();
        let configData = configSnap.exists ? configSnap.data() : {
          enabled: false,
          autoAwbEnabled: false,
          defaultPickupLocation: 'PANSTELLIA',
          pickupPincode: '607303',
          defaultWeight: 0.1,
          defaultLength: 10,
          defaultBreadth: 10,
          defaultHeight: 5
        };

        // 3. If config is default/Primary or not set, resolve dynamically using mapped locations
        if (mappedLocations.length > 0) {
          const firstLoc = mappedLocations[0];
          if (!configData.defaultPickupLocation || configData.defaultPickupLocation === 'Primary') {
            configData.defaultPickupLocation = firstLoc.pickup_location;
            configData.pickupPincode = firstLoc.pincode;
          } else {
            // Ensure the pincode is synchronized with the selected pickup location
            const matched = mappedLocations.find(l => l.pickup_location === configData.defaultPickupLocation);
            if (matched) {
              configData.pickupPincode = matched.pincode;
            }
          }
        } else {
          // If no pickup locations fetched from Shiprocket, fall back to environment variable or standard
          const envPickup = (process.env.SHIPROCKET_PICKUP_LOCATION || 'PANSTELLIA').trim().replace(/^"|"$/g, '');
          if (!configData.defaultPickupLocation || configData.defaultPickupLocation === 'Primary') {
            configData.defaultPickupLocation = envPickup;
            configData.pickupPincode = '607303';
          }
        }

        return res.status(200).json({
          config: configData,
          pickupLocations: mappedLocations
        });
      }

      // Save configurations
      else if (action === 'save_config') {
        if (!config) {
          return res.status(400).json({ error: 'Config payload is required' });
        }

        const configRef = db.collection('system_settings').doc('shiprocket');
        const newConfig = {
          enabled: Boolean(config.enabled),
          autoAwbEnabled: Boolean(config.autoAwbEnabled),
          defaultPickupLocation: String(config.defaultPickupLocation || 'Primary'),
          pickupPincode: String(config.pickupPincode || '560001'),
          defaultWeight: Number(config.defaultWeight || 0.1),
          defaultLength: Number(config.defaultLength || 10),
          defaultBreadth: Number(config.defaultBreadth || 10),
          defaultHeight: Number(config.defaultHeight || 5),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await configRef.set(newConfig);

        // Add setting update to settings history
        await db.collection('settings_history').add({
          module: 'shiprocket',
          data: newConfig,
          changedBy: 'Admin',
          changedAt: new Date().toISOString(),
          summary: `Updated Shiprocket settings: Enabled=${newConfig.enabled}, AutoAWB=${newConfig.autoAwbEnabled}, PickupPincode=${newConfig.pickupPincode}`
        });

        return res.status(200).json({ success: true, config: newConfig });
      }

      // Fetch audit logs & webhook logs
      else if (action === 'get_logs') {
        // Query audit logs
        const logsSnap = await db.collection('shiprocket_logs')
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get();

        const logs = [];
        logsSnap.forEach(doc => {
          const data = doc.data();
          logs.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : null
          });
        });

        // Query webhook logs
        const webhooksSnap = await db.collection('shiprocket_webhooks')
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get();

        const webhooks = [];
        webhooksSnap.forEach(doc => {
          const data = doc.data();
          webhooks.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : null
          });
        });

        return res.status(200).json({ logs, webhooks });
      }

      else {
        return res.status(400).json({ error: `Action "${action}" is not recognized` });
      }
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

  } catch (err) {
    console.error('[api/shiprocketConfig] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Configuration request failed' });
  }
}
