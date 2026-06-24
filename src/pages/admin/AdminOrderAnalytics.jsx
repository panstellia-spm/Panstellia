/**
 * AdminOrderAnalytics.jsx — Order Analytics & Intelligence Dashboard
 *
 * Pure client-side analytics from the orders collection:
 * - Revenue by status breakdown
 * - Order funnel (Placed → Delivered)
 * - Daily/Weekly/Monthly trend charts (SVG sparklines)
 * - Cancellation analytics
 * - Delivery performance metrics
 * - Top performing periods
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, ShoppingBag, CheckCircle2,
  XCircle, Clock, BarChart3, ArrowUp, ArrowDown, Target,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAllOrders } from '../../services/orderTracking';
import {
  normalizeStatus, formatINR, formatINRCompact, safeToDate,
} from '../../services/orderStatus';

// ─────────────────────────────────────────────────────────────────────────────
// CHART COMPONENTS (SVG — no external libraries)
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#D97706', height = 60 }) {
  if (!data?.length || data.length < 2) return (
    <div className="flex items-center justify-center text-xs text-luxury-400" style={{ height }}>No data</div>
  );
  const max = Math.max(...data, 1);
  const width = 300;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height * 0.88 - height * 0.06;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `0,${height} ${polyline} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg${color.replace('#', '')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1].split(',');
        return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />;
      })()}
    </svg>
  );
}

function BarChart({ data, color = '#D97706', maxLabel }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((item, idx) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={idx} className="flex flex-col items-center flex-1 gap-1">
            <span className="text-[9px] text-luxury-500 font-medium">
              {item.value > 0 ? (maxLabel ? formatINRCompact(item.value) : item.value) : ''}
            </span>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color, opacity: 0.7 + (pct / max) * 0.3 }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="text-[8px] text-luxury-400 text-center truncate w-full">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function FunnelBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-luxury-700">{label}</span>
        <span className="text-xs font-bold text-luxury-900">{value} <span className="text-luxury-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2.5 bg-luxury-100 rounded-full overflow-hidden">
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────

function KPI({ icon: Icon, iconBg, iconColor, label, value, sub, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-luxury-900 leading-tight">{value}</p>
        <p className="text-xs text-luxury-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-luxury-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminOrderAnalytics() {
  const { isAdmin } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  if (!isAdmin) return null;

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Period filter ─────────────────────────────────────────────────────────

  const periodOrders = useMemo(() => {
    const now = Date.now();
    const ms = { '7d': 7, '30d': 30, '90d': 90, 'all': 36500 }[period] * 86400000;
    return orders.filter(o => {
      const d = safeToDate(o.createdAt);
      return d && now - d.getTime() <= ms;
    });
  }, [orders, period]);

  // ── Metrics ───────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = periodOrders.length;
    const delivered = periodOrders.filter(o => normalizeStatus(o.status) === 'delivered');
    const cancelled = periodOrders.filter(o => normalizeStatus(o.status) === 'cancelled');
    const active = periodOrders.filter(o => !['delivered', 'cancelled', 'refunded'].includes(normalizeStatus(o.status)));

    const revenue = delivered.reduce((s, o) => s + Number(o.total || 0), 0);
    const avgOrderValue = total > 0 ? periodOrders.reduce((s, o) => s + Number(o.total || 0), 0) / total : 0;

    const conversionRate = total > 0 ? Math.round((delivered.length / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0;

    // Revenue by status
    const revenueByStatus = {};
    periodOrders.forEach(o => {
      const s = normalizeStatus(o.status);
      revenueByStatus[s] = (revenueByStatus[s] || 0) + Number(o.total || 0);
    });

    // Daily orders for trend chart (last 30 days max)
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 30;
    const dailyOrders = Array.from({ length: days }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (days - 1 - i));
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return periodOrders.filter(o => {
        const d = safeToDate(o.createdAt);
        return d && d >= day && d < next;
      }).length;
    });

    // Daily revenue
    const dailyRevenue = Array.from({ length: days }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (days - 1 - i));
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return delivered.filter(o => {
        const d = safeToDate(o.createdAt);
        return d && d >= day && d < next;
      }).reduce((s, o) => s + Number(o.total || 0), 0);
    });

    // Delivery performance: avg hours from placed to delivered
    const deliveryTimes = delivered.map(o => {
      const placed = safeToDate(o.createdAt);
      const deliveredAt = (o.statusHistory || []).findLast?.(e => normalizeStatus(e.status) === 'delivered');
      const deliveredDate = deliveredAt ? safeToDate(deliveredAt.timestamp) : null;
      if (!placed || !deliveredDate) return null;
      return (deliveredDate.getTime() - placed.getTime()) / 3600000;
    }).filter(Boolean);

    const avgDeliveryHours = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : null;

    // Orders by day of week
    const byDOW = Array(7).fill(0);
    periodOrders.forEach(o => {
      const d = safeToDate(o.createdAt);
      if (d) byDOW[d.getDay()]++;
    });
    const dowData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((l, i) => ({ label: l, value: byDOW[i] }));

    return {
      total, deliveredCount: delivered.length, cancelledCount: cancelled.length,
      activeCount: active.length, revenue, avgOrderValue, conversionRate,
      cancellationRate, revenueByStatus, dailyOrders, dailyRevenue,
      avgDeliveryHours, dowData, deliveryTimes,
    };
  }, [periodOrders]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900">Order Analytics</h1>
          <p className="text-sm text-luxury-500 mt-0.5">Intelligence insights across your entire order pipeline</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-luxury-200 p-1">
          {[['7d', '7 Days'], ['30d', '30 Days'], ['90d', '90 Days'], ['all', 'All Time']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === val ? 'bg-gold-500 text-white shadow-sm' : 'text-luxury-600 hover:bg-luxury-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPI icon={ShoppingBag} iconBg="bg-blue-50" iconColor="text-blue-600"
          label="Total Orders" value={loading ? '—' : metrics.total} sub={`in selected period`} />
        <KPI icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600"
          label="Revenue (Delivered)" value={loading ? '—' : formatINRCompact(metrics.revenue)} />
        <KPI icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600"
          label="Avg Order Value" value={loading ? '—' : formatINR(metrics.avgOrderValue)} />
        <KPI icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600"
          label="Conversion Rate" value={loading ? '—' : `${metrics.conversionRate}%`} sub="Placed → Delivered" />
        <KPI icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600"
          label="Cancellation Rate" value={loading ? '—' : `${metrics.cancellationRate}%`} />
      </div>

      {/* Charts Row 1: Order Trend + DOW distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Order Trend Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-luxury-900">Order Volume Trend</h2>
              <p className="text-xs text-luxury-500 mt-0.5">Daily orders over selected period</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-luxury-400">Peak day</p>
              <p className="text-sm font-bold text-luxury-900">{Math.max(...(metrics.dailyOrders || [0]))} orders</p>
            </div>
          </div>
          {loading ? <div className="skeleton h-16 rounded-xl" /> : (
            <>
              <Sparkline data={metrics.dailyOrders} color="#3b82f6" height={72} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-luxury-400">{period === '7d' ? '7d ago' : period === '30d' ? '30d ago' : '90d ago'}</span>
                <span className="text-[10px] text-luxury-400">Today</span>
              </div>
            </>
          )}
        </div>

        {/* Day of Week distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <h2 className="text-sm font-bold text-luxury-900 mb-1">Orders by Day of Week</h2>
          <p className="text-xs text-luxury-500 mb-4">Which days get most orders</p>
          {loading ? <div className="skeleton h-24 rounded-xl" /> : (
            <BarChart data={metrics.dowData} color="#a855f7" />
          )}
        </div>
      </div>

      {/* Charts Row 2: Revenue Trend + Funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-luxury-900">Revenue Trend</h2>
              <p className="text-xs text-luxury-500 mt-0.5">Daily delivered order revenue</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-luxury-400">Total period</p>
              <p className="text-sm font-bold text-luxury-900">{formatINRCompact(metrics.revenue)}</p>
            </div>
          </div>
          {loading ? <div className="skeleton h-16 rounded-xl" /> : (
            <>
              <Sparkline data={metrics.dailyRevenue} color="#D97706" height={72} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-luxury-400">{period === '7d' ? '7d ago' : period === '30d' ? '30d ago' : '90d ago'}</span>
                <span className="text-[10px] text-luxury-400">Today</span>
              </div>
            </>
          )}
        </div>

        {/* Delivery Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <h2 className="text-sm font-bold text-luxury-900 mb-1">Delivery Performance</h2>
          <p className="text-xs text-luxury-500 mb-4">Avg time from order to delivery</p>
          {loading ? <div className="skeleton h-24 rounded-xl" /> : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-luxury-900">
                  {metrics.avgDeliveryHours
                    ? `${(metrics.avgDeliveryHours / 24).toFixed(1)}d`
                    : '—'
                  }
                </p>
                <p className="text-xs text-luxury-500 mt-1">Average delivery time</p>
              </div>
              {metrics.avgDeliveryHours && (
                <div className="text-center text-xs text-luxury-500">
                  <span className="font-medium text-luxury-700">{Math.round(metrics.avgDeliveryHours)}h</span> total avg
                  {metrics.deliveryTimes.length > 0 && (
                    <span> across {metrics.deliveryTimes.length} delivered orders</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Funnel */}
      <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
        <h2 className="text-sm font-bold text-luxury-900 mb-1">Order Fulfillment Funnel</h2>
        <p className="text-xs text-luxury-500 mb-5">Conversion rates across the pipeline</p>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {[
              { label: 'Order Placed', key: 'processing', color: '#9ca3af' },
              { label: 'Picked', key: 'picked', color: '#3b82f6' },
              { label: 'Packed', key: 'packed', color: '#6366f1' },
              { label: 'Shipped', key: 'shipped', color: '#a855f7' },
              { label: 'Out for Delivery', key: 'out of delivery', color: '#f97316' },
              { label: 'Delivered ✓', key: 'delivered', color: '#22c55e' },
            ].map(stage => {
              // Count orders that passed through this stage (current or beyond)
              const stageIdx = ['processing', 'picked', 'packed', 'shipped', 'out of delivery', 'delivered'].indexOf(stage.key);
              const allStatuses = ['processing', 'picked', 'packed', 'shipped', 'out of delivery', 'delivered'];
              const count = periodOrders.filter(o => {
                const idx = allStatuses.indexOf(normalizeStatus(o.status));
                return idx >= stageIdx;
              }).length;
              return (
                <FunnelBar key={stage.key} label={stage.label} value={count} total={metrics.total} color={stage.color} />
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
          <h2 className="text-sm font-bold text-luxury-900 mb-4">Cancellation Rate Over Time</h2>
          {loading ? <div className="skeleton h-24 rounded-xl" /> : (
            <div className="space-y-3">
              <div className="text-4xl font-bold text-red-600 text-center py-4">{metrics.cancellationRate}%</div>
              <div className="flex justify-between text-xs text-luxury-500">
                <span>{metrics.cancelledCount} orders cancelled</span>
                <span>out of {metrics.total} total</span>
              </div>
              <div className="h-2 bg-luxury-100 rounded-full overflow-hidden">
                <div className="h-2 bg-red-400 rounded-full" style={{ width: `${metrics.cancellationRate}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-gold-500 to-gold-700 rounded-2xl shadow-sm p-5 text-white">
          <h2 className="text-sm font-bold text-gold-100 mb-4">Period Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gold-200">Total Orders</span>
              <span className="text-sm font-bold">{metrics.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gold-200">Delivered</span>
              <span className="text-sm font-bold text-green-200">{metrics.deliveredCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gold-200">In Progress</span>
              <span className="text-sm font-bold">{metrics.activeCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gold-200">Cancelled</span>
              <span className="text-sm font-bold text-red-200">{metrics.cancelledCount}</span>
            </div>
            <div className="border-t border-gold-400/50 pt-2 mt-2 flex justify-between">
              <span className="text-sm text-gold-100 font-semibold">Revenue</span>
              <span className="text-lg font-bold">{formatINRCompact(metrics.revenue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
