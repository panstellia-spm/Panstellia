/**
 * FulfillmentPicking.jsx — Order Picking Queue Management System
 */

import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateOrderStatus } from '../../services/orderTracking';
import { formatINR } from '../../services/orderStatus';
import {
  Hand, Filter, CheckCircle2, ChevronRight, Printer, CheckSquare,
  Square, Calendar, ArrowUpDown, RefreshCw, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function FulfillmentPicking({ orders }) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState('age'); // age, priority, value
  const [checkedItems, setCheckedItems] = useState({}); // orderId -> itemIndex -> boolean
  const [updatingId, setUpdatingId] = useState(null);

  // Filter for orders in 'processing' status
  const pickingQueue = useMemo(() => {
    const active = orders.filter(o => o.status === 'processing');

    return [...active].sort((a, b) => {
      if (sortBy === 'value') {
        return Number(b.total || 0) - Number(a.total || 0);
      }
      if (sortBy === 'priority') {
        const priorityScore = { urgent: 4, vip: 3, express: 2, high: 1, normal: 0 };
        const scoreA = priorityScore[a.priority] || 0;
        const scoreB = priorityScore[b.priority] || 0;
        return scoreB - scoreA;
      }
      // default: age (oldest first)
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [orders, sortBy]);

  const handleItemToggle = (orderId, idx) => {
    setCheckedItems(prev => {
      const orderChecks = prev[orderId] || {};
      const newChecks = { ...orderChecks, [idx]: !orderChecks[idx] };
      return { ...prev, [orderId]: newChecks };
    });
  };

  const isOrderFullyPicked = (order) => {
    const orderChecks = checkedItems[order.id] || {};
    return (order.items || []).every((_, idx) => orderChecks[idx]);
  };

  const handlePickOrder = async (orderId) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, 'picked', user, 'Picked and moved to Packing queue');
      toast.success(`Order #${orderId.slice(-8).toUpperCase()} picked successfully.`);
      // Clean up checked items
      setCheckedItems(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrintPickSheet = (order) => {
    const printWindow = window.open('', '_blank');
    const itemsHtml = order.items.map((item, idx) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">[  ]</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong></td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-family: monospace;">${item.id?.slice(0,8).toUpperCase()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; text-align: center;">${item.quantity}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Picking Sheet - #${order.id?.slice(-8).toUpperCase()}</title>
          <style>
            body { font-family: 'Outfit', sans-serif; color: #1e293b; padding: 40px; }
            h1 { font-family: serif; font-size: 24px; color: #b8860b; border-bottom: 2px solid #b8860b; padding-bottom: 10px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 12px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>PANSTELLIA — WAREHOUSE PICKING LIST</h1>
          <div class="meta">
            <div>
              <p><strong>Order Reference:</strong> #${order.id?.slice(-8).toUpperCase()}</p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
              <p><strong>Customer Name:</strong> ${order.customerName || order.name || 'N/A'}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Priority Tag:</strong> ${(order.priority || 'Normal').toUpperCase()}</p>
              <p><strong>Fulfillment Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
              <p><strong>Destination:</strong> ${order.city || 'Domestic'}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Picked</th>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: left; width: 150px;">SKU</th>
                <th style="width: 100px;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="footer">
            <p>Panstellia Luxury Jewelry Warehouse operations. Handled by: ${user?.displayName || user?.email}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-6">
      {/* Pick queue filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-luxury-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-luxury-900 flex items-center gap-2">
            <Hand className="w-5 h-5 text-gold-600 animate-pulse" />
            Order Picking Queue
          </h2>
          <p className="text-xs text-luxury-500 mt-0.5">
            {pickingQueue.length} orders awaiting warehouse picking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-luxury-500 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort queue:
          </span>
          <div className="flex bg-luxury-50 border border-luxury-200 rounded-xl p-0.5">
            {[
              { id: 'age', label: 'Oldest First' },
              { id: 'priority', label: 'Priority' },
              { id: 'value', label: 'Value' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSortBy(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sortBy === tab.id
                    ? 'bg-white text-luxury-900 shadow-sm border border-luxury-200/50'
                    : 'text-luxury-500 hover:text-luxury-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pickingQueue.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <p className="font-bold text-luxury-900 text-lg">Picking is fully caught up!</p>
          <p className="text-sm text-luxury-400 mt-1.5">No orders awaiting picking at this time</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pickingQueue.map((order, orderIdx) => {
            const isFullyChecked = isOrderFullyPicked(order);
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className={`border rounded-2xl overflow-hidden transition-all ${
                  isFullyChecked ? 'border-emerald-200 bg-emerald-50/10' : 'border-luxury-200 hover:border-luxury-300'
                }`}
              >
                {/* Order header banner */}
                <div className="bg-luxury-50/70 px-4 py-3 border-b border-luxury-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-luxury-500 font-mono">
                      Queue #{orderIdx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-luxury-900 font-mono">
                      #{order.id?.slice(-8).toUpperCase()}
                    </h3>
                    {order.priority && order.priority !== 'normal' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        order.priority === 'urgent'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : order.priority === 'vip'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {order.priority}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-luxury-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-luxury-400" />
                      {new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{order.customerName || order.name}</span>
                    <span className="font-bold text-luxury-900">{formatINR(order.total)}</span>
                  </div>
                </div>

                {/* Items Picking Grid */}
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 w-full space-y-2.5">
                    {(order.items || []).map((item, idx) => {
                      const isItemChecked = checkedItems[order.id]?.[idx] || false;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleItemToggle(order.id, idx)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            isItemChecked
                              ? 'bg-emerald-50/30 border-emerald-200 text-luxury-700'
                              : 'bg-white border-luxury-200 text-luxury-800 hover:bg-luxury-50/50'
                          }`}
                        >
                          <button className="flex-shrink-0 text-luxury-400 hover:text-emerald-600">
                            {isItemChecked ? (
                              <CheckSquare className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Square className="w-5 h-5 text-luxury-300" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <p className="text-[10px] text-luxury-450 font-mono mt-0.5">
                              ID: {item.id?.toUpperCase() || 'N/A'}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-luxury-400">Qty:</span>
                            <span className="text-sm font-bold text-luxury-900 ml-1.5">{item.quantity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions column */}
                  <div className="flex md:flex-col gap-2 w-full md:w-auto flex-shrink-0">
                    <button
                      onClick={() => handlePrintPickSheet(order)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-luxury-200 text-xs font-semibold text-luxury-700 bg-white hover:bg-luxury-50 transition-colors flex-1 md:flex-initial"
                    >
                      <Printer className="w-4 h-4" /> Print Sheet
                    </button>
                    <button
                      onClick={() => handlePickOrder(order.id)}
                      disabled={!isFullyChecked || isUpdating}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex-1 md:flex-initial ${
                        isFullyChecked
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md'
                          : 'bg-luxury-200 text-luxury-400 cursor-not-allowed'
                      }`}
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Complete Pick
                    </button>
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
