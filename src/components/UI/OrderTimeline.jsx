/**
 * OrderTimeline.jsx
 *
 * Reads the EXACT status string written by the Admin panel into Firestore
 * and renders a professional Amazon/Flipkart-style tracking timeline.
 *
 * Admin STATUS_OPTIONS (from Admin.jsx line 357-363):
 *   'picked' | 'packed' | 'shipped' | 'out of delivery' | 'delivered'
 *
 * Checkout initial status (Checkout.jsx line 98):
 *   'processing'
 *
 * No mock data. No frontend-only status. Everything mirrors the DB.
 */

import { Check, Package, Hand, Box, Truck, MapPin, Star } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// STEP DEFINITIONS — keys MUST exactly match what Admin writes to Firestore
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_STEPS = [
  {
    key: 'processing',
    label: 'Order Placed',
    description: 'Order received & confirmed',
    Icon: Package,
  },
  {
    key: 'picked',
    label: 'Picked',
    description: 'Item picked from warehouse',
    Icon: Hand,
  },
  {
    key: 'packed',
    label: 'Packed',
    description: 'Securely packaged for shipping',
    Icon: Box,
  },
  {
    key: 'shipped',
    label: 'Shipped',
    description: 'Handed over to courier',
    Icon: Truck,
  },
  {
    key: 'out of delivery',
    label: 'Out for Delivery',
    description: 'On its way to you',
    Icon: MapPin,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Package delivered',
    Icon: Star,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the index of the current status in ORDER_STEPS.
 * Returns 0 (Order Placed) as default for any unknown initial status.
 * Returns -1 for cancelled orders (all steps stay grey).
 */
export function getStatusIndex(rawStatus) {
  if (!rawStatus) return 0;
  const s = rawStatus.toString().toLowerCase().trim();
  if (s === 'cancelled') return -1;
  const idx = ORDER_STEPS.findIndex((step) => step.key === s);
  // Unknown statuses (e.g. legacy 'paid', 'pending') default to step 0
  return idx === -1 ? 0 : idx;
}

/**
 * Returns badge classes and display label for a status string.
 * Badge colour spec (from task requirements):
 *   processing  → Gray   (Order Placed)
 *   picked      → Blue
 *   packed      → Indigo
 *   shipped     → Purple
 *   out of delivery → Orange
 *   delivered   → Green
 *   cancelled   → Red
 */
export function getStatusConfig(rawStatus) {
  const s = (rawStatus || '').toString().toLowerCase().trim();
  switch (s) {
    case 'delivered':
      return {
        badge: 'bg-green-100 text-green-700 border border-green-200',
        dotColor: '#22c55e',
        label: 'Delivered',
      };
    case 'out of delivery':
      return {
        badge: 'bg-orange-100 text-orange-700 border border-orange-200',
        dotColor: '#f97316',
        label: 'Out for Delivery',
      };
    case 'shipped':
      return {
        badge: 'bg-purple-100 text-purple-700 border border-purple-200',
        dotColor: '#a855f7',
        label: 'Shipped',
      };
    case 'packed':
      return {
        badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
        dotColor: '#6366f1',
        label: 'Packed',
      };
    case 'picked':
      return {
        badge: 'bg-blue-100 text-blue-700 border border-blue-200',
        dotColor: '#3b82f6',
        label: 'Picked',
      };
    case 'cancelled':
      return {
        badge: 'bg-red-100 text-red-700 border border-red-200',
        dotColor: '#ef4444',
        label: 'Cancelled',
      };
    default:
      // processing / any unknown → "Order Placed" = Gray
      return {
        badge: 'bg-gray-100 text-gray-600 border border-gray-200',
        dotColor: '#9ca3af',
        label: 'Order Placed',
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

export function StatusBadge({ status, className = '' }) {
  const config = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${config.badge} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.dotColor }}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI PROGRESS BAR  (for My Orders list cards)
// ─────────────────────────────────────────────────────────────────────────────

export function MiniProgressBar({ status }) {
  const cancelled = (status || '').toLowerCase().trim() === 'cancelled';
  const activeIndex = cancelled ? -1 : getStatusIndex(status);

  if (cancelled) {
    return (
      <p className="mt-2 text-xs text-red-500 font-medium">Order Cancelled</p>
    );
  }

  const totalSteps = ORDER_STEPS.length;

  return (
    <div className="mt-3">
      {/* Dots + connectors */}
      <div className="flex items-center">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = idx <= activeIndex;
          const isActive = idx === activeIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Dot */}
              <span
                title={step.label}
                className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-all duration-500 ${
                  isDone
                    ? 'bg-green-500 border-green-500'
                    : 'bg-white border-gray-200'
                } ${isActive ? 'ring-2 ring-green-200 ring-offset-1' : ''}`}
              >
                {isDone && (
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                )}
              </span>

              {/* Connector */}
              {idx < totalSteps - 1 && (
                <div
                  className="flex-1 h-0.5 mx-0.5 transition-all duration-700"
                  style={{ background: idx < activeIndex ? '#22c55e' : '#e5e7eb' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex mt-1">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = idx <= activeIndex;
          const isActive = idx === activeIndex;
          const isFirst = idx === 0;
          const isLast = idx === ORDER_STEPS.length - 1;

          return (
            <div
              key={step.key}
              className={`flex-1 last:flex-none ${isFirst ? 'text-left' : isLast ? 'text-right' : 'text-center'}`}
            >
              <span
                className={`text-[9px] font-semibold leading-tight block ${
                  isActive
                    ? 'text-green-600'
                    : isDone
                    ? 'text-green-500'
                    : 'text-gray-300'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL ORDER TIMELINE  (for Order Details page)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props:
 *   status {string} – raw status value from Firestore (no transformation needed)
 */
export default function OrderTimeline({ status }) {
  const cancelled = (status || '').toLowerCase().trim() === 'cancelled';
  const activeIndex = cancelled ? -1 : getStatusIndex(status);

  return (
    <div className="w-full">
      {/* ══ DESKTOP: horizontal ════════════════════════════════════════════ */}
      <div className="hidden sm:flex items-start w-full">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = !cancelled && idx < activeIndex;
          const isActive = !cancelled && idx === activeIndex;

          return (
            <div
              key={step.key}
              className="flex-1 flex flex-col items-center relative"
              style={{ minWidth: 0 }}
            >
              {/* Left connector */}
              {idx > 0 && (
                <div
                  className="absolute h-0.5 transition-all duration-700"
                  style={{
                    top: '1.25rem',
                    left: 0,
                    right: '50%',
                    background: isDone || isActive ? '#22c55e' : '#e5e7eb',
                  }}
                />
              )}
              {/* Right connector */}
              {idx < ORDER_STEPS.length - 1 && (
                <div
                  className="absolute h-0.5 transition-all duration-700"
                  style={{
                    top: '1.25rem',
                    left: '50%',
                    right: 0,
                    background: isDone ? '#22c55e' : '#e5e7eb',
                  }}
                />
              )}

              {/* Circle */}
              <div className="relative z-10 mb-2">
                {isDone ? (
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 shadow-md shadow-green-200 transition-all duration-500"
                    aria-label={`${step.label} – completed`}
                  >
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </span>
                ) : isActive ? (
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-green-500 shadow-lg ring-4 ring-green-100 transition-all duration-500 animate-pulse-slow"
                    aria-label={`${step.label} – in progress`}
                  >
                    <step.Icon className="w-5 h-5 text-green-600" />
                  </span>
                ) : (
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border-2 border-gray-200 transition-all duration-500"
                    aria-label={`${step.label} – pending`}
                  >
                    <step.Icon className="w-5 h-5 text-gray-300" />
                  </span>
                )}
              </div>

              {/* Label */}
              <p
                className={`text-xs font-semibold text-center leading-tight transition-colors duration-300 ${
                  isDone
                    ? 'text-green-600'
                    : isActive
                    ? 'text-green-700'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>

              {/* Description */}
              <p
                className={`text-[10px] text-center leading-tight mt-0.5 transition-colors duration-300 ${
                  isActive ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* ══ MOBILE: vertical ══════════════════════════════════════════════ */}
      <div className="flex sm:hidden flex-col">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = !cancelled && idx < activeIndex;
          const isActive = !cancelled && idx === activeIndex;
          const isLast = idx === ORDER_STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Left column: icon + vertical line */}
              <div className="flex flex-col items-center shrink-0">
                {isDone ? (
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 shadow-sm shadow-green-200">
                    <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </span>
                ) : isActive ? (
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-green-500 ring-4 ring-green-100 animate-pulse-slow">
                    <step.Icon className="w-4 h-4 text-green-600" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 border-2 border-gray-200">
                    <step.Icon className="w-4 h-4 text-gray-300" />
                  </span>
                )}

                {!isLast && (
                  <div
                    className="w-0.5 my-1 transition-all duration-700"
                    style={{
                      minHeight: '1.75rem',
                      background: isDone ? '#22c55e' : '#e5e7eb',
                    }}
                  />
                )}
              </div>

              {/* Right column: text */}
              <div className={`pt-1 min-w-0 ${!isLast ? 'pb-4' : 'pb-1'}`}>
                <p
                  className={`text-sm font-semibold leading-tight ${
                    isDone
                      ? 'text-green-600'
                      : isActive
                      ? 'text-green-700'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    isActive ? 'text-gray-500' : 'text-gray-300'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ Cancelled notice ══════════════════════════════════════════════ */}
      {cancelled && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          This order was cancelled
        </div>
      )}
    </div>
  );
}
