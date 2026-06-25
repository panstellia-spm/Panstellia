import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Truck, DollarSign, Save, RotateCcw, History, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminShippingFee() {
  const { user } = useAuth();
  
  // Component states
  const [shippingSettings, setShippingSettings] = useState({
    shippingEnabled: true,
    freeShippingEnabled: true,
    shippingCharge: 99,
    freeShippingThreshold: 999
  });
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current settings & log history
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'shipping_settings', 'config'));
        if (snap.exists()) {
          const data = snap.data();
          setShippingSettings({
            shippingEnabled: data.shippingEnabled ?? true,
            freeShippingEnabled: data.freeShippingEnabled ?? true,
            shippingCharge: Number(data.shippingCharge ?? 99),
            freeShippingThreshold: Number(data.freeShippingThreshold ?? 999)
          });
        }
        await loadLogs();
      } catch (err) {
        console.error('Failed to load shipping settings:', err);
        toast.error('Error loading shipping settings');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadLogs = async () => {
    try {
      const q = query(
        collection(db, 'settings_history'),
        orderBy('changedAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const fetchedLogs = [];
      snap.forEach(d => {
        const item = d.data();
        // Only show history related to shipping
        if (item.module === 'shipping') {
          fetchedLogs.push({ id: d.id, ...item });
        }
      });
      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to load settings history:', err);
    }
  };

  const handleSave = async () => {
    // Validations
    if (shippingSettings.shippingCharge < 0) {
      toast.error('Shipping charge must be greater than or equal to 0');
      return;
    }
    if (shippingSettings.freeShippingThreshold < 0) {
      toast.error('Free shipping threshold must be greater than or equal to 0');
      return;
    }

    setSaving(true);
    try {
      const configRef = doc(db, 'shipping_settings', 'config');
      const updatedData = {
        ...shippingSettings,
        updatedBy: user?.email || 'Admin',
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(configRef, updatedData);

      // Add to history
      await addDoc(collection(db, 'settings_history'), {
        module: 'shipping',
        data: shippingSettings,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: `Updated settings: Enabled=${shippingSettings.shippingEnabled}, FreeEnabled=${shippingSettings.freeShippingEnabled}, Charge=₹${shippingSettings.shippingCharge}, Threshold=₹${shippingSettings.freeShippingThreshold}`
      });

      toast.success('Shipping settings updated successfully!');
      await loadLogs();
    } catch (err) {
      console.error('Failed to save shipping settings:', err);
      toast.error('Error saving shipping settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (log) => {
    setSaving(true);
    try {
      const { data } = log;
      const configRef = doc(db, 'shipping_settings', 'config');
      const rollbackData = {
        shippingEnabled: data.shippingEnabled ?? true,
        freeShippingEnabled: data.freeShippingEnabled ?? true,
        shippingCharge: Number(data.shippingCharge ?? 99),
        freeShippingThreshold: Number(data.freeShippingThreshold ?? 999),
        updatedBy: user?.email || 'Admin',
        updatedAt: new Date().toISOString()
      };

      await setDoc(configRef, rollbackData);
      setShippingSettings({
        shippingEnabled: rollbackData.shippingEnabled,
        freeShippingEnabled: rollbackData.freeShippingEnabled,
        shippingCharge: rollbackData.shippingCharge,
        freeShippingThreshold: rollbackData.freeShippingThreshold
      });

      // Add rollback action to history logs
      await addDoc(collection(db, 'settings_history'), {
        module: 'shipping',
        data: {
          shippingEnabled: rollbackData.shippingEnabled,
          freeShippingEnabled: rollbackData.freeShippingEnabled,
          shippingCharge: rollbackData.shippingCharge,
          freeShippingThreshold: rollbackData.freeShippingThreshold
        },
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: `Rolled back shipping settings to version from ${new Date(log.changedAt).toLocaleString()}`
      });

      toast.success('Successfully rolled back shipping settings!');
      await loadLogs();
    } catch (err) {
      console.error('Rollback failed:', err);
      toast.error('Failed to perform rollback');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-luxury-900 flex items-center gap-2">
          <Truck className="w-8 h-8 text-gold-600" />
          Shipping Fee Management
        </h1>
        <p className="text-sm text-luxury-500 mt-1">
          Configure standard shipping fees, free shipping thresholds, and toggle constraints for storefront cart calculations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Configuration Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Toggles Card */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md space-y-6">
            <h3 className="text-base font-bold text-luxury-900 border-b border-luxury-100 pb-3">Toggles & Status</h3>
            
            {/* Toggle 1: Enable/Disable Shipping Charges */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-luxury-900">Enable Shipping Charges</p>
                <p className="text-xs text-luxury-500 mt-0.5">
                  If disabled, shipping will be free for all orders on the website.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingSettings.shippingEnabled}
                  onChange={(e) => setShippingSettings({
                    ...shippingSettings,
                    shippingEnabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            {/* Toggle 2: Enable/Disable Free Shipping Threshold */}
            <div className="flex items-center justify-between pt-4 border-t border-luxury-50">
              <div>
                <p className="text-sm font-bold text-luxury-900">Enable Free Shipping Threshold</p>
                <p className="text-xs text-luxury-500 mt-0.5">
                  If disabled, standard shipping charge will always apply regardless of total order amount.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingSettings.freeShippingEnabled}
                  disabled={!shippingSettings.shippingEnabled}
                  onChange={(e) => setShippingSettings({
                    ...shippingSettings,
                    freeShippingEnabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  shippingSettings.shippingEnabled 
                    ? 'bg-luxury-200 peer-checked:bg-gold-500 cursor-pointer' 
                    : 'bg-luxury-100 opacity-50 cursor-not-allowed'
                }`}></div>
              </label>
            </div>
          </div>

          {/* Charges inputs card */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md space-y-6">
            <h3 className="text-base font-bold text-luxury-900 border-b border-luxury-100 pb-3">Shipping Values</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Field 1: Standard Shipping Charge */}
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-luxury-400" />
                  Standard Shipping Charge (₹)
                </label>
                <input
                  type="number"
                  disabled={!shippingSettings.shippingEnabled}
                  value={shippingSettings.shippingCharge}
                  onChange={(e) => setShippingSettings({
                    ...shippingSettings,
                    shippingCharge: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500 disabled:opacity-50 disabled:bg-luxury-50"
                  min="0"
                />
                <p className="text-[11px] text-luxury-400 mt-1">Flat charge added to orders below threshold.</p>
              </div>

              {/* Field 2: Free Shipping Threshold */}
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-luxury-400" />
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  disabled={!shippingSettings.shippingEnabled || !shippingSettings.freeShippingEnabled}
                  value={shippingSettings.freeShippingThreshold}
                  onChange={(e) => setShippingSettings({
                    ...shippingSettings,
                    freeShippingThreshold: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500 disabled:opacity-50 disabled:bg-luxury-50"
                  min="0"
                />
                <p className="text-[11px] text-luxury-400 mt-1">Orders at or above this value get free shipping.</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-3 px-8 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Shipping Rules
            </button>
          </div>
        </div>

        {/* Dynamic Business Cases Checker Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-luxury-900 text-gold-100 rounded-2xl p-6 shadow-md border border-luxury-800">
            <h3 className="text-sm font-serif font-bold uppercase tracking-wider mb-4 border-b border-luxury-800 pb-2">Rule Preview</h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-luxury-400 block mb-0.5">Status:</span>
                <span className="font-bold">
                  {shippingSettings.shippingEnabled ? 'Active Shipping Rules' : 'Free Shipping for All (Disabled)'}
                </span>
              </div>

              {shippingSettings.shippingEnabled && (
                <>
                  <div>
                    <span className="text-luxury-400 block mb-0.5">Rules:</span>
                    <p className="leading-relaxed">
                      If cart value is under <span className="text-white font-bold">₹{shippingSettings.freeShippingThreshold}</span>, standard fee of <span className="text-white font-bold">₹{shippingSettings.shippingCharge}</span> applies.
                    </p>
                    {shippingSettings.freeShippingEnabled && (
                      <p className="leading-relaxed mt-1 text-gold-500 font-medium">
                        Free shipping is unlocked at ₹{shippingSettings.freeShippingThreshold}.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-luxury-800">
                <span className="text-luxury-400 block mb-2 font-bold uppercase tracking-widest text-[10px]">Active Cases Preview:</span>
                <ul className="space-y-2 leading-relaxed">
                  <li className="flex justify-between border-b border-luxury-800/40 pb-1">
                    <span>Cart ₹250</span>
                    <span className="font-bold">
                      {shippingSettings.shippingEnabled ? `+ ₹${shippingSettings.shippingCharge}` : 'Free'}
                    </span>
                  </li>
                  <li className="flex justify-between border-b border-luxury-800/40 pb-1">
                    <span>Cart ₹{shippingSettings.freeShippingThreshold}</span>
                    <span className="font-bold">
                      {shippingSettings.shippingEnabled && !shippingSettings.freeShippingEnabled ? `+ ₹${shippingSettings.shippingCharge}` : 'Free'}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Cart ₹{shippingSettings.freeShippingThreshold + 500}</span>
                    <span className="font-bold">
                      {shippingSettings.shippingEnabled && !shippingSettings.freeShippingEnabled ? `+ ₹${shippingSettings.shippingCharge}` : 'Free'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Log Section */}
      <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gold-600" />
          <h3 className="text-base font-bold text-luxury-900">Shipping Change History</h3>
        </div>
        <p className="text-xs text-luxury-500 mb-6">
          Review shipping settings history and rollback configurations instantly.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Changed By</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-100 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-luxury-50/30">
                  <td className="py-3.5 px-4 font-mono text-xs text-luxury-800">
                    {new Date(log.changedAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-luxury-600">{log.changedBy}</td>
                  <td className="py-3.5 px-4 text-luxury-500 max-w-sm truncate">{log.summary}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRollback(log)}
                      disabled={saving}
                      className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 ml-auto disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Rollback
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-luxury-400">
                    No change records found. Saving updates will create new log items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
