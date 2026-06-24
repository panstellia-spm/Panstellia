/**
 * Panstellia — Order Status Engine
 *
 * Central source of truth for:
 * - Status pipeline definition
 * - Legacy status normalization (backward compat)
 * - SLA thresholds & computation
 * - Delay detection
 * - Delivery estimation
 * - Priority & high-value detection
 */

import {
  Package, Box, Truck,
  MapPin, CheckCircle2, XCircle, RefreshCw, Hand
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PIPELINE
// Keys match exactly what is stored in Firestore.
// Legacy values (picked, out of delivery) are preserved for backward compat.
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_PIPELINE = [
  {
    key: 'processing',
    label: 'Order Placed',
    description: 'Order received & payment confirmed',
    icon: Package,
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      dot: '#9ca3af',
      circle: '#6b7280',
    },
    terminal: false,
  },
  {
    key: 'picked',
    label: 'Picked',
    description: 'Item picked from warehouse',
    icon: Hand,
    color: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: '#3b82f6',
      circle: '#2563eb',
    },
    terminal: false,
  },
  {
    key: 'packed',
    label: 'Packed',
    description: 'Securely packaged for dispatch',
    icon: Box,
    color: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      dot: '#6366f1',
      circle: '#4f46e5',
    },
    terminal: false,
  },
  {
    key: 'shipped',
    label: 'Shipped',
    description: 'Handed over to courier',
    icon: Truck,
    color: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: '#a855f7',
      circle: '#9333ea',
    },
    terminal: false,
  },
  {
    key: 'out of delivery',
    label: 'Out for Delivery',
    description: 'Out for delivery in your area',
    icon: MapPin,
    color: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      dot: '#f97316',
      circle: '#ea580c',
    },
    terminal: false,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Package successfully delivered',
    icon: CheckCircle2,
    color: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      dot: '#22c55e',
      circle: '#16a34a',
    },
    terminal: true,
  },
];

// Terminal states not part of main pipeline
export const TERMINAL_STATUSES = {
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    icon: XCircle,
    color: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: '#ef4444', circle: '#dc2626' },
  },
  refunded: {
    key: 'refunded',
    label: 'Refunded',
    icon: RefreshCw,
    color: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', dot: '#14b8a6', circle: '#0d9488' },
  },
};

// All active (non-terminal) statuses for admin pipeline selection
export const ADMIN_STATUS_OPTIONS = STATUS_PIPELINE.map(s => s.key);

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY NORMALIZATION
// Maps any legacy or variant string to a canonical key in STATUS_PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

const LEGACY_MAP = {
  'order placed': 'processing',
  'payment confirmed': 'processing',
  'order_placed': 'processing',
  'payment_confirmed': 'processing',
  'pending': 'processing',
  'pending_payment': 'processing',
  'confirmed': 'processing',
  'out_for_delivery': 'out of delivery',
  'out for delivery': 'out of delivery',
  'outfordelivery': 'out of delivery',
  'in transit': 'shipped',
  'in_transit': 'shipped',
  'dispatched': 'shipped',
};

/**
 * Normalize any raw status string to a canonical pipeline key.
 * Always returns a valid key or 'processing' as default.
 */
export function normalizeStatus(raw) {
  if (!raw) return 'processing';
  const lower = raw.toString().toLowerCase().trim();
  if (LEGACY_MAP[lower]) return LEGACY_MAP[lower];
  const found = STATUS_PIPELINE.find(s => s.key === lower);
  if (found) return found.key;
  if (lower === 'cancelled') return 'cancelled';
  if (lower === 'refunded') return 'refunded';
  return 'processing';
}

/**
 * Get the step object for a given raw status string.
 */
export function getStatusStep(raw) {
  const key = normalizeStatus(raw);
  if (key === 'cancelled') return TERMINAL_STATUSES.cancelled;
  if (key === 'refunded') return TERMINAL_STATUSES.refunded;
  return STATUS_PIPELINE.find(s => s.key === key) || STATUS_PIPELINE[0];
}

/**
 * Get the 0-based index in the pipeline.
 * Returns -1 for terminal statuses (cancelled/refunded).
 */
