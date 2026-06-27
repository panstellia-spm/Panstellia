import admin from './_firebaseAdmin.js';

const db = admin.firestore();
const SHIPROCKET_BASE_URL = (process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in').trim().replace(/\/$/, '');

/**
 * Audit log helper to record Shiprocket operations in Firestore.
 */
export async function logShiprocketAction(type, action, status, message, details = null) {
  try {
    const logRef = db.collection('shiprocket_logs').doc();
    await logRef.set({
      type,
      action,
      status,
      message,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[shiprocketHelper] Failed to write audit log:', err.message);
  }
}

/**
 * Retrieves the current Shiprocket JWT token.
 * Reads from cache in Firestore, refreshing it if expired or forced.
 * 
 * @param {boolean} forceRefresh - If true, ignores cache and requests a new token.
 */
export async function getShiprocketToken(forceRefresh = false) {
  const cacheRef = db.collection('system_settings').doc('shiprocket_auth');
  
  if (!forceRefresh) {
    try {
      const snap = await cacheRef.get();
      if (snap.exists) {
        const data = snap.data();
        // If token exists and has more than 15 minutes of life left, return it
        const bufferTime = 15 * 60 * 1000; // 15 mins
        if (data.token && data.expiresAt && (Number(data.expiresAt) - bufferTime > Date.now())) {
          return data.token;
        }
      }
    } catch (cacheErr) {
      console.warn('[shiprocketHelper] Error reading token cache, falling back to login:', cacheErr.message);
    }
  }

  // Generate new token from Shiprocket API
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;

  if (!email || !password) {
    const errorMsg = 'Missing SHIPROCKET_API_EMAIL or SHIPROCKET_API_PASSWORD in env variables';
    await logShiprocketAction('auth', 'get_token', 'failed', errorMsg);
    throw new Error(errorMsg);
  }

  const cleanEmail = email.trim().replace(/^"|"$/g, '');
  const cleanPassword = password.trim().replace(/^"|"$/g, '');

  try {
    console.log('[shiprocketHelper] Requesting new Shiprocket auth token...');
    const res = await fetch(`${SHIPROCKET_BASE_URL}/v1/external/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shiprocket auth login failed with status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error('Response did not contain token: ' + JSON.stringify(data));
    }

    // Token is valid for 10 days (240 hours) by default. Set expiresAt accordingly
    const expiresInSec = data.expires_in || (10 * 24 * 60 * 60);
    const expiresAt = Date.now() + (expiresInSec * 1000);

    // Save back to Firestore cache
    await cacheRef.set({
      token: data.token,
      expiresAt: expiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await logShiprocketAction('auth', 'get_token', 'success', 'Successfully generated and cached token');
    return data.token;
  } catch (err) {
    console.error('[shiprocketHelper] Authentication failure:', err.message);
    await logShiprocketAction('auth', 'get_token', 'failed', err.message);
    throw err;
  }
}

/**
 * Generic API request wrapper for Shiprocket API.
 * Handles headers, token, and automatic retry (401 refresh token).
 */
export async function shiprocketRequest(method, path, body = null, params = null) {
  const token = await getShiprocketToken();
  const cleanPath = path.replace(/^\//, '');
  let url = `${SHIPROCKET_BASE_URL}/${cleanPath}`;

  if (params) {
    const query = new URLSearchParams(params).toString();
    url += `?${query}`;
  }

  const options = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    let res = await fetch(url, options);

    // If 401, force token refresh and try once more
    if (res.status === 401) {
      console.warn(`[shiprocketHelper] Got 401 Unauthorized for path ${path}. Refreshing token...`);
      const newToken = await getShiprocketToken(true);
      options.headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, options);
    }

    const contentType = res.headers.get('content-type') || '';
    let responseData;
    if (contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      responseData = { text: await res.text() };
    }

    if (!res.ok) {
      const errorMsg = responseData?.message || responseData?.errors || `API request failed with status ${res.status}`;
      await logShiprocketAction('api', path, 'failed', errorMsg, { request: body || params, response: responseData });
      throw new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    }

    return responseData;
  } catch (err) {
    console.error(`[shiprocketHelper] API Error calling ${path}:`, err.message);
    throw err;
  }
}
