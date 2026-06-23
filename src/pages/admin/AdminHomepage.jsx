import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Layout, ArrowUp, ArrowDown, Eye, EyeOff, Save, RotateCcw, Plus, Trash2, Edit2, Calendar } from 'lucide-react';

export default function AdminHomepage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('layout');
  const [marqueeText, setMarqueeText] = useState('');
  const [sections, setSections] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Editing State
  const [editingSection, setEditingSection] = useState(null);

  useEffect(() => {
    const loadLayout = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'homepage_layout', 'active'));
        if (snap.exists()) {
          const data = snap.data();
          setMarqueeText(data.marqueeText || '');
          setSections(data.sections || []);
        }
        await loadHistory();
      } catch (err) {
        console.error('Failed to load layout:', err);
        toast.error('Error loading homepage layout');
      } finally {
        setLoading(false);
      }
    };
    loadLayout();
  }, []);

  const loadHistory = async () => {
    try {
      const q = query(
        collection(db, 'homepage_history'),
        orderBy('changedAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setHistory(list);
    } catch (err) {
      console.error('Failed to load homepage history:', err);
    }
  };

  const handleMove = (index, direction) => {
    const updated = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    
    // Swap
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Reset order values
    const ordered = updated.map((sec, idx) => ({ ...sec, order: idx }));
    setSections(ordered);
  };

  const handleToggleEnable = (index) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setSections(updated);
  };

  const handleSave = async () => {
    try {
      const activeRef = doc(db, 'homepage_layout', 'active');
      const payload = {
        marqueeText,
        sections,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'Admin'
      };
      await setDoc(activeRef, payload);

      // Add to snapshot history
      await addDoc(collection(db, 'homepage_history'), {
        layout: payload,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: 'Reordered layout and updated homepage configuration'
      });

      toast.success('Homepage layout saved successfully');
      loadHistory();
    } catch (err) {
      console.error('Failed to save layout:', err);
      toast.error('Error saving homepage layout');
    }
  };

  const handleRollback = async (historyItem) => {
    try {
      const { layout } = historyItem;
      const activeRef = doc(db, 'homepage_layout', 'active');
      await setDoc(activeRef, layout);

      setMarqueeText(layout.marqueeText || '');
      setSections(layout.sections || []);

      // Add new log entry
      await addDoc(collection(db, 'homepage_history'), {
        layout,
        changedBy: user?.email || 'Admin',
        changedAt: new Date().toISOString(),
        summary: `Rolled back layout to version from ${new Date(historyItem.changedAt).toLocaleString()}`
      });

      toast.success('Rolled back homepage layout successfully');
      loadHistory();
    } catch (err) {
      console.error('Rollback failed:', err);
      toast.error('Error performing rollback');
    }
  };

  const handleEditSection = (sec, index) => {
    setEditingSection({ ...sec, index });
  };

  const handleSaveSectionEdits = () => {
    const updated = [...sections];
    updated[editingSection.index] = {
      ...editingSection,
      index: undefined // remove temporary key
    };
    setSections(updated);
    setEditingSection(null);
    toast.success('Section configured locally. Remember to click Save Layout to publish!');
  };

  // Slide helper functions
  const addHeroSlide = () => {
    const slides = editingSection.slides || [];
    setEditingSection({
      ...editingSection,
      slides: [...slides, { image: '', title: '', subtitle: '', ctaText: 'Shop Now', ctaLink: '/products' }]
    });
  };

  const removeHeroSlide = (idx) => {
    const slides = (editingSection.slides || []).filter((_, i) => i !== idx);
    setEditingSection({ ...editingSection, slides });
  };

  const updateHeroSlide = (idx, field, value) => {
    const slides = [...(editingSection.slides || [])];
    slides[idx] = { ...slides[idx], [field]: value };
    setEditingSection({ ...editingSection, slides });
  };

  // Feature helper functions
  const addFeatureItem = () => {
    const items = editingSection.items || [];
    setEditingSection({
      ...editingSection,
      items: [...items, { icon: 'Sparkles', title: 'New Feature', description: 'Brief details' }]
    });
  };

  const removeFeatureItem = (idx) => {
    const items = (editingSection.items || []).filter((_, i) => i !== idx);
    setEditingSection({ ...editingSection, items });
  };

  const updateFeatureItem = (idx, field, value) => {
    const items = [...(editingSection.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    setEditingSection({ ...editingSection, items });
  };

  // Offers helper functions
  const addOfferItem = () => {
    const items = editingSection.items || [];
    setEditingSection({
      ...editingSection,
      items: [...items, { icon: 'BadgePercent', title: 'Special Deal', text: 'Detail description', to: '/products', tone: 'from-gold-500 to-gold-700' }]
    });
  };

  const removeOfferItem = (idx) => {
    const items = (editingSection.items || []).filter((_, i) => i !== idx);
    setEditingSection({ ...editingSection, items });
  };

  const updateOfferItem = (idx, field, value) => {
    const items = [...(editingSection.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    setEditingSection({ ...editingSection, items });
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
          <h1 className="font-serif text-3xl font-bold text-luxury-900">Homepage Layout Builder</h1>
          <p className="text-sm text-luxury-500 mt-1">Reorder home page sections, edit sliders, and configure content scheduling</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury-200 mb-8 bg-white p-1 rounded-xl shadow-sm max-w-sm">
        <button
          onClick={() => setActiveTab('layout')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'layout'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <Layout className="w-4 h-4" />
          Layout Reorder
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'history'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Layout History
        </button>
      </div>

      {/* Layout Builder Tab */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          {/* Marquee Bar Editor */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <h3 className="text-base font-bold text-luxury-900 mb-4">Scrolling Marquee Text</h3>
            <input
              type="text"
              value={marqueeText}
              onChange={(e) => setMarqueeText(e.target.value)}
              className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
              placeholder="e.g. ⭐ Free Shipping on orders above ₹1000  |  Handcrafted Korean Necklace Jewelry  |  "
            />
          </div>

          {/* Reordering List */}
          <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-luxury-900">Homepage Sections Sequence</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="btn-primary py-2 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Save className="w-4.5 h-4.5" />
                  Save Layout Sequence
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {sections.map((sec, index) => (
                <div
                  key={sec.id || sec.type}
                  className={`flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm transition-all ${
                    sec.enabled ? 'border-luxury-200' : 'border-dashed border-luxury-200 bg-luxury-50/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Up/Down buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-luxury-100 text-luxury-500 disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1 rounded hover:bg-luxury-100 text-luxury-500 disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-luxury-900 capitalize">
                          {String(sec.type || sec.id).replace('_', ' ')}
                        </span>
                        {!sec.enabled && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-800 rounded font-bold uppercase tracking-wider">Disabled</span>
                        )}
                        {(sec.startDate || sec.endDate) && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-indigo-100 text-indigo-800 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Scheduled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-luxury-500 mt-0.5">Section ID: {sec.id || sec.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditSection(sec, index)}
                      className="p-2 rounded-lg border border-luxury-200 hover:border-gold-500 hover:text-gold-600 transition-colors"
                      title="Configure Section Content"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleEnable(index)}
                      className={`p-2 rounded-lg border ${
                        sec.enabled 
                          ? 'border-luxury-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                          : 'border-gold-300 bg-gold-50 hover:bg-gold-100 text-gold-700'
                      }`}
                      title={sec.enabled ? "Disable Section" : "Enable Section"}
                    >
                      {sec.enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Rollback Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
          <h3 className="text-base font-bold text-luxury-900 mb-4">Homepage Version History</h3>
          <p className="text-xs text-luxury-500 mb-6">Select a previous homepage layout sequence to restore. Updates take place instantly on the storefront.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                  <th className="py-3 px-4">Save Timestamp</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-100 text-sm">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-luxury-50/30">
                    <td className="py-3.5 px-4 font-medium text-luxury-800">
                      {new Date(item.changedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-luxury-600">{item.changedBy}</td>
                    <td className="py-3.5 px-4 text-luxury-500 max-w-xs truncate">{item.summary}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRollback(item)}
                        className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 ml-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Rollback
                      </button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-luxury-400">
                      No homepage snapshot logs saved yet. Saving changes will create restore points.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-luxury-100">
            {/* Header */}
            <div className="px-6 py-4 border-b border-luxury-200 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-luxury-900">
                Configure: <span className="capitalize">{editingSection.type}</span> ({editingSection.id || 'Active'})
              </h2>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="text-luxury-400 hover:text-luxury-700"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-luxury-850">
              {/* Scheduling Settings */}
              <div className="bg-luxury-50/50 p-4 rounded-xl border border-luxury-200">
                <h4 className="font-bold text-xs text-luxury-900 uppercase tracking-wider mb-3">Schedule Section View</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-luxury-700 mb-1">Start Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={editingSection.startDate || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, startDate: e.target.value })}
                      className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-luxury-700 mb-1">End Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={editingSection.endDate || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, endDate: e.target.value })}
                      className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Description for grid sections */}
              {(editingSection.type === 'offers' || editingSection.type === 'collections_grid' || editingSection.type === 'bestsellers' || editingSection.type === 'banner' || editingSection.type === 'newsletter') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Section Main Title</label>
                    <input
                      type="text"
                      value={editingSection.title || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                      className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Section Subtext / Description</label>
                    <textarea
                      rows={3}
                      value={editingSection.description || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                      className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                </div>
              )}

              {/* Banner CTA parameters */}
              {editingSection.type === 'banner' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">CTA Button Text</label>
                    <input
                      type="text"
                      value={editingSection.ctaText || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, ctaText: e.target.value })}
                      className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">CTA Link Destination</label>
                    <input
                      type="text"
                      value={editingSection.ctaLink || ''}
                      onChange={(e) => setEditingSection({ ...editingSection, ctaLink: e.target.value })}
                      className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                    />
                  </div>
                </div>
              )}

              {/* Hero Slider Editing */}
              {editingSection.type === 'hero' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-luxury-100 pb-2">
                    <h3 className="font-bold text-sm text-luxury-900">Hero Banners Slideshow</h3>
                    <button
                      type="button"
                      onClick={addHeroSlide}
                      className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Slide
                    </button>
                  </div>

                  {(editingSection.slides || []).map((slide, idx) => (
                    <div key={idx} className="border border-luxury-200 rounded-xl p-4 bg-luxury-50/30 relative space-y-4">
                      <button
                        type="button"
                        onClick={() => removeHeroSlide(idx)}
                        className="absolute top-4 right-4 text-luxury-400 hover:text-red-650"
                      >
                        ✕
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Image URL</label>
                          <input
                            type="text"
                            value={slide.image || ''}
                            onChange={(e) => updateHeroSlide(idx, 'image', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Title Headline</label>
                          <input
                            type="text"
                            value={slide.title || ''}
                            onChange={(e) => updateHeroSlide(idx, 'title', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Subtitle Subtext</label>
                          <input
                            type="text"
                            value={slide.subtitle || ''}
                            onChange={(e) => updateHeroSlide(idx, 'subtitle', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">CTA Button Text</label>
                          <input
                            type="text"
                            value={slide.ctaText || ''}
                            onChange={(e) => updateHeroSlide(idx, 'ctaText', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">CTA Link Route</label>
                          <input
                            type="text"
                            value={slide.ctaLink || ''}
                            onChange={(e) => updateHeroSlide(idx, 'ctaLink', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Features Editing */}
              {editingSection.type === 'features' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-luxury-100 pb-2">
                    <h3 className="font-bold text-sm text-luxury-900">Features Items Bar</h3>
                    <button
                      type="button"
                      onClick={addFeatureItem}
                      className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>

                  {(editingSection.items || []).map((item, idx) => (
                    <div key={idx} className="border border-luxury-200 rounded-xl p-4 bg-luxury-50/30 relative space-y-4">
                      <button
                        type="button"
                        onClick={() => removeFeatureItem(idx)}
                        className="absolute top-4 right-4 text-luxury-400 hover:text-red-650"
                      >
                        ✕
                      </button>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Icon Name (Lucide)</label>
                          <input
                            type="text"
                            value={item.icon || ''}
                            onChange={(e) => updateFeatureItem(idx, 'icon', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Feature Title</label>
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) => updateFeatureItem(idx, 'title', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Description Subtext</label>
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => updateFeatureItem(idx, 'description', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Offers Grid Editing */}
              {editingSection.type === 'offers' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-luxury-100 pb-2">
                    <h3 className="font-bold text-sm text-luxury-900">Offer Cards Grid</h3>
                    <button
                      type="button"
                      onClick={addOfferItem}
                      className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Offer Card
                    </button>
                  </div>

                  {(editingSection.items || []).map((item, idx) => (
                    <div key={idx} className="border border-luxury-200 rounded-xl p-4 bg-luxury-50/30 relative space-y-4">
                      <button
                        type="button"
                        onClick={() => removeOfferItem(idx)}
                        className="absolute top-4 right-4 text-luxury-400 hover:text-red-650"
                      >
                        ✕
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Icon Name (Lucide)</label>
                          <input
                            type="text"
                            value={item.icon || ''}
                            onChange={(e) => updateOfferItem(idx, 'icon', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Offer Title</label>
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) => updateOfferItem(idx, 'title', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Subtext Info</label>
                          <input
                            type="text"
                            value={item.text || ''}
                            onChange={(e) => updateOfferItem(idx, 'text', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Target URL Link</label>
                          <input
                            type="text"
                            value={item.to || ''}
                            onChange={(e) => updateOfferItem(idx, 'to', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-luxury-700 uppercase tracking-wider mb-1">Background Gradient Tone (Tailwind Classes)</label>
                          <input
                            type="text"
                            value={item.tone || 'from-gold-500 to-gold-700'}
                            onChange={(e) => updateOfferItem(idx, 'tone', e.target.value)}
                            className="w-full input-field p-2 text-xs border rounded-lg focus:ring-gold-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bestsellers limit */}
              {editingSection.type === 'bestsellers' && (
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Display Limit (Products count)</label>
                  <input
                    type="number"
                    value={editingSection.limit || 4}
                    onChange={(e) => setEditingSection({ ...editingSection, limit: Number(e.target.value) })}
                    className="w-full max-w-xs input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-luxury-200 flex justify-end gap-3 bg-luxury-50">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="btn-secondary py-2 px-6 text-xs uppercase font-bold tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSectionEdits}
                className="btn-primary py-2 px-6 text-xs uppercase font-bold tracking-wider"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
