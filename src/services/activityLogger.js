/**
 * Panstellia Admin — Centralized Activity Logger
 *
 * Usage (fire-and-forget, never throws):
 *   import { logActivity } from '../../services/activityLogger';
 *   logActivity({ module: 'Orders', action: 'ORDER_STATUS_CHANGED', ... });
 *
 * All admin modules should use this single function.
 * It auto-captures admin identity, timestamp, and session metadata.
 */

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ─── Action Constants ────────────────────────────────────────────────────────

export const LOG_ACTIONS = {
  // Orders
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_DELETED: 'ORDER_DELETED',
  ORDER_REFUNDED: 'ORDER_REFUNDED',
  ORDER_TRACKING_UPDATED: 'ORDER_TRACKING_UPDATED',
  ORDER_NOTE_ADDED: 'ORDER_NOTE_ADDED',
  BULK_STATUS_UPDATE: 'BULK_STATUS_UPDATE',

  // Products
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  PRODUCT_STATUS_CHANGED: 'PRODUCT_STATUS_CHANGED',

  // Inventory
  STOCK_STATUS_CHANGED: 'STOCK_STATUS_CHANGED',

  // Reports / Analytics
  REPORT_EXPORTED: 'REPORT_EXPORTED',

  // System
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
  FAILED_ACTION: 'FAILED_ACTION',
  SECURITY_EVENT: 'SECURITY_EVENT',
};

// ─── Module Constants ─────────────────────────────────────────────────────────

export const LOG_MODULES = {
  ORDERS: 'Orders',
  PRODUCTS: 'Products',
  INVENTORY: 'Inventory',
  CUSTOMERS: 'Customers',
  REPORTS: 'Reports',
  DASHBOARD: 'Dashboard',
  SYSTEM: 'System',
};

// ─── Status Constants ─────────────────────────────────────────────────────────

export const LOG_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  SECURITY: 'security',
};

// ─── Core Logger Function ────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {string} params.module          - e.g. LOG_MODULES.ORDERS
 * @param {string} params.action          - e.g. LOG_ACTIONS.ORDER_STATUS_CHANGED
 * @param {string} [params.targetId]      - The ID of the affected record
 * @param {string} [params.targetType]    - e.g. 'order', 'product'
 * @param {string} params.description     - Human-readable description
 * @param {string} [params.oldValue]      - Previous value (JSON string or plain text)
 * @param {string} [params.newValue]      - New value
 * @param {string} [params.status]        - LOG_STATUS.SUCCESS | FAILED | SECURITY
 * @param {object} [params.adminInfo]     - { id, name, email } from useAuth()
 */
export async function logActivity({
  module,
  action,
  targetId = null,
  targetType = null,
  description,
  oldValue = null,
  newValue = null,
  status = LOG_STATUS.SUCCESS,
  adminInfo = null,
}) {
  try {
    const metadata = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      sessionId: getSessionId(),
    };

    const logEntry = {
      timestamp: serverTimestamp(),
      module,
      action,
      targetId: targetId ? String(targetId) : null,
      targetType,
      description,
      oldValue: oldValue !== null ? String(oldValue) : null,
      newValue: newValue !== null ? String(newValue) : null,
      status,
      metadata,
      // Admin identity — populated from the caller
      adminId: adminInfo?.id || null,
      adminName: adminInfo?.name || adminInfo?.email?.split('@')[0] || 'Admin',
      adminEmail: adminInfo?.email || null,
    };

    // Fire and forget — don't await in the UI
    addDoc(collection(db, 'activity_logs'), logEntry).catch(() => {
      // Silent fail — logging must never break admin operations
    });
  } catch {
    // Swallow all errors — logging is never allowed to break the UI
  }
}

// ─── Session ID Helper ───────────────────────────────────────────────────────

function getSessionId() {
  try {
    const key = 'panstellia_admin_session';
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return 'unknown';
  }
}

// ─── Convenience Builders ────────────────────────────────────────────────────

export function buildAdminInfo(user) {
  if (!user) return null;
  return {
    id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Admin',
    email: user.email,
  };
}
