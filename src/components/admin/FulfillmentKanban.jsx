/**
 * FulfillmentKanban.jsx — Professional Drag-and-Drop Kanban Board
 *
 * Columns: Processing, Ready to Pack, Packed, Ready to Ship, Shipped, Delayed
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateOrderStatus } from '../../services/orderTracking';
import { normalizeStatus, detectDelay, formatINR } from '../../services/orderStatus';
import {
  AlertTriangle, ArrowRight, ArrowLeft, Clock,
  User, CheckCircle2, ChevronRight, Play, Archive, Ship
} from 'lucide-react';
import { toast } from 'react-toastify';

const COLUMNS = [
  { id: 'processing', label: 'Processing', color: 'border-blue-200 bg-blue-50/20 text-blue-800' },
  { id: 'picked', label: 'Ready to Pack', color: 'border-yellow-200 bg-yellow-50/20 text-yellow-800' },
  { id: 'packed', label: 'Packed', color: 'border-indigo-200 bg-indigo-50/20 text-indigo-800' },
  { id: 'ready_to_ship', label: 'Ready to Ship', color: 'border-purple-200 bg-purple-50/20 text-purple-800' },
  { id: 'shipped', label: 'Shipped', color: 'border-green-200 bg-green-50/20 text-green-800' },
  { id: 'delayed', label: 'Delayed', color: 'border-red-200 bg-red-50/20 text-red-800' },
];

export default function FulfillmentKanban({ orders, onPackingSelect, onShippingSelect }) {
  const { user } = useAuth();
  const [draggedOrderId, setDraggedOrderId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Group orders by their visual column
  const groupedOrders = COLUMNS.reduce((acc, col) => {
    acc[col.id] = [];
    return acc;
  }, {});

  orders.forEach(order => {
    const status = normalizeStatus(order.status);
    const delay = detectDelay(order);

    if (['delivered', 'cancelled', 'refunded'].includes(status)) {
      return; // only show active fulfillment stages
    }

    if (delay.isDelayed) {
      groupedOrders['delayed'].push({ ...order, delay });
    } else if (status === 'processing') {
      groupedOrders['processing'].push({ ...order, delay });
    } else if (status === 'picked') {
      groupedOrders['picked'].push({ ...order, delay });
    } else if (status === 'packed') {
      // If packed but has no shipping tracking details, show in Packed, else show in Ready to Ship
      if (order.trackingNumber) {
        groupedOrders['ready_to_ship'].push({ ...order, delay });
      } else {
        groupedOrders['packed'].push({ ...order, delay });
      }
    } else if (status === 'shipped' || status === 'out of delivery') {
      groupedOrders['shipped'].push({ ...order, delay });
    }
  });

  const handleDragStart = (e, orderId) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.setData('text/plain', orderId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId;
    if (!orderId) return;

    setDraggedOrderId(null);
    await moveOrder(orderId, targetColumnId);
  };

  const moveOrder = async (orderId, targetColumnId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Determine actual target status from column ID
    let targetStatus = targetColumnId;
    if (targetColumnId === 'delayed') {
      // Cannot drag *to* delayed directly as it is a computed state
      toast.warning('Delayed column displays orders with SLA breaches automatically.');
      return;
    }
    if (targetColumnId === 'ready_to_ship') {
      targetStatus = 'packed';
    }

    // Intercept to show packing/shipping modals for logging details
    if (targetStatus === 'packed' && normalizeStatus(order.status) === 'picked') {
      onPackingSelect(order);
      return;
    }
    if (targetStatus === 'shipped' && normalizeStatus(order.status) === 'packed') {
      onShippingSelect(order);
      return;
    }

    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, targetStatus, user);
      toast.success(`Moved order #${orderId.slice(-8).toUpperCase()} to ${targetStatus}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none min-h-[600px] items-start">
      {COLUMNS.map(col => (
        <div
          key={col.id}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
          className={`flex-shrink-0 w-80 rounded-2xl border bg-luxury-50/50 p-4 transition-all duration-200 ${
            draggedOrderId ? 'border-dashed border-luxury-300' : 'border-luxury-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${col.color}`}>
              {col.label}
            </span>
            <span className="text-xs font-bold text-luxury-500 bg-white border border-luxury-200 px-2 py-0.5 rounded-lg shadow-sm">
              {groupedOrders[col.id].length}
            </span>
          </div>

          <div className="space-y-3 min-h-[450px]">
            {groupedOrders[col.id].length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-luxury-200 rounded-xl text-luxury-400">
                <Archive className="w-8 h-8 opacity-40 mb-1" />
                <span className="text-xs font-medium">Empty Column</span>
              </div>
            ) : (
              groupedOrders[col.id].map(order => {
                const isUpdating = updatingId === order.id;
                const isVip = order.priority === 'vip';
                const isUrgent = order.priority === 'urgent';
                const isExpress = order.priority === 'express';
                const isHV = Number(order.total || 0) >= 50000;

                return (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    className={`bg-white rounded-xl shadow-sm border p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all relative ${
                      isUpdating ? 'opacity-50 pointer-events-none' : ''
                    } ${
                      col.id === 'delayed' ? 'border-red-200' : 'border-luxury-100'
                    }`}
                  >
                    {isUpdating && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl z-10">
                        <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-luxury-900 font-mono">
                        #{order.id?.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-luxury-700">
                        {formatINR(order.total)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-luxury-800 mt-1.5 truncate">
                      {order.customerName || order.name || 'Anonymous'}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {isVip && <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold uppercase">VIP</span>}
                      {isUrgent && <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-bold uppercase">Urgent</span>}
                      {isExpress && <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold uppercase">Express</span>}
                      {isHV && <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold uppercase">High Value</span>}
                    </div>

                    {/* Items preview */}
                    <div className="mt-3 text-[10px] text-luxury-500 border-t border-luxury-50 pt-2 space-y-0.5">
                      {(order.items || []).slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-[150px]">{item.name}</span>
                          <span className="font-semibold">×{item.quantity}</span>
                        </div>
                      ))}
                      {(order.items || []).length > 2 && (
                        <p className="text-right text-[9px] italic text-gold-600">
                          +{order.items.length - 2} more items
                        </p>
                      )}
                    </div>

                    {/* ETA or Delay Display */}
                    {order.delay?.isDelayed ? (
                      <div className="mt-3 flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{order.delay.hours}h delayed</span>
                      </div>
                    ) : order.estimatedDelivery ? (
                      <div className="mt-3 flex items-center gap-1 text-[10px] text-luxury-500">
                        <Clock className="w-3 h-3 text-luxury-400" />
                        <span>ETA: {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    ) : null}

                    {/* Click-to-Move Controls (Great for accessibility & mobile) */}
                    <div className="mt-3 pt-2.5 border-t border-luxury-50 flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-luxury-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-luxury-350" /> {order.city || 'Domestic'}
                      </span>
                      <div className="flex gap-1">
                        {col.id !== 'processing' && col.id !== 'delayed' && (
                          <button
                            onClick={() => {
                              const idx = COLUMNS.findIndex(c => c.id === col.id);
                              if (idx > 0) moveOrder(order.id, COLUMNS[idx - 1].id);
                            }}
                            title="Move back"
                            className="p-1 rounded bg-luxury-100 hover:bg-luxury-200 text-luxury-600 transition-colors"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}
                        {col.id !== 'shipped' && col.id !== 'delayed' && (
                          <button
                            onClick={() => {
                              const idx = COLUMNS.findIndex(c => c.id === col.id);
                              if (idx >= 0 && idx < COLUMNS.length - 2) moveOrder(order.id, COLUMNS[idx + 1].id);
                            }}
                            title="Move forward"
                            className="p-1 rounded bg-gold-550 hover:bg-gold-600 text-white transition-colors flex items-center"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