export function getStatusIndex(raw) {
  const key = normalizeStatus(raw);
  if (key === 'cancelled' || key === 'refunded') return -1;
  return STATUS_PIPELINE.findIndex(s => s.key === key);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA THRESHOLDS (in hours)
// ─────────────────────────────────────────────────────────────────────────────

export const SLA_THRESHOLDS = {
  processing: 48,      // Placed/Processing -> Picked (48h)
  packing: 24,         // Picked -> Packed (24h)
  shipping: 24,        // Packed -> Shipped (24h)
  delivery: 168,       // Shipped -> Delivered (168h)

  // Compatibility Aliases for existing components:
  processing_to_packed: 48,
  packed_to_shipped: 24,
  shipped_to_delivered: 168,
};

export const HIGH_VALUE_THRESHOLD = 50000; // ₹

/**
 * Validate status transition.
 * Linear flow: processing -> picked -> packed -> shipped -> out of delivery -> delivered.
 * Cancellations allowed from any active state. Refunds allowed from delivered/cancelled.
 * Allows 1-step rollback for corrections.
 */
export function isValidTransition(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);

  if (from === to) return true;

  // Cancellation rules
  if (to === 'cancelled') {
    return ['processing', 'picked', 'packed', 'shipped', 'out of delivery'].includes(from);
  }

  // Refund rules
  if (to === 'refunded') {
    return ['delivered', 'cancelled'].includes(from);
  }

  // Linear progression
  const pipelineKeys = STATUS_PIPELINE.map(s => s.key);
  const fromIdx = pipelineKeys.indexOf(from);
  const toIdx = pipelineKeys.indexOf(to);

  if (fromIdx === -1 || toIdx === -1) return false;

  // Direct forward step
  if (toIdx === fromIdx + 1) return true;

  // Allow one-step rollback for corrections
  if (toIdx === fromIdx - 1) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function hoursBetween(a, b) {
  if (!a || !b) return null;
  return Math.abs(b.getTime() - a.getTime()) / 3600000;
}

function hoursSince(d) {
  if (!d) return null;
  return (Date.now() - d.getTime()) / 3600000;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELAY DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} order - Firestore order document data
 * @returns {{ isDelayed: boolean, type: string|null, hours: number|null, severity: 'warning'|'critical'|null }}
 */
export function detectDelay(order) {
  if (!order) return { isDelayed: false, type: null, hours: null, severity: null };

  const status = normalizeStatus(order.status);
  if (['delivered', 'cancelled', 'refunded'].includes(status)) {
    return { isDelayed: false, type: null, hours: null, severity: null };
  }

  const createdAt = safeToDate(order.createdAt);
  const statusHistory = order.statusHistory || [];

  // Helper: find when a specific status was reached
  const getStatusTime = (statusKey) => {
    const entry = statusHistory.findLast
      ? statusHistory.findLast(e => normalizeStatus(e.status) === statusKey)
      : [...statusHistory].reverse().find(e => normalizeStatus(e.status) === statusKey);
    return entry ? safeToDate(entry.timestamp) : null;
  };

  // Check processing delay (order placed -> not yet picked)
  if (status === 'processing') {
    const hrs = hoursSince(createdAt);
    if (hrs !== null && hrs > SLA_THRESHOLDS.processing) {
      return {
        isDelayed: true,
        type: 'processing',
        hours: Math.round(hrs),
        label: 'Processing Delay',
        severity: hrs > SLA_THRESHOLDS.processing * 2 ? 'critical' : 'warning',
      };
    }
  }

  // Check packing delay (picked -> not yet packed)
  if (status === 'picked') {
    const pickedAt = getStatusTime('picked') || createdAt;
    const hrs = hoursSince(pickedAt);
    if (hrs !== null && hrs > SLA_THRESHOLDS.packing) {
      return {
        isDelayed: true,
        type: 'packing',
        hours: Math.round(hrs),
        label: 'Packing Delay',
        severity: hrs > SLA_THRESHOLDS.packing * 2 ? 'critical' : 'warning',
      };
    }
  }

  // Check shipping delay (packed -> not yet shipped)
  if (status === 'packed') {
    const packedAt = getStatusTime('packed') || createdAt;
    const hrs = hoursSince(packedAt);
    if (hrs !== null && hrs > SLA_THRESHOLDS.shipping) {
      return {
        isDelayed: true,
        type: 'shipping',
        hours: Math.round(hrs),
        label: 'Shipping Delay',
        severity: hrs > SLA_THRESHOLDS.shipping * 2 ? 'critical' : 'warning',
      };
    }
  }

  // Check delivery delay (shipped -> not yet delivered)
  if (['shipped', 'out of delivery'].includes(status)) {
    const shippedAt = getStatusTime('shipped') || createdAt;
    const hrs = hoursSince(shippedAt);
    if (hrs !== null && hrs > SLA_THRESHOLDS.delivery) {
      return {
        isDelayed: true,
        type: 'delivery',
        hours: Math.round(hrs),
        label: 'Delivery Delay',
        severity: hrs > SLA_THRESHOLDS.delivery * 1.5 ? 'critical' : 'warning',
      };
    }
  }

  return { isDelayed: false, type: null, hours: null, severity: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns SLA health across all pipeline stages.
 * @param {object} order
 * @returns {{ stage: string, status: 'on_time'|'at_risk'|'breached', hoursRemaining: number|null }[]}
 */
export function computeSLAStatus(order) {
  const createdAt = safeToDate(order.createdAt);
  const results = [];

  const statusHistory = order.statusHistory || [];
  const getStatusTime = (statusKey) => {
    const entry = (statusHistory.findLast
      ? statusHistory.findLast(e => normalizeStatus(e.status) === statusKey)
      : [...statusHistory].reverse().find(e => normalizeStatus(e.status) === statusKey));
    return entry ? safeToDate(entry.timestamp) : null;
  };

  // Processing SLA
  if (createdAt) {
    const packedAt = getStatusTime('packed');
    const elapsed = packedAt ? hoursBetween(createdAt, packedAt) : hoursSince(createdAt);
    const threshold = SLA_THRESHOLDS.processing_to_packed;
    const remaining = threshold - elapsed;
    results.push({
      stage: 'Processing',
      completed: !!packedAt,
      elapsed: Math.round(elapsed || 0),
      threshold,
      hoursRemaining: Math.round(remaining),
      status: packedAt ? 'completed' : remaining > 12 ? 'on_time' : remaining > 0 ? 'at_risk' : 'breached',
    });
  }

  // Shipping SLA
  const packedAt = getStatusTime('packed');
  if (packedAt) {
    const shippedAt = getStatusTime('shipped');
    const elapsed = shippedAt ? hoursBetween(packedAt, shippedAt) : hoursSince(packedAt);
    const threshold = SLA_THRESHOLDS.packed_to_shipped;
    const remaining = threshold - elapsed;
    results.push({
      stage: 'Shipping',
      completed: !!shippedAt,
      elapsed: Math.round(elapsed || 0),
      threshold,
      hoursRemaining: Math.round(remaining),
      status: shippedAt ? 'completed' : remaining > 6 ? 'on_time' : remaining > 0 ? 'at_risk' : 'breached',
    });
  }

  // Delivery SLA
  const shippedAt = getStatusTime('shipped');
  if (shippedAt) {
    const deliveredAt = getStatusTime('delivered');
    const elapsed = deliveredAt ? hoursBetween(shippedAt, deliveredAt) : hoursSince(shippedAt);
    const threshold = SLA_THRESHOLDS.shipped_to_delivered;
    const remaining = threshold - elapsed;
    results.push({
      stage: 'Delivery',
      completed: !!deliveredAt,
      elapsed: Math.round(elapsed || 0),
      threshold,
      hoursRemaining: Math.round(remaining),
      status: deliveredAt ? 'completed' : remaining > 48 ? 'on_time' : remaining > 0 ? 'at_risk' : 'breached',
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY ESTIMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute estimated delivery date based on shipped timestamp.
 * Falls back to order creation date + processing time if not shipped.
 * @param {object} order
 * @returns {{ date: Date|null, label: string, isEstimate: boolean }}
 */
export function estimateDelivery(order) {
  if (!order) return { date: null, label: 'Unavailable', isEstimate: true };

  // If stored explicitly, use it
  if (order.estimatedDelivery) {
    const d = safeToDate(order.estimatedDelivery);
    if (d) return { date: d, label: formatETA(d), isEstimate: false };
  }

  const statusHistory = order.statusHistory || [];
  const getStatusTime = (statusKey) => {
    const entry = (statusHistory.findLast
      ? statusHistory.findLast(e => normalizeStatus(e.status) === statusKey)
      : [...statusHistory].reverse().find(e => normalizeStatus(e.status) === statusKey));
    return entry ? safeToDate(entry.timestamp) : null;
  };

  const shippedAt = getStatusTime('shipped') || safeToDate(order.shippedAt);
  if (shippedAt) {
    const eta = new Date(shippedAt.getTime() + SLA_THRESHOLDS.shipped_to_delivered * 3600000);
    return { date: eta, label: formatETA(eta), isEstimate: true };
  }

  const createdAt = safeToDate(order.createdAt);
  if (createdAt) {
    const totalHours = SLA_THRESHOLDS.processing_to_packed + SLA_THRESHOLDS.packed_to_shipped + SLA_THRESHOLDS.shipped_to_delivered;
    const eta = new Date(createdAt.getTime() + totalHours * 3600000);
    return { date: eta, label: formatETA(eta), isEstimate: true };
  }

  return { date: null, label: 'Unavailable', isEstimate: true };
}

function formatETA(date) {
  if (!date) return 'Unavailable';
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return 'Expected soon';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGH VALUE & PRIORITY DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export function isHighValueOrder(order) {
  return Number(order?.total || 0) >= HIGH_VALUE_THRESHOLD;
}

export const PRIORITY_CONFIG = {
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  high: { label: 'High Value', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  vip: { label: 'VIP', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  express: { label: 'Express', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export function detectAutoPriority(order) {
  if (!order) return 'normal';
  if (isHighValueOrder(order)) return 'high';
  return order.priority || 'normal';
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatOrderDate(v) {
  const d = safeToDate(v);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatShortDate(v) {
  const d = safeToDate(v);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatINR(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

export function formatINRCompact(v) {
  const num = Number(v || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num.toLocaleString('en-IN')}`;
}
