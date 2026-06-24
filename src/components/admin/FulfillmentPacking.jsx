/**
 * FulfillmentPacking.jsx — Order Packing Control Center
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateOrderStatus } from '../../services/orderTracking';
import { db } from '../../services/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { formatINR } from '../../services/orderStatus';
import {
  Box, User, Clock, CheckCircle2, ChevronRight, Gift, Archive,
  ShieldAlert, Play, Hourglass, HelpCircle, PackageOpen
} from 'lucide-react';
import { toast } from 'react-toastify';

const PACKAGING_OPTIONS = [
  { id: 'standard_box', label: 'Standard Luxury Box', weight: '250g', cost: '₹0' },
  { id: 'velvet_pouch', label: 'Classic Velvet Pouch', weight: '100g', cost: '₹0' },
  { id: 'leather_case', label: 'Premium Leather Case', weight: '400g', cost: '₹250' },
  { id: 'gift_wrapping', label: 'Premium Gold Ribbon Gift Wrapping', weight: '300g', cost: '₹150' },
];

export default function FulfillmentPacking({ orders, selectedOrderFromKanban, onClearSelection }) {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [packaging, setPackaging] = useState('standard_box');
  const [isGift, setIsGift] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Time tracker state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  // Filter for orders in 'picked' (Ready to Pack) status
  const packingQueue = orders.filter(o => o.status === 'picked');

  useEffect(() => {
    if (selectedOrderFromKanban) {
      handleSelectOrder(selectedOrderFromKanban);
    }
  }, [selectedOrderFromKanban]);

  // Timer controls
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setPackaging('standard_box');
    setIsGift(false);
    setGiftNote('');
    setTimerSeconds(0);
    setTimerActive(true); // start timing automatically on order selection
  };

  const handleCancel = () => {
    setSelectedOrder(null);
    setTimerActive(false);
    if (onClearSelection) onClearSelection();
  };

  const handlePackOrder = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    setTimerActive(false);

    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      const adminName = user?.displayName || user?.email?.split('@')[0] || 'Packer';

      const packingDetails = {
        packedBy: adminName,
        packedAt: new Date().toISOString(),
        packagingType: PACKAGING_OPTIONS.find(o => o.id === packaging)?.label || 'Standard',
        isGiftPackaging: isGift,
        giftNote: isGift ? giftNote : '',
        packingTimeSeconds: timerSeconds,
      };

      // 1. Write packingDetails to order
      await updateDoc(orderRef, {
        packingDetails,
        statusHistory: arrayUnion({
          status: 'packed_details_added',
          timestamp: new Date().toISOString(),
          adminId: user?.uid || 'unknown',
          adminName,
          note: `Packed in ${packingDetails.packagingType}${isGift ? ' with gift note' : ''} (Duration: ${Math.floor(timerSeconds / 60)}m ${timerSeconds % 60}s)`,
        })
      });

      // 2. Advance status to packed
      await updateOrderStatus(selectedOrder.id, 'packed', user, `Order packed securely in ${packingDetails.packagingType}`);
      toast.success(`Order #${selectedOrder.id.slice(-8).toUpperCase()} packed successfully!`);
      setSelectedOrder(null);
      if (onClearSelection) onClearSelection();
    } catch (err) {
      toast.error(err.message || 'Failed to complete packing');
      setTimerActive(true); // resume timer if failed
    } finally {
      setUpdating(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left panel — Packing Queue */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-luxury-900 flex items-center gap-2">
            <Box className="w-5 h-5 text-gold-600" />
            Packing Queue
          </h2>
          <p className="text-xs text-luxury-500 mt-0.5">
            {packingQueue.length} orders ready to be packaged
          </p>
        </div>

        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {packingQueue.length === 0 ? (
            <div className="py-16 text-center text-luxury-400">
              <Archive className="w-8 h-8 opacity-45 mx-auto mb-1.5" />
              <p className="text-xs font-semibold">Queue is empty</p>
              <p className="text-[10px] text-luxury-400 mt-0.5">Awaiting picking completion</p>
            </div>
          ) : (
            packingQueue.map(order => (
              <button
                key={order.id}
                onClick={() => handleSelectOrder(order)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  selectedOrder?.id === order.id
                    ? 'border-gold-500 bg-gold-50/20 shadow-sm'
                    : 'border-luxury-200 bg-white hover:border-luxury-300'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-luxury-900 font-mono">
                    #{order.id?.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-[11px] font-semibold text-luxury-600 truncate mt-0.5">
                    {order.customerName || order.name}
                  </p>
                  <p className="text-[10px] text-luxury-400 mt-1">
                    {(order.items || []).length} items
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-luxury-400 ${selectedOrder?.id === order.id ? 'text-gold-600' : ''}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — Packing Station Workspace */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5">
        {!selectedOrder ? (
          <div className="h-full flex flex-col items-center justify-center py-24 text-center text-luxury-400">
            <PackageOpen className="w-14 h-14 opacity-30 mb-4" />
            <h3 className="text-base font-bold text-luxury-800">Select an order to start packing</h3>
            <p className="text-xs text-luxury-450 mt-1 max-w-sm mx-auto">
              Select an order from the queue or click pack on the Kanban board to initialize packing time tracking and details entry.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Workspace header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-luxury-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-luxury-900 font-mono">
                  Packing Station Workspace — #{selectedOrder.id?.slice(-8).toUpperCase()}
                </h3>
                <p className="text-xs text-luxury-500 mt-0.5">
                  Packer: {user?.displayName || user?.email}
                </p>
              </div>

              {/* Time tracker widget */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-700">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold font-mono">{formatTimer(timerSeconds)}</span>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h4 className="text-xs font-bold text-luxury-500 uppercase tracking-widest mb-3">
                Verify Order Contents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-luxury-200 bg-luxury-50/30">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-luxury-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-luxury-400 mt-0.5 font-mono">ID: {item.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className="text-xs font-bold text-luxury-900 bg-white border border-luxury-200 px-2 py-1 rounded-lg">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Packaging options */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-luxury-500 uppercase tracking-widest">
                Select Packaging Type
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PACKAGING_OPTIONS.map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      packaging === opt.id
                        ? 'border-gold-500 bg-gold-50/10 shadow-sm'
                        : 'border-luxury-200 hover:bg-luxury-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="packaging"
                      value={opt.id}
                      checked={packaging === opt.id}
                      onChange={() => setPackaging(opt.id)}
                      className="mt-1 accent-gold-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-luxury-900">{opt.label}</p>
                      <div className="flex gap-2 mt-1 text-[10px] text-luxury-500">
                        <span>Weight: {opt.weight}</span>
                        <span>•</span>
                        <span className="font-semibold text-gold-600">{opt.cost}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Gift wrap option */}
            <div className="p-4 rounded-xl border border-luxury-200 bg-luxury-50/20 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="rounded text-gold-600 focus:ring-gold-500 w-4 h-4 accent-gold-600"
                />
                <span className="text-xs font-bold text-luxury-900 flex items-center gap-1.5 select-none">
                  <Gift className="w-4 h-4 text-gold-600" />
                  This order requires Gift Wrapping
                </span>
              </label>

              {isGift && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-luxury-400 uppercase tracking-wider">
                    Gift Card Message
                  </span>
                  <textarea
                    rows={2}
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    placeholder="Write custom gift message details here..."
                    className="w-full text-xs p-3 rounded-lg border border-luxury-200 focus:outline-none focus:border-gold-500 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-luxury-100 pt-5">
              <button
                onClick={handleCancel}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl border border-luxury-200 text-xs font-semibold text-luxury-700 hover:bg-luxury-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePackOrder}
                disabled={updating}
                className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                {updating ? (
                  <Hourglass className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Mark Packed & Ready
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
