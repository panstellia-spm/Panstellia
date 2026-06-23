import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Settings, CreditCard, FileText, History, Save, RotateCcw, AlertTriangle, Plus, Trash2 } from 'lucide-react';

export default function AdminSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('payments');

  // Payments State
  const [payments, setPayments] = useState({
    cod: { enabled: true, minOrderValue: 0, maxOrderValue: 50000 },
    razorpay: { enabled: true, minOrderValue: 0 },
    upi: { enabled: true, minOrderValue: 0 },
    partial: { enabled: false, minOrderValue: 10000, partialPercentage: 30 }
  });

  // CMS State
  const [cms, setCms] = useState({
    contact: { email: '', phone: '', address: '', instagram: '', facebook: '' },
    about: { title: '', story: '', mission: '' },
    policies: { shipping: '', privacy: '', terms: '' },
    faqs: []
  });

  // History State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const paySnap = await getDoc(doc(db, 'system_settings', 'payments'));
        if (paySnap.exists()) setPayments(paySnap.data());

        const cmsSnap = await getDoc(doc(db, 'system_settings', 'cms'));
        if (cmsSnap.exists()) setCms(cmsSnap.data());

        await loadLogs();
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error('Error loading settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
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
      snap.forEach(d => fetchedLogs.push({ id: d.id, ...d.data() }));
      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to load settings history:', err);
    }
  };

  const handleSavePayments = async () => {
    try {
      const ref = doc(db, 'system_settings', 'payments');
      await setDoc(ref, payments);

      // Add to history
      await addDoc(collection(db, 'settings_history'), {
        module: 'payments',
        data: payments,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: 'Updated payment settings and limits'
      });

      toast.success('Payment settings updated successfully');
      loadLogs();
    } catch (err) {
      console.error('Failed to save payments:', err);
      toast.error('Error saving payment settings');
    }
  };

  const handleSaveCms = async () => {
    try {
      const ref = doc(db, 'system_settings', 'cms');
      // Merge with existing properties like navigation list so they don't get lost
      const existingSnap = await getDoc(ref);
      const existingData = existingSnap.exists() ? existingSnap.data() : {};
      const updatedCms = {
        ...existingData,
        ...cms
      };
      await setDoc(ref, updatedCms);

      // Add to history
      await addDoc(collection(db, 'settings_history'), {
        module: 'cms',
        data: updatedCms,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: 'Updated CMS text pages, policies and FAQs'
      });

      toast.success('CMS content settings updated successfully');
      loadLogs();
    } catch (err) {
      console.error('Failed to save CMS settings:', err);
      toast.error('Error saving CMS settings');
    }
  };

  const handleRollback = async (log) => {
    try {
      const { module, data } = log;
      const ref = doc(db, 'system_settings', module);
      await setDoc(ref, data);

      if (module === 'payments') {
        setPayments(data);
      } else {
        setCms(data);
      }

      // Add rollback record to history
      await addDoc(collection(db, 'settings_history'), {
        module,
        data,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: `Rolled back ${module} to version from ${new Date(log.changedAt).toLocaleString()}`
      });

      toast.success(`Rolled back ${module} settings successfully!`);
      loadLogs();
    } catch (err) {
      console.error('Rollback failed:', err);
      toast.error('Failed to perform rollback');
    }
  };

  const handleFaqChange = (index, field, value) => {
    const updatedFaqs = [...cms.faqs];
    updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
    setCms({ ...cms, faqs: updatedFaqs });
  };

  const addFaq = () => {
    setCms({
      ...cms,
      faqs: [...(cms.faqs || []), { question: '', answer: '' }]
    });
  };

  const removeFaq = (index) => {
    const updatedFaqs = (cms.faqs || []).filter((_, i) => i !== index);
    setCms({ ...cms, faqs: updatedFaqs });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-luxury-900">CMS & Payment Settings</h1>
          <p className="text-sm text-luxury-500 mt-1">Configure global payment methods, transaction limits, policy terms, and FAQ data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury-200 mb-8 bg-white p-1 rounded-xl shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'payments'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payments
        </button>
        <button
          onClick={() => setActiveTab('cms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'cms'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          CMS Content
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'logs'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <History className="w-4 h-4" />
          Rollback History
        </button>
      </div>

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* COD */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-luxury-900">Cash on Delivery (COD)</h3>
                <p className="text-xs text-luxury-500 mt-1">Enable customers to pay with cash upon order arrival</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={payments.cod.enabled}
                  onChange={(e) => setPayments({
                    ...payments,
                    cod: { ...payments.cod, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Minimum Order Value (₹)</label>
                <input
                  type="number"
                  value={payments.cod.minOrderValue}
                  onChange={(e) => setPayments({
                    ...payments,
                    cod: { ...payments.cod, minOrderValue: Number(e.target.value) }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Maximum Order Value (₹)</label>
                <input
                  type="number"
                  value={payments.cod.maxOrderValue}
                  onChange={(e) => setPayments({
                    ...payments,
                    cod: { ...payments.cod, maxOrderValue: Number(e.target.value) }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          {/* Razorpay */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-luxury-900">Razorpay Card / Netbanking</h3>
                <p className="text-xs text-luxury-500 mt-1">Accept online debit/credit cards and banking payments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={payments.razorpay.enabled}
                  onChange={(e) => setPayments({
                    ...payments,
                    razorpay: { ...payments.razorpay, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Minimum Order Value (₹)</label>
              <input
                type="number"
                value={payments.razorpay.minOrderValue}
                onChange={(e) => setPayments({
                  ...payments,
                  razorpay: { ...payments.razorpay, minOrderValue: Number(e.target.value) }
                })}
                className="w-full max-w-md input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
              />
            </div>
          </div>

          {/* UPI */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-luxury-900">UPI Instant Pay</h3>
                <p className="text-xs text-luxury-500 mt-1">Accept GooglePay, PhonePe, and BHIM payments online</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={payments.upi.enabled}
                  onChange={(e) => setPayments({
                    ...payments,
                    upi: { ...payments.upi, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Minimum Order Value (₹)</label>
              <input
                type="number"
                value={payments.upi.minOrderValue}
                onChange={(e) => setPayments({
                  ...payments,
                  upi: { ...payments.upi, minOrderValue: Number(e.target.value) }
                })}
                className="w-full max-w-md input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Partial Payments */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-luxury-900">Partial Payments (Deposit + Delivery)</h3>
                <p className="text-xs text-luxury-500 mt-1">Allow customers to pay a deposit now, and settle the remaining amount on delivery</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={payments.partial.enabled}
                  onChange={(e) => setPayments({
                    ...payments,
                    partial: { ...payments.partial, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Minimum Order for Eligibility (₹)</label>
                <input
                  type="number"
                  value={payments.partial.minOrderValue}
                  onChange={(e) => setPayments({
                    ...payments,
                    partial: { ...payments.partial, minOrderValue: Number(e.target.value) }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Deposit Percentage (%)</label>
                <input
                  type="number"
                  value={payments.partial.partialPercentage}
                  onChange={(e) => setPayments({
                    ...payments,
                    partial: { ...payments.partial, partialPercentage: Number(e.target.value) }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSavePayments}
              className="btn-primary py-3 px-8 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Payment Settings
            </button>
          </div>
        </div>
      )}

      {/* CMS Tab */}
      {activeTab === 'cms' && (
        <div className="space-y-6">
          {/* Contact Details */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <h3 className="text-base font-bold text-luxury-900 mb-6">Contact details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Support Email</label>
                <input
                  type="email"
                  value={cms.contact?.email || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    contact: { ...cms.contact, email: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Support Phone Lines</label>
                <input
                  type="text"
                  value={cms.contact?.phone || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    contact: { ...cms.contact, phone: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Office Address</label>
                <input
                  type="text"
                  value={cms.contact?.address || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    contact: { ...cms.contact, address: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Instagram Link</label>
                <input
                  type="text"
                  value={cms.contact?.instagram || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    contact: { ...cms.contact, instagram: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Facebook Link</label>
                <input
                  type="text"
                  value={cms.contact?.facebook || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    contact: { ...cms.contact, facebook: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <h3 className="text-base font-bold text-luxury-900 mb-6">About Brand Story</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">About Page Title</label>
                <input
                  type="text"
                  value={cms.about?.title || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    about: { ...cms.about, title: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Brand Story Text</label>
                <textarea
                  rows={4}
                  value={cms.about?.story || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    about: { ...cms.about, story: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Mission Statement</label>
                <textarea
                  rows={2}
                  value={cms.about?.mission || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    about: { ...cms.about, mission: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          {/* Policies Section */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <h3 className="text-base font-bold text-luxury-900 mb-6">Policy agreements</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Shipping Policy terms</label>
                <textarea
                  rows={4}
                  value={cms.policies?.shipping || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    policies: { ...cms.policies, shipping: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Privacy Terms string</label>
                <textarea
                  rows={4}
                  value={cms.policies?.privacy || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    policies: { ...cms.policies, privacy: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Terms of Service agreement</label>
                <textarea
                  rows={4}
                  value={cms.policies?.terms || ''}
                  onChange={(e) => setCms({
                    ...cms,
                    policies: { ...cms.policies, terms: e.target.value }
                  })}
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          {/* FAQs List */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-luxury-900">Frequently Asked Questions (FAQs)</h3>
              <button
                type="button"
                onClick={addFaq}
                className="btn-secondary py-1.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add FAQ
              </button>
            </div>

            <div className="space-y-4">
              {(cms.faqs || []).map((faq, index) => (
                <div key={index} className="border border-luxury-200 rounded-xl p-4 relative bg-luxury-50/50">
                  <button
                    type="button"
                    onClick={() => removeFaq(index)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-luxury-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-3 max-w-[90%]">
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Question</label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                        className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                        placeholder="e.g. How long does shipping take?"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Answer</label>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                        className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                        placeholder="e.g. Orders are shipped within 24-48 hours."
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(cms.faqs || []).length === 0 && (
                <p className="text-xs text-luxury-500 text-center py-6">No FAQs configured. Click Add FAQ to create one.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveCms}
              className="btn-primary py-3 px-8 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save CMS Content
            </button>
          </div>
        </div>
      )}

      {/* Rollback History Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
          <h3 className="text-base font-bold text-luxury-900 mb-4">Version Snapshot History</h3>
          <p className="text-xs text-luxury-500 mb-6">Select a previous configurations snapshot to restore values. This will overwrite active website displays immediately.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-100 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-luxury-50/30">
                    <td className="py-3.5 px-4 font-medium text-luxury-800">
                      {new Date(log.changedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                        log.module === 'payments' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-luxury-600">{log.changedBy}</td>
                    <td className="py-3.5 px-4 text-luxury-500 max-w-xs truncate">{log.summary}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRollback(log)}
                        className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 ml-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Rollback
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-luxury-400">
                      No settings logs recorded yet. Saving edits will create snapshots.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
