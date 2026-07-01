import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Filter, Sparkles, Plus, Trash2, Edit2, Save, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';

export default function AdminCollections() {
  const [activeTab, setActiveTab] = useState('filters');
  const [loading, setLoading] = useState(true);

  // Visibility context fields
  const { collections = [], updateCollectionConfig } = useProducts();
  const [editingNameId, setEditingNameId] = useState(null);
  const [tempName, setTempName] = useState('');

  // Filters State
  const [filtersList, setFiltersList] = useState([]);
  const [editingFilter, setEditingFilter] = useState(null);
  const [hideEmptyCollections, setHideEmptyCollections] = useState(false);

  // Collections State
  const [collectionsList, setCollectionsList] = useState([]);
  const [editingCollection, setEditingCollection] = useState(null);

  // Fetch filter list from system_settings/filters
  useEffect(() => {
    const unsubFilters = onSnapshot(doc(db, 'system_settings', 'filters'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.list) {
          const sorted = [...data.list].sort((a, b) => (a.order || 0) - (b.order || 0));
          setFiltersList(sorted);
        }
        if (data.hideEmptyCollections !== undefined) {
          setHideEmptyCollections(data.hideEmptyCollections);
        }
      }
    });

    const unsubCollections = onSnapshot(collection(db, 'collections_metadata'), (snapshot) => {
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setCollectionsList(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading collections:", error);
      setLoading(false);
    });

    return () => {
      unsubFilters();
      unsubCollections();
    };
  }, []);

  // Filter Actions
  const handleSaveFilters = async (newList) => {
    try {
      await setDoc(doc(db, 'system_settings', 'filters'), { 
        list: newList,
        hideEmptyCollections
      }, { merge: true });
      toast.success("Filters configuration saved successfully");
    } catch (err) {
      console.error("Error saving filters config:", err);
      toast.error("Failed to save filters configuration");
    }
  };

  const handleEditFilter = (f, index) => {
    setEditingFilter({
      ...f,
      index,
      rawOptions: f.options.join(', '),
      rawCategories: f.categories.join(', ')
    });
  };

  const handleSaveFilterEdits = async (e) => {
    e.preventDefault();
    if (!editingFilter.name.trim() || !editingFilter.id.trim()) {
      toast.error("Filter name and ID are required");
      return;
    }

    const updatedList = [...filtersList];
    const newFilter = {
      id: editingFilter.id.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: editingFilter.name.trim(),
      enabled: editingFilter.enabled,
      order: editingFilter.order ?? filtersList.length,
      options: editingFilter.rawOptions.split(',').map(o => o.trim()).filter(Boolean),
      categories: editingFilter.rawCategories.split(',').map(c => c.trim()).filter(Boolean)
    };

    if (editingFilter.index !== undefined) {
      updatedList[editingFilter.index] = newFilter;
    } else {
      updatedList.push(newFilter);
    }

    await handleSaveFilters(updatedList);
    setEditingFilter(null);
  };

  const handleDeleteFilter = async (index) => {
    if (!window.confirm("Are you sure you want to delete this filter attribute?")) return;
    const updatedList = filtersList.filter((_, idx) => idx !== index);
    await handleSaveFilters(updatedList);
  };

  const handleMoveFilter = async (index, direction) => {
    const updated = [...filtersList];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    const reordered = updated.map((f, idx) => ({ ...f, order: idx }));
    await handleSaveFilters(reordered);
  };

  // Collection Actions
  const handleEditCollection = (c) => {
    setEditingCollection({
      id: c.id,
      name: c.name || '',
      description: c.description || '',
      sortBy: c.sortBy || 'trending',
      limit: c.limit || 4,
      enabled: c.enabled ?? true
    });
  };

  const handleSaveCollection = async (e) => {
    e.preventDefault();
    const cleanId = editingCollection.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanId) {
      toast.error("Please enter a valid unique ID");
      return;
    }

    try {
      const payload = {
        name: editingCollection.name,
        description: editingCollection.description,
        sortBy: editingCollection.sortBy,
        limit: Number(editingCollection.limit),
        enabled: editingCollection.enabled,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'collections_metadata', cleanId), payload);
      toast.success("Collection saved successfully!");
      setEditingCollection(null);
    } catch (err) {
      console.error("Save collection failed:", err);
      toast.error("Error saving collection metadata");
    }
  };

  const handleEditName = (col) => {
    setEditingNameId(col.id);
    setTempName(col.name);
  };

  const handleSaveName = async (id) => {
    if (!tempName.trim()) return;
    const updated = collections.map(c => c.id === id ? { ...c, name: tempName.trim(), updatedAt: new Date().toISOString() } : c);
    try {
      await updateCollectionConfig(updated);
      toast.success('Collection renamed successfully!');
      setEditingNameId(null);
    } catch (err) {
      toast.error('Failed to rename collection');
    }
  };

  const handleToggleVisibility = async (id) => {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    const updated = collections.map(c => c.id === id ? { ...c, enabled: !c.enabled, updatedAt: new Date().toISOString() } : c);
    try {
      await updateCollectionConfig(updated);
      toast.success(`Collection is now ${!col.enabled ? 'visible' : 'hidden'}`);
    } catch (err) {
      toast.error('Failed to update visibility');
    }
  };

  const handleMoveCollection = async (index, direction) => {
    const updated = [...collections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Reset orders
    const reordered = updated.map((c, idx) => ({ ...c, order: idx }));
    try {
      await updateCollectionConfig(reordered);
      toast.success('Display order updated!');
    } catch (err) {
      toast.error('Failed to update order');
    }
  };

  const handleDeleteCollection = async (id) => {
    if (!window.confirm("Are you sure you want to delete this collection config?")) return;
    try {
      await deleteDoc(doc(db, 'collections_metadata', id));
      toast.success("Collection configuration deleted");
    } catch (err) {
      console.error("Delete collection failed:", err);
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
    <div className="max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-luxury-900">Collections & Filters Config</h1>
          <p className="text-sm text-luxury-500 mt-1">Configure active side navigation filters, custom check options, and display showcases rules</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury-200 mb-8 bg-white p-1 rounded-xl shadow-sm max-w-md">
        <button
          onClick={() => { setActiveTab('filters'); setEditingFilter(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'filters'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Catalog Filters
        </button>
        <button
          onClick={() => { setActiveTab('collections'); setEditingCollection(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'collections'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Collections Shelf
        </button>
        <button
          onClick={() => { setActiveTab('visibility'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'visibility'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <Eye className="w-4 h-4" />
          Collection Visibility
        </button>
      </div>

      {/* Filters Tab */}
      {activeTab === 'filters' && (
        <div className="space-y-6">
          {editingFilter ? (
            <form onSubmit={handleSaveFilterEdits} className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md space-y-4">
              <h3 className="text-base font-bold text-luxury-900 border-b border-luxury-150 pb-2">
                {editingFilter.index !== undefined ? 'Edit Filter Attribute' : 'Add New Filter Attribute'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Filter Property ID (e.g. stoneType)</label>
                  <input
                    type="text"
                    required
                    disabled={editingFilter.index !== undefined}
                    value={editingFilter.id}
                    onChange={(e) => setEditingFilter({ ...editingFilter, id: e.target.value })}
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Filter Display Label (e.g. Stone Type)</label>
                  <input
                    type="text"
                    required
                    value={editingFilter.name}
                    onChange={(e) => setEditingFilter({ ...editingFilter, name: e.target.value })}
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Filter Options Checkboxes (comma separated)</label>
                  <input
                    type="text"
                    required
                    value={editingFilter.rawOptions}
                    onChange={(e) => setEditingFilter({ ...editingFilter, rawOptions: e.target.value })}
                    placeholder="Gold Plated, Rhodium Plated, None"
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Applied Categories checkboxes (comma separated, 'All' for general)</label>
                  <input
                    type="text"
                    required
                    value={editingFilter.rawCategories}
                    onChange={(e) => setEditingFilter({ ...editingFilter, rawCategories: e.target.value })}
                    placeholder="All, Gold, Silver"
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="relative inline-flex items-center cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={editingFilter.enabled}
                      onChange={(e) => setEditingFilter({ ...editingFilter, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                    <span className="ml-3 text-xs font-bold text-luxury-700 uppercase tracking-wider">Filter Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-luxury-100">
                <button
                  type="button"
                  onClick={() => setEditingFilter(null)}
                  className="btn-secondary py-2 px-6 text-xs uppercase font-bold tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-6 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Filter
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-luxury-900">Active Side Filters</h3>
                  <div className="mt-4 flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideEmptyCollections}
                        onChange={async (e) => {
                          const val = e.target.checked;
                          setHideEmptyCollections(val);
                          try {
                            await setDoc(doc(db, 'system_settings', 'filters'), { hideEmptyCollections: val }, { merge: true });
                            toast.success(`Empty collections are now ${val ? 'hidden' : 'visible'}`);
                          } catch(err) {
                            toast.error("Failed to save setting");
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-500"></div>
                      <span className="ml-3 text-xs font-bold text-luxury-700 uppercase tracking-wider">Hide Empty Collections (0 Items)</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => setEditingFilter({ id: '', name: '', enabled: true, rawOptions: '', rawCategories: 'All', order: filtersList.length })}
                  className="btn-primary py-2 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Filter
                </button>
              </div>

              <div className="space-y-3">
                {filtersList.map((f, index) => (
                  <div key={f.id} className="flex items-center justify-between p-4 border border-luxury-200 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-4">
                      {/* Move controls */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveFilter(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-luxury-100 text-luxury-500 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveFilter(index, 'down')}
                          disabled={index === filtersList.length - 1}
                          className="p-1 rounded hover:bg-luxury-100 text-luxury-500 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-luxury-900">{f.name}</span>
                          {!f.enabled && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-800 rounded font-bold uppercase tracking-wider">Disabled</span>
                          )}
                        </div>
                        <p className="text-xs text-luxury-500 mt-1">
                          Options: {f.options.slice(0, 5).join(', ')} {f.options.length > 5 ? '...' : ''}
                        </p>
                        <p className="text-[10px] text-luxury-400 mt-0.5">Applied to Categories: {f.categories.join(', ')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditFilter(f, index)}
                        className="p-2 rounded-lg border border-luxury-200 hover:border-gold-500 hover:text-gold-600 transition-colors"
                        title="Edit Filter Attributes"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFilter(index)}
                        className="p-2 rounded-lg border border-luxury-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                        title="Delete Filter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {filtersList.length === 0 && (
                  <p className="text-center py-8 text-xs text-luxury-400">No custom filters configured.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collections Tab */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          {editingCollection ? (
            <form onSubmit={handleSaveCollection} className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md space-y-4">
              <h3 className="text-base font-bold text-luxury-900 border-b border-luxury-150 pb-2">
                Configure Collection Showcase
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Collection Unique ID</label>
                  <input
                    type="text"
                    required
                    value={editingCollection.id}
                    onChange={(e) => setEditingCollection({ ...editingCollection, id: e.target.value })}
                    placeholder="e.g. trending"
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editingCollection.name}
                    onChange={(e) => setEditingCollection({ ...editingCollection, name: e.target.value })}
                    placeholder="e.g. Trending Pieces"
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Showcase Description</label>
                  <textarea
                    rows={2}
                    value={editingCollection.description}
                    onChange={(e) => setEditingCollection({ ...editingCollection, description: e.target.value })}
                    placeholder="Brief description about the shelf showcase..."
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Sorting Rule</label>
                  <select
                    value={editingCollection.sortBy}
                    onChange={(e) => setEditingCollection({ ...editingCollection, sortBy: e.target.value })}
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  >
                    <option value="newest">New Arrivals</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="best-selling">Best Selling</option>
                    <option value="trending">Trending Score</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Display Limit (Products count)</label>
                  <input
                    type="number"
                    required
                    value={editingCollection.limit}
                    onChange={(e) => setEditingCollection({ ...editingCollection, limit: Number(e.target.value) })}
                    className="w-full input-field p-3 border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="relative inline-flex items-center cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={editingCollection.enabled}
                      onChange={(e) => setEditingCollection({ ...editingCollection, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                    <span className="ml-3 text-xs font-bold text-luxury-700 uppercase tracking-wider">Showcase Visible</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-luxury-100">
                <button
                  type="button"
                  onClick={() => setEditingCollection(null)}
                  className="btn-secondary py-2 px-6 text-xs uppercase font-bold tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-6 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Collection
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-luxury-100 shadow-md overflow-hidden">
              <div className="p-4 border-b border-luxury-150 flex items-center justify-between bg-luxury-50/20">
                <h3 className="text-sm font-bold text-luxury-900">Custom Showcase Shelves</h3>
                <button
                  onClick={() => setEditingCollection({ id: '', name: '', description: '', sortBy: 'trending', limit: 4, enabled: true })}
                  className="btn-primary py-2 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Create Showcase
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                      <th className="py-3 px-4">Shelf Name</th>
                      <th className="py-3 px-4">Sort Strategy</th>
                      <th className="py-3 px-4">Display Limit</th>
                      <th className="py-3 px-4">Visibility</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-100 text-sm">
                    {collectionsList.map((c) => (
                      <tr key={c.id} className="hover:bg-luxury-50/30">
                        <td className="py-3.5 px-4 font-semibold text-luxury-800">
                          {c.name}
                          <span className="block text-[10px] text-luxury-400 uppercase tracking-wider mt-0.5">ID: {c.id}</span>
                        </td>
                        <td className="py-3.5 px-4 capitalize font-medium text-luxury-600">{c.sortBy.replace('-', ' ')}</td>
                        <td className="py-3.5 px-4 text-luxury-700">{c.limit} products</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                            c.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {c.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditCollection(c)}
                              className="p-1.5 rounded-lg border border-luxury-200 text-luxury-600 hover:border-gold-500 hover:text-gold-600 transition-colors"
                              title="Edit Showcase Config"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCollection(c.id)}
                              className="p-1.5 rounded-lg border border-luxury-200 text-luxury-400 hover:text-red-650 hover:border-red-200 transition-colors"
                              title="Delete Showcase"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {collectionsList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-luxury-400">
                          No custom showcase shelves configured yet. Click Create Showcase to add.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Collection Visibility Tab */}
      {activeTab === 'visibility' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-luxury-100 shadow-md overflow-hidden">
            <div className="p-6 border-b border-luxury-150 flex items-center justify-between bg-luxury-50/20">
              <div>
                <h3 className="text-base font-bold text-luxury-900">Collection Visibility Control</h3>
                <p className="text-xs text-luxury-500 mt-1">Manage which product collections are active and visible across the storefront, header, footer, filters, and menus.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                    <th className="py-3 px-6">Display Order</th>
                    <th className="py-3 px-6">Collection Details</th>
                    <th className="py-3 px-6">Product Count</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Visibility Toggle</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury-100 text-sm">
                  {collections.map((col, index) => (
                    <tr key={col.id} className="hover:bg-luxury-50/30">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveCollection(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-luxury-100 text-luxury-500 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCollection(index, 'down')}
                            disabled={index === collections.length - 1}
                            className="p-1 rounded hover:bg-luxury-100 text-luxury-500 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          {editingNameId === col.id ? (
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveName(col.id); }} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="input-field p-1 px-2 border rounded text-xs focus:ring-gold-500"
                                autoFocus
                              />
                              <button type="submit" className="p-1 text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase">Save</button>
                              <button type="button" onClick={() => setEditingNameId(null)} className="p-1 text-red-650 hover:text-red-700 font-bold text-xs uppercase">Cancel</button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-luxury-800">{col.name}</span>
                              <button onClick={() => handleEditName(col)} className="text-luxury-400 hover:text-gold-550 transition-colors" title="Rename Collection">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <span className="block text-[10px] text-luxury-400 uppercase tracking-wider mt-0.5">Category Key: {col.category}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-luxury-700">
                        <span className="font-medium text-xs bg-luxury-50 border border-luxury-200 px-2 py-0.5 rounded-lg">
                          {col.count} products
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                          col.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {col.enabled ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.enabled}
                            onChange={() => handleToggleVisibility(col.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                        </label>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(col.id)}
                            className={`p-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
                              col.enabled 
                                ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100' 
                                : 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {col.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
