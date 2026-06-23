import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Plus, Trash2, RotateCcw, Save, Calendar, Percent, Gift, Tag, Edit2 } from 'lucide-react';

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage', // percentage, flat, buy_x_get_y
    value: '',
    minCartValue: '',
    buyQty: '',
    getQty: '',
    startDate: '',
    endDate: '',
    enabled: true,
    maxUses: '100',
    currentUses: '0',
    description: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'offers'), (snapshot) => {
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setOffers(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading offers:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleEdit = (offer) => {
    setEditingId(offer.id);
    setFormData({
      code: offer.id,
      type: offer.type || 'percentage',
      value: offer.value || '',
      minCartValue: offer.minCartValue || '',
      buyQty: offer.buyQty || '',
      getQty: offer.getQty || '',
      startDate: offer.startDate || '',
      endDate: offer.endDate || '',
      enabled: offer.enabled ?? true,
      maxUses: offer.maxUses || 100,
      currentUses: offer.currentUses || 0,
      description: offer.description || ''
    });
  };

  const handleSoftDelete = async (offer) => {
    try {
      await setDoc(doc(db, 'offers', offer.id), {
        ...offer,
        archived: true,
        archivedAt: new Date().toISOString(),
        enabled: false
      });
      
      const logRef = collection(db, 'system_activity_logs');
      await addDoc(logRef, {
        timestamp: new Date().toISOString(),
        action: 'ARCHIVE_OFFER',
        details: `Archived/soft-deleted coupon code "${offer.id}"`,
        userEmail: 'Admin'
      });

      toast.success("Offer archived successfully");
    } catch (err) {
      console.error("Archiving offer failed:", err);
      toast.error("Failed to archive offer");
    }
  };

  const handleRestore = async (offer) => {
    try {
      await setDoc(doc(db, 'offers', offer.id), {
        ...offer,
        archived: false,
        archivedAt: null,
        enabled: true
      });

      const logRef = collection(db, 'system_activity_logs');
      await addDoc(logRef, {
        timestamp: new Date().toISOString(),
        action: 'RESTORE_OFFER',
        details: `Restored archived coupon code "${offer.id}"`,
        userEmail: 'Admin'
      });

      toast.success("Offer restored successfully");
    } catch (err) {
      console.error("Restoring offer failed:", err);
      toast.error("Failed to restore offer");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanCode = formData.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
      toast.error("Please enter a valid coupon code");
      return;
    }

    try {
      const payload = {
        type: formData.type,
        value: formData.type === 'buy_x_get_y' ? null : Number(formData.value),
        minCartValue: formData.minCartValue !== '' ? Number(formData.minCartValue) : 0,
        buyQty: formData.type === 'buy_x_get_y' ? Number(formData.buyQty) : null,
        getQty: formData.type === 'buy_x_get_y' ? Number(formData.getQty) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        enabled: formData.enabled,
        archived: false,
        maxUses: Number(formData.maxUses || 100),
        currentUses: Number(formData.currentUses || 0),
        description: formData.description || '',
        updatedAt: new Date().toISOString()
      };

      const logRef = collection(db, 'system_activity_logs');
      await addDoc(logRef, {
        timestamp: new Date().toISOString(),
        action: editingId ? 'UPDATE_OFFER' : 'CREATE_OFFER',
        details: `${editingId ? 'Updated' : 'Created'} coupon code "${cleanCode}" (${formData.type} discount)`,
        userEmail: 'Admin'
      });

      await setDoc(doc(db, 'offers', cleanCode), payload);

      if (editingId && editingId !== cleanCode) {
        await deleteDoc(doc(db, 'offers', editingId));
      }

      toast.success("Offer coupon saved successfully!");
      resetForm();
    } catch (err) {
      console.error("Save offer failed:", err);
      toast.error("Failed to save offer");
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      minCartValue: '',
      buyQty: '',
      getQty: '',
      startDate: '',
      endDate: '',
      enabled: true,
      maxUses: '100',
      currentUses: '0',
      description: ''
    });
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeOffers = offers.filter(o => !o.archived);
  const archivedOffers = offers.filter(o => o.archived);

  const isCouponActive = (offer) => {
    if (!offer.enabled) return false;
    if (offer.startDate && new Date(offer.startDate) > new Date()) return false;
    if (offer.endDate && new Date(offer.endDate) < new Date()) return false;
    if ((offer.currentUses || 0) >= (offer.maxUses || 100)) return false;
    return true;
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12 px-4">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-luxury-900">Offers & Coupons Engine</h1>
        <p className="text-sm text-luxury-500 mt-1">Manage discount coupon codes, flat percentage discounts, and Buy-X-Get-Y shopping rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Form Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="border-b border-luxury-150 pb-4">
              <h3 className="text-base font-bold text-luxury-900">
                {editingId ? 'Edit Discount Coupon' : 'Create Discount Coupon'}
              </h3>
              <p className="text-xs text-luxury-500 mt-1">
                Configure code rules, triggers, limits, scheduling, and descriptions.
              </p>
            </div>

            <div className="space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                  Coupon Code (Unique ID)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={editingId !== null}
                  placeholder="e.g. WEDDING25"
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500 font-mono tracking-wider"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                  Coupon Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Get 25% off on all wedding category products with minimum order value rules"
                  rows={2}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                  Discount Calculation Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="flat">Flat Value Discount (₹)</option>
                  <option value="buy_x_get_y">Buy X Get Y Free</option>
                </select>
              </div>

              {/* Values based on type */}
              {formData.type !== 'buy_x_get_y' ? (
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                    {formData.type === 'percentage' ? 'Percentage Off (%)' : 'Flat Off Value (₹)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === 'percentage' ? 'e.g. 15' : 'e.g. 250'}
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Buy (X)</label>
                    <input
                      type="number"
                      required
                      value={formData.buyQty}
                      onChange={(e) => setFormData({ ...formData, buyQty: e.target.value })}
                      placeholder="e.g. 2"
                      className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Get (Y)</label>
                    <input
                      type="number"
                      required
                      value={formData.getQty}
                      onChange={(e) => setFormData({ ...formData, getQty: e.target.value })}
                      placeholder="e.g. 1"
                      className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                </div>
              )}

              {/* Minimum Cart Value */}
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                  Min Cart Subtotal (₹)
                </label>
                <input
                  type="number"
                  value={formData.minCartValue}
                  onChange={(e) => setFormData({ ...formData, minCartValue: e.target.value })}
                  placeholder="e.g. 999 (0 for no limit)"
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>

              {/* Uses limits - side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                    Current Uses
                  </label>
                  <input
                    type="number"
                    disabled
                    value={formData.currentUses}
                    className="w-full input-field p-3 text-sm border rounded-lg bg-luxury-50/80 text-luxury-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="e.g. 100"
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  />
                </div>
              </div>

              {/* Start & End Dates */}
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                  Start Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">
                  Expiry Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  <span className="ml-3 text-xs font-bold text-luxury-700 uppercase tracking-wider">Coupon Enabled</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-luxury-100">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary py-2 px-4 text-xs uppercase font-bold tracking-wider"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn-primary py-2 px-6 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 flex-1 justify-center"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Coupon Lists */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Coupons List */}
          <div className="bg-white rounded-2xl border border-luxury-100 shadow-md overflow-hidden">
            <div className="p-4 border-b border-luxury-150 bg-luxury-50/20 flex justify-between items-center">
              <h3 className="text-sm font-bold text-luxury-900">Active Coupons</h3>
              <span className="text-xs bg-gold-50 text-gold-700 px-2.5 py-0.5 rounded-full font-bold border border-gold-200">
                {activeOffers.length} Active
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                    <th className="py-3 px-4">Coupon Code & Desc</th>
                    <th className="py-3 px-4">Rule & Value</th>
                    <th className="py-3 px-4">Uses Limit</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4">Min Subtotal</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury-100 text-sm">
                  {activeOffers.map((offer) => {
                    const active = isCouponActive(offer);
                    return (
                      <tr key={offer.id} className="hover:bg-luxury-50/30">
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-gold-700 tracking-wider">
                              {offer.id}
                            </span>
                            {active ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-green-50 text-green-700 border border-green-200">Active</span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">Inactive</span>
                            )}
                          </div>
                          <p className="text-xs text-luxury-500 leading-tight line-clamp-2">
                            {offer.description || <span className="italic text-luxury-300">No description provided</span>}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-luxury-900">
                          <div className="capitalize text-xs text-luxury-500 font-normal mb-0.5">
                            {offer.type.replace(/_/g, ' ')}
                          </div>
                          <div>
                            {offer.type === 'percentage' && `${offer.value}% OFF`}
                            {offer.type === 'flat' && `₹${offer.value} OFF`}
                            {offer.type === 'buy_x_get_y' && `Buy ${offer.buyQty} Get ${offer.getQty}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-luxury-800 text-xs">
                            {offer.currentUses || 0} / {offer.maxUses || 100}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-luxury-500 text-xs">
                          {offer.endDate ? (
                            <div>{new Date(offer.endDate).toLocaleString()}</div>
                          ) : (
                            <span className="text-luxury-400 italic">No Expiry</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-luxury-600 text-xs">
                          {offer.minCartValue > 0 ? `₹${offer.minCartValue.toLocaleString()}` : 'No minimum'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(offer)}
                              className="p-1.5 rounded-lg border border-luxury-200 text-luxury-600 hover:border-gold-500 hover:text-gold-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSoftDelete(offer)}
                              className="p-1.5 rounded-lg border border-luxury-200 text-luxury-400 hover:text-red-600 hover:border-red-200 transition-colors"
                              title="Archive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {activeOffers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-luxury-400">
                        No active coupons configured. Set details on the left to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Archived/Deleted Offers List */}
          {archivedOffers.length > 0 && (
            <div className="bg-white rounded-2xl border border-luxury-100 shadow-md overflow-hidden opacity-75">
              <div className="p-4 border-b border-luxury-150 bg-luxury-50/20">
                <h3 className="text-sm font-bold text-luxury-600">Archived Coupons</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-500 uppercase tracking-wider bg-luxury-50/50">
                      <th className="py-3 px-4">Coupon Code</th>
                      <th className="py-3 px-4">Type & Value</th>
                      <th className="py-3 px-4">Archived At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-100 text-sm text-luxury-500">
                    {archivedOffers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-luxury-50/30">
                        <td className="py-3.5 px-4 font-mono line-through font-bold">{offer.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="capitalize text-xs text-luxury-400 mb-0.5">{offer.type.replace(/_/g, ' ')}</div>
                          <div>
                            {offer.type === 'percentage' && `${offer.value}% OFF`}
                            {offer.type === 'flat' && `₹${offer.value} OFF`}
                            {offer.type === 'buy_x_get_y' && `Buy ${offer.buyQty} Get ${offer.getQty}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {offer.archivedAt ? new Date(offer.archivedAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleRestore(offer)}
                            className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 ml-auto"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
