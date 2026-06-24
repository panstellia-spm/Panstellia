import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Plus, Trash2, Edit2, Eye, EyeOff, Save, Link as LinkIcon, ExternalLink } from 'lucide-react';

export default function AdminLandingPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    subtitle: '',
    bannerImage: '',
    enabled: true,
    category: '',
    priceRange: { min: '', max: '' },
    filters: { platingType: '', stoneType: '', gender: '' },
    seoTitle: '',
    seoDescription: '',
    seoKeywords: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'landing_pages'), (snapshot) => {
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPages(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading landing pages:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleEdit = (page) => {
    setEditingId(page.id);
    setFormData({
      slug: page.id,
      title: page.title || '',
      subtitle: page.subtitle || '',
      bannerImage: page.bannerImage || '',
      enabled: page.enabled ?? true,
      category: page.category || '',
      priceRange: {
        min: page.priceRange?.min ?? '',
        max: page.priceRange?.max ?? ''
      },
      filters: {
        platingType: page.filters?.platingType?.[0] || '',
        stoneType: page.filters?.stoneType?.[0] || '',
        gender: page.filters?.gender?.[0] || ''
      },
      seoTitle: page.seoTitle || '',
      seoDescription: page.seoDescription || '',
      seoKeywords: page.seoKeywords || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this landing page?")) return;
    try {
      await deleteDoc(doc(db, 'landing_pages', id));
      toast.success("Landing page deleted successfully");
    } catch (err) {
      console.error("Delete landing page failed:", err);
      toast.error("Failed to delete landing page");
    }
  };

  const handleToggleEnable = async (page) => {
    try {
      await setDoc(doc(db, 'landing_pages', page.id), {
        ...page,
        enabled: !page.enabled
      });
      toast.success(`Page ${!page.enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      console.error("Toggle page enable failed:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanSlug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanSlug) {
      toast.error("Please enter a valid URL slug");
      return;
    }

    try {
      // Build filters payload
      const filtersPayload = {};
      if (formData.filters.platingType) filtersPayload.platingType = [formData.filters.platingType];
      if (formData.filters.stoneType) filtersPayload.stoneType = [formData.filters.stoneType];
      if (formData.filters.gender) filtersPayload.gender = [formData.filters.gender];

      // Build price payload
      const pricePayload = {};
      if (formData.priceRange.min !== '') pricePayload.min = Number(formData.priceRange.min);
      if (formData.priceRange.max !== '') pricePayload.max = Number(formData.priceRange.max);

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle,
        bannerImage: formData.bannerImage,
        enabled: formData.enabled,
        category: formData.category || null,
        priceRange: Object.keys(pricePayload).length > 0 ? pricePayload : null,
        filters: Object.keys(filtersPayload).length > 0 ? filtersPayload : null,
        seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription,
        seoKeywords: formData.seoKeywords,
        updatedAt: new Date().toISOString()
      };

      // Write to Firestore using slug as the document ID
      await setDoc(doc(db, 'landing_pages', cleanSlug), payload);

      // If we edited a page and changed the slug, delete the old document
      if (editingId && editingId !== cleanSlug) {
        await deleteDoc(doc(db, 'landing_pages', editingId));
      }

      toast.success("Landing page saved successfully!");
      resetForm();
    } catch (err) {
      console.error("Save landing page failed:", err);
      toast.error("Error saving landing page");
    }
  };

  const resetForm = () => {
    setFormData({
      slug: '',
      title: '',
      subtitle: '',
      bannerImage: '',
      enabled: true,
      category: '',
      priceRange: { min: '', max: '' },
      filters: { platingType: '', stoneType: '', gender: '' },
      seoTitle: '',
      seoDescription: '',
      seoKeywords: ''
    });
    setEditingId(null);
    setShowForm(false);
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
          <h1 className="font-serif text-3xl font-bold text-luxury-900">Custom Landing Pages</h1>
          <p className="text-sm text-luxury-500 mt-1">Create dedicated showcase pages with custom URLs, headers, and product search queries</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4.5 h-4.5" />
            Create Page
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-luxury-100 shadow-md space-y-6">
          <div className="border-b border-luxury-150 pb-4">
            <h3 className="text-base font-bold text-luxury-900">{editingId ? 'Edit Landing Page' : 'Create New Landing Page'}</h3>
            <p className="text-xs text-luxury-500 mt-1">Configure layout properties, custom filtering rules, and SEO descriptors</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slug */}
            <div>
              <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">URL Path Slug (Unique ID)</label>
              <div className="flex items-center">
                <span className="bg-luxury-100 border border-r-0 border-luxury-300 px-3 py-3 rounded-l-lg text-xs font-semibold text-luxury-600">panstellia.com/c/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  disabled={editingId !== null}
                  placeholder="e.g. wedding-specials"
                  className="flex-1 input-field p-3 text-sm border rounded-r-lg focus:ring-gold-500 disabled:bg-luxury-50 disabled:text-luxury-500"
                />
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center pt-8">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                <span className="ml-3 text-xs font-bold text-luxury-700 uppercase tracking-wider">Page Live (Enabled)</span>
              </label>
            </div>

            {/* Title & Subtitle */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Banner Headline Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Wedding Collection Specials"
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Banner Subtitle / Description</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Premium handcrafted gold and diamond necklaces for your special day."
                  className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                />
              </div>
            </div>

            {/* Banner Image */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Banner Image URL</label>
              <input
                type="text"
                value={formData.bannerImage}
                onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                placeholder="e.g. https://i.ibb.co/..."
                className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
              />
            </div>

            {/* Custom Rules */}
            <div className="md:col-span-2 border-t border-luxury-150 pt-4">
              <h4 className="font-serif text-sm font-bold text-luxury-900 mb-4">Showcase Filtering Rules</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Filter by Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  >
                    <option value="">Show All Categories</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Lux Wear">Lux Wear</option>
                    <option value="Party Wear">Party Wear</option>
                    <option value="Elegant Spark">Elegant Spark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Min Price Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.priceRange.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      priceRange: { ...formData.priceRange, min: e.target.value }
                    })}
                    placeholder="Min Value"
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Max Price Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.priceRange.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      priceRange: { ...formData.priceRange, max: e.target.value }
                    })}
                    placeholder="Max Value"
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Plating Type Filter</label>
                  <select
                    value={formData.filters.platingType}
                    onChange={(e) => setFormData({
                      ...formData,
                      filters: { ...formData.filters, platingType: e.target.value }
                    })}
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  >
                    <option value="">Any Plating</option>
                    <option value="Gold Plated">Gold Plated</option>
                    <option value="Rhodium Plated">Rhodium Plated</option>
                    <option value="Rose Gold Plated">Rose Gold Plated</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Stone Type Filter</label>
                  <select
                    value={formData.filters.stoneType}
                    onChange={(e) => setFormData({
                      ...formData,
                      filters: { ...formData.filters, stoneType: e.target.value }
                    })}
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  >
                    <option value="">Any Stone</option>
                    <option value="VVS Diamond">VVS Diamond</option>
                    <option value="Cubic Zirconia">Cubic Zirconia</option>
                    <option value="Emerald">Emerald</option>
                    <option value="Ruby">Ruby</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Gender Category</label>
                  <select
                    value={formData.filters.gender}
                    onChange={(e) => setFormData({
                      ...formData,
                      filters: { ...formData.filters, gender: e.target.value }
                    })}
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  >
                    <option value="">Any Gender</option>
                    <option value="Women">Women</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Men">Men</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEO Attributes */}
            <div className="md:col-span-2 border-t border-luxury-150 pt-4 space-y-4">
              <h4 className="font-serif text-sm font-bold text-luxury-900">SEO & Metadata Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">SEO Page Title</label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                    placeholder="Wedding specials jewelry | Panstellia"
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Meta Description</label>
                  <input
                    type="text"
                    value={formData.seoDescription}
                    onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                    placeholder="Short description snippet displayed in web search results..."
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-2">Keywords list (comma separated)</label>
                  <input
                    type="text"
                    value={formData.seoKeywords}
                    onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                    placeholder="necklaces, weddings, gold jewelry, diamonds"
                    className="w-full input-field p-3 text-sm border rounded-lg focus:ring-gold-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-luxury-100 pt-4 bg-luxury-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary py-2 px-6 text-xs uppercase font-bold tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-6 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Landing Page
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-2xl border border-luxury-100 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase tracking-wider bg-luxury-50/50">
                  <th className="py-3 px-4">URL Slug</th>
                  <th className="py-3 px-4">Headline Title</th>
                  <th className="py-3 px-4">Filters Configuration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-100 text-sm">
                {pages.map((page) => {
                  const rulesCount = [
                    page.category ? 1 : 0,
                    page.priceRange ? 1 : 0,
                    page.filters ? Object.keys(page.filters).length : 0
                  ].reduce((a, b) => a + b, 0);

                  return (
                    <tr key={page.id} className="hover:bg-luxury-50/30">
                      <td className="py-3.5 px-4 font-semibold text-gold-600">
                        <a
                          href={`/c/${page.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          /c/{page.id}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4 text-luxury-800 font-medium">{page.title}</td>
                      <td className="py-3.5 px-4 text-luxury-500 text-xs">
                        {rulesCount > 0 ? (
                          <span className="bg-gold-50 border border-gold-200/50 text-gold-700 px-2 py-0.5 rounded-full font-semibold">
                            {rulesCount} active filter rules
                          </span>
                        ) : (
                          <span className="text-luxury-400">All products</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleEnable(page)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider transition-colors ${
                            page.enabled 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {page.enabled ? 'Live' : 'Hidden'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(page)}
                            className="p-1.5 rounded-lg border border-luxury-200 text-luxury-600 hover:border-gold-500 hover:text-gold-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="p-1.5 rounded-lg border border-luxury-200 text-luxury-400 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-luxury-400">
                      No custom landing pages created yet. Click &quot;Create Page&quot; to build your first.
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
