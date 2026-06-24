/**
 * OrderTimeline.jsx — Enterprise Edition
 *
 * Enhanced order tracking timeline with:
 * - Status timestamps from statusHistory[]
 * - Refunded terminal state
 * - Full backward compatibility with existing status strings
 * - Cancelled & refunded display states
 *
 * Admin STATUS values in Firestore:
 *   'processing' | 'picked' | 'packed' | 'shipped' | 'out of delivery' | 'delivered' | 'cancelled' | 'refunded'
 */

import { Check, Package, Hand, Box, Truck, MapPin, Star, XCircle, RefreshCw } from 'lucide-react';
import { normalizeStatus, getStatusIndex, STATUS_PIPELINE, TERMINAL_STATUSES, safeToDate } from '../../services/orderStatus';

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORT for backward compatibility with all existing consumers
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_STEPS = STATUS_PIPELINE.map(s => ({
  key: s.key,
  label: s.label,
  description: s.description,
  Icon: s.icon,
}));

export { getStatusIndex };

// ─────────────────────────────────────────────────────────────────────────────
// getStatusConfig — backward-compat export (used by Orders.jsx, OrderDetails.jsx)
// ─────────────────────────────────────────────────────────────────────────────

export function getStatusConfig(rawStatus) {
  const s = normalizeStatus(rawStatus);
  if (s === 'cancelled') {
    return { badge: 'bg-red-100 text-red-700 border border-red-200', dotColor: '#ef4444', label: 'Cancelled' };
  }
  if (s === 'refunded') {
    return { badge: 'bg-teal-100 text-teal-700 border border-teal-200', dotColor: '#14b8a6', label: 'Refunded' };
  }
  const step = STATUS_PIPELINE.find(p => p.key === s) || STATUS_PIPELINE[0];
  return {
    badge: `${step.color.bg} ${step.color.text} border ${step.color.border}`,
    dotColor: step.color.dot,
    label: step.label,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE — exported for backward compat
// ─────────────────────────────────────────────────────────────────────────────

export function StatusBadge({ status, className = '' }) {
  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${config.badge} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.dotColor }} aria-hidden="true" />
      {config.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI PROGRESS BAR — exported for backward compat (used on Orders list page)
// ─────────────────────────────────────────────────────────────────────────────

export function MiniProgressBar({ status }) {
  const normalised = normalizeStatus(status);
  const cancelled = normalised === 'cancelled';
  const refunded = normalised === 'refunded';
  const activeIndex = (cancelled || refunded) ? -1 : getStatusIndex(normalised);

  if (cancelled) return <p className="mt-2 text-xs text-red-500 font-medium">Order Cancelled</p>;
  if (refunded) return <p className="mt-2 text-xs text-teal-600 font-medium">Order Refunded</p>;

  const totalSteps = ORDER_STEPS.length;
  return (
    <div className="mt-3">
      <div className="flex items-center">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = idx <= activeIndex;
          const isActive = idx === activeIndex;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <span
                title={step.label}
                className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-all duration-500 ${
                  isDone ? 'bg-green-500 border-green-500' : 'bg-white border-gray-200'
                } ${isActive ? 'ring-2 ring-green-200 ring-offset-1' : ''}`}
              >
                {isDone && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </span>
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
      <div className="flex mt-1">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = idx <= activeIndex;
          const isActive = idx === activeIndex;
          return (
            <div
              key={step.key}
              className={`flex-1 last:flex-none ${idx === 0 ? 'text-left' : idx === ORDER_STEPS.length - 1 ? 'text-right' : 'text-center'}`}
            >
              <span className={`text-[9px] font-semibold leading-tight block ${
                isActive ? 'text-green-600' : isDone ? 'text-green-500' : 'text-gray-300'
              }`}>
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
// TIMESTAMP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getTimestampForStep(stepKey, statusHistory) {
  if (!statusHistory?.length) return null;
  // Find the last time this status was set
  const entry = (statusHistory.findLast
    ? statusHistory.findLast(e => normalizeStatus(e.status) === stepKey)
    : [...statusHistory].reverse().find(e => normalizeStatus(e.status) === stepKey));
  if (!entry) return null;
  return safeToDate(entry.timestamp);
}

function formatTimestamp(date) {
  if (!date) return null;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL ORDER TIMELINE — default export
// Props:
//   status {string}        — raw status from Firestore
//   statusHistory {array}  — optional array of { status, timestamp, adminName, note }
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderTimeline({ status, statusHistory = [] }) {
  const normalised = normalizeStatus(status);
  const cancelled = normalised === 'cancelled';
  const refunded = normalised === 'refunded';
  const activeIndex = (cancelled || refunded) ? -1 : getStatusIndex(normalised);

  return (
    <div className="w-full">

      {/* ══ DESKTOP: horizontal ══════════════════════════════════════════════ */}
      <div className="hidden sm:flex items-start w-full">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = !cancelled && !refunded && idx < activeIndex;
          const isActive = !cancelled && !refunded && idx === activeIndex;
          const ts = getTimestampForStep(step.key, statusHistory);

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative" style={{ minWidth: 0 }}>
              {/* Left connector */}
              {idx > 0 && (
                <div
                  className="absolute h-0.5 transition-all duration-700"
                  style={{ top: '1.25rem', left: 0, right: '50%', background: isDone || isActive ? '#22c55e' : '#e5e7eb' }}
                />
              )}
              {/* Right connector */}
              {idx < ORDER_STEPS.length - 1 && (
                <div
                  className="absolute h-0.5 transition-all duration-700"
                  style={{ top: '1.25rem', left: '50%', right: 0, background: isDone ? '#22c55e' : '#e5e7eb' }}
                />
              )}

              {/* Circle */}
              <div className="relative z-10 mb-2">
                {isDone ? (
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 shadow-md shadow-green-200" aria-label={`${step.label} – completed`}>
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </span>
                ) : isActive ? (
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-green-500 shadow-lg ring-4 ring-green-100 animate-pulse-slow" aria-label={`${step.label} – in progress`}>
                    <step.Icon className="w-5 h-5 text-green-600" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border-2 border-gray-200" aria-label={`${step.label} – pending`}>
                    <step.Icon className="w-5 h-5 text-gray-300" />
                  </span>
                )}
              </div>

              {/* Label */}
              <p className={`text-xs font-semibold text-center leading-tight transition-colors duration-300 ${
                isDone ? 'text-green-600' : isActive ? 'text-green-700' : 'text-gray-400'
              }`}>
                {step.label}
              </p>

              {/* Description */}
              <p className={`text-[10px] text-center leading-tight mt-0.5 transition-colors duration-300 ${
                isActive ? 'text-gray-500' : 'text-gray-300'
              }`}>
                {step.description}
              </p>

              {/* Timestamp (from statusHistory) */}
              {(isDone || isActive) && ts && (
                <p className="text-[9px] text-center text-green-500 mt-0.5 leading-tight">
                  {formatTimestamp(ts)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ══ MOBILE: vertical ════════════════════════════════════════════════ */}
      <div className="flex sm:hidden flex-col">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = !cancelled && !refunded && idx < activeIndex;
          const isActive = !cancelled && !refunded && idx === activeIndex;
          const isLast = idx === ORDER_STEPS.length - 1;
          const ts = getTimestampForStep(step.key, statusHistory);

          return (
            <div key={step.key} className="flex items-start gap-3">
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
                    style={{ minHeight: '1.75rem', background: isDone ? '#22c55e' : '#e5e7eb' }}
                  />
                )}
              </div>

              <div className={`pt-1 min-w-0 ${!isLast ? 'pb-4' : 'pb-1'}`}>
                <p className={`text-sm font-semibold leading-tight ${
                  isDone ? 'text-green-600' : isActive ? 'text-green-700' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>
                  {step.description}
                </p>
                {(isDone || isActive) && ts && (
                  <p className="text-[10px] text-green-500 mt-0.5">{formatTimestamp(ts)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ Cancelled notice ════════════════════════════════════════════════ */}
      {cancelled && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-500 font-medium bg-red-50 rounded-xl p-3 border border-red-200">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          This order was cancelled
        </div>
      )}

      {/* ══ Refunded notice ═════════════════════════════════════════════════ */}
      {refunded && (
        <div className="mt-4 flex items-center gap-2 text-sm text-teal-600 font-medium bg-teal-50 rounded-xl p-3 border border-teal-200">
          <RefreshCw className="w-4 h-4 flex-shrink-0" />
          This order has been refunded
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT ACTIVITY TIMELINE — for admin order detail sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function ActivityTimeline({ statusHistory = [], className = '' }) {
  if (!statusHistory.length) {
    return <p className="text-xs text-luxury-400 py-4 text-center">No status history recorded</p>;
  }

  // Sort by timestamp ascending
  const sorted = [...statusHistory]
    .filter(e => e.status && e.status !== 'tracking_updated')
    .sort((a, b) => {
      const da = safeToDate(a.timestamp);
      const db2 = safeToDate(b.timestamp);
      if (!da || !db2) return 0;
      return da.getTime() - db2.getTime();
    });

  return (
    <div className={`space-y-0 ${className}`}>
      {sorted.map((entry, idx) => {
        const config = getStatusConfig(entry.status);
        const ts = safeToDate(entry.timestamp);
        const isLast = idx === sorted.length - 1;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <span
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0 mt-1"
                style={{ backgroundColor: config.dotColor }}
              />
              {!isLast && <div className="w-0.5 flex-1 bg-luxury-200 mt-1 mb-0" style={{ minHeight: '2rem' }} />}
            </div>
            <div className={`min-w-0 ${!isLast ? 'pb-4' : 'pb-1'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
                  {config.label}
                </span>
                {entry.adminName && (
                  <span className="text-[10px] text-luxury-500">by {entry.adminName}</span>
                )}
              </div>
              {ts && (
                <p className="text-[10px] text-luxury-400 mt-0.5">{formatTimestamp(ts)}</p>
              )}
              {entry.note && (
                <p className="text-xs text-luxury-600 mt-1 italic">"{entry.note}"</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
