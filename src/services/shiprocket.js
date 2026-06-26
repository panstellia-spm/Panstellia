// Shiprocket frontend service
// Communicates with secure Vercel Serverless endpoints

async function parseErrorResponse(response) {
  let text = '';
  try {
    text = await response.text();
  } catch {
    // ignore
  }

  if (!text) return null;

  try {
    const data = JSON.parse(text);
    return data?.error || data?.message || null;
  } catch {
    return text;
  }
}

/**
 * Common request fetch wrapper.
 */
async function callApi(endpoint, payload, authToken = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await parseErrorResponse(response);
    throw new Error(err || `API request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Check delivery serviceability for a pincode.
 */
export async function checkServiceability(pincode, weight = 0.1, isCod = false, authToken = null) {
  return callApi('/api/shiprocketServiceability', { pincode, weight, isCod }, authToken);
}

/**
 * Calculate dynamic shipping rates for checkout.
 */
export async function calculateRates(pincode, subtotal, weight = 0.1, isCod = false, authToken = null) {
  return callApi('/api/shiprocketRates', { pincode, subtotal, weight, isCod }, authToken);
}

/**
 * Send order to Shiprocket (Creates adhoc order & shipment).
 */
export async function createShiprocketOrder(orderDocId, packageDetails = null, authToken = null) {
  return callApi('/api/shiprocketAction', {
    action: 'create_order',
    orderDocId,
    packageDetails
  }, authToken);
}

/**
 * Assign an AWB tracking number to shipment.
 */
export async function assignAWB(orderDocId, shipmentId, courierId = null, authToken = null) {
  return callApi('/api/shiprocketAction', {
    action: 'assign_awb',
    orderDocId,
    shipmentId,
    courierId
  }, authToken);
}

/**
 * Schedule pickup for shipment.
 */
export async function schedulePickup(orderDocId, shipmentId, authToken = null) {
  return callApi('/api/shiprocketAction', {
    action: 'schedule_pickup',
    orderDocId,
    shipmentId
  }, authToken);
}

/**
 * Generate AWB and Courier label PDF link.
 */
export async function generateLabel(shipmentId, authToken = null) {
  return callApi('/api/shiprocketAction', {
    action: 'generate_label',
    shipmentId
  }, authToken);
}

/**
 * Generate invoice PDF link.
 */
export async function generateInvoice(shiprocketOrderId, authToken = null) {
  return callApi('/api/shiprocketAction', {
    action: 'generate_invoice',
    shiprocketOrderId
  }, authToken);
}

/**
 * Cancel a shipment/order in Shiprocket.
 */
export async function cancelShipment(orderDocId, shiprocketOrderId, authToken = null) {
  return callApi('/api/shiprocketAction', {
    action: 'cancel_shipment',
    orderDocId,
    shiprocketOrderId
  }, authToken);
}

/**
 * Get Shiprocket Config settings and active Pickup Locations.
 */
export async function getShiprocketConfig(authToken = null) {
  return callApi('/api/shiprocketConfig', { action: 'get_config' }, authToken);
}

/**
 * Save Shiprocket settings configuration.
 */
export async function saveShiprocketConfig(config, authToken = null) {
  return callApi('/api/shiprocketConfig', { action: 'save_config', config }, authToken);
}

/**
 * Retrieve Shiprocket audit logs and webhook logs.
 */
export async function getShiprocketLogs(limit = 50, authToken = null) {
  return callApi('/api/shiprocketConfig', { action: 'get_logs', limit }, authToken);
}

export default {
  checkServiceability,
  calculateRates,
  createShiprocketOrder,
  assignAWB,
  schedulePickup,
  generateLabel,
  generateInvoice,
  cancelShipment,
  getShiprocketConfig,
  saveShiprocketConfig,
  getShiprocketLogs
};
