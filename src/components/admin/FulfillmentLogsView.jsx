/**
 * FulfillmentLogsView.jsx — Fulfillment Audit Trail Viewer
 */

import { useState, useEffect } from 'react';
import { subscribeToFulfillmentLogs } from '../../services/orderTracking';
import { Activity, Clock, User, Clipboard, AlertTriangle } from 'lucide-react';

export default function FulfillmentLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToFulfillmentLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const formatLogDate = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getActionColor = (action) => {
    const act = action.toLowerCase();
    if (act.includes('shipped') || act.includes('delivered')) return 'text-green-650 bg-green-50 border-green-200';
    if (act.includes('cancel') || act.includes('refund')) return 'text-red-650 bg-red-50 border-red-200';
    if (act.includes('tracking') || act.includes('shipping')) return 'text-purple-650 bg-purple-50 border-purple-200';
    if (act.includes('packed') || act.includes('pack')) return 'text-indigo-650 bg-indigo-50 border-indigo-200';
    if (act.includes('picked') || act.includes('pick')) return 'text-yellow-655 bg-yellow-50 border-yellow-250';
    return 'text-luxury-600 bg-luxury-50 border-luxury-200';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold text-luxury-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold-650" />
          Fulfillment Audit Trail
        </h2>
        <p className="text-xs text-luxury-500 mt-0.5">
          Real-time operations log of picks, packages, and dispatch actions
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-luxury-400">
          <Clipboard className="w-9 h-9 opacity-40 mx-auto mb-1.5" />
          <p className="text-xs font-semibold">No operational logs recorded yet.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-luxury-100 pl-4 ml-2.5 space-y-4 my-2">
          {logs.map((log) => {
            const colorClass = getActionColor(log.action);
            return (
              <div key={log.id} className="relative group">
                {/* Timeline dot */}
                <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-luxury-400 group-hover:bg-gold-550 transition-colors" />

                <div className="bg-white rounded-xl border border-luxury-200 p-3.5 hover:shadow-sm transition-all hover:border-luxury-300">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${colorClass}`}>
                        {log.action?.split(':')[0]}
                      </span>
                      <span className="text-xs font-semibold text-luxury-900">
                        {log.action?.split(':').slice(1).join(':') || log.action}
                      </span>
                      {log.orderId && (
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-luxury-50 border border-luxury-200 text-luxury-500 rounded">
                          #{log.orderId.slice(-8).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-luxury-450">
                      <Clock className="w-3.5 h-3.5 text-luxury-350" />
                      <span>{formatLogDate(log.timestamp)}</span>
                    </div>
                  </div>

                  {log.note && (
                    <p className="text-xs text-luxury-500 mt-2 bg-luxury-50/50 p-2 border border-luxury-100 rounded-lg italic">
                      Note: {log.note}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-luxury-400">
                    <User className="w-3 h-3 text-luxury-300" />
                    <span>Actor: <strong>{log.adminName}</strong> ({log.adminId?.slice(0, 6)})</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
