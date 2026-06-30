import { useState } from 'react';
import {
  Plus, Edit, Trash2, Image,
  Star, X, Package, Upload, CheckCircle2, XCircle,
} from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { getDirectImageUrl } from '../../utils/imageUtils';
import { toast } from 'react-toastify';
import { logActivity, LOG_ACTIONS, LOG_MODULES, LOG_STATUS, buildAdminInfo } from '../../services/activityLogger';
import { useAdminSearch } from '../../hooks/useAdminSearch';
import FilterBar from '../../components/admin/FilterBar';

const IMGBB_API_KEY = '9a0e0b55fb1deeb61ec148cf9273fd43';

async function uploadImageToImgBB(file) {
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok || !data?.success) throw new Error(data?.error?.message || 'ImgBB upload failed');
  return data.data.url;
}

const CATEGORIES = ['Gold', 'Silver', 'Lux Wear', 'Party Wear', 'Elegant Spark'];
const STATUS_OPTIONS = ['available', 'coming_soon', 'unavailable'];

const EMPTY_FORM = {
  name: '', description: '', price: '', originalPrice: '',
  image: '', imageFile: null, imagesText: '', imagesFiles: [],
  category: 'Gold', featured: false, inStock: true, productStatus: 'available',
  isTrending: false, isBestseller: false, isNewArrival: false,
  productName: '', productCategory: '', productType: '', skuCode: '', barcode: '',
  brandName: '', collectionName: '', gender: '', ageGroup: '', occasion: '', countryOfOrigin: '',
  baseMaterial: '', primaryStone: '', stoneType: '', stoneColor: '',
  platingType: '', platingThickness: '', finishType: '',
  nickelFree: false, hypoallergenic: false, tarnishResistant: false,
  stockQuantity: '', reorderThreshold: '5', reorderQuantity: '10',
  serialNumber: '', metalType: '', weight: '', certificationNumber: '',
  warrantyId: '',
};

function StockBadge({ inStock, productStatus }) {
  if (!inStock || productStatus === 'unavailable') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3" />Out of Stock</span>;
  }
  if (productStatus === 'coming_soon') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Coming Soon</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="w-3 h-3" />In Stock</span>;
}

function FormSection({ title, children }) {
  return (
    <div className="border border-luxury-200 rounded-xl overflow-hidden">
      <div className="bg-luxury-50 px-4 py-2.5 border-b border-luxury-200">
        <p className="text-sm font-semibold text-luxury-800">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-luxury-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-luxury-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder:text-luxury-400 transition-all";

// Search & filter configuration for useAdminSearch
const SEARCH_CONFIG = {
  searchFields: [
    { key: 'name', weight: 4 },
    { key: 'skuCode', weight: 3 },
    { key: 'category', weight: 2 },
    { key: 'platingType', weight: 1 },
    { key: 'primaryStone', weight: 1 },
    { key: 'description', weight: 1 },
  ],
  filters: [
    { key: 'category', type: 'exact' },
    {
      key: 'stock',
      type: 'custom',
      fn: (item, val) => {
        if (val === 'In Stock') return item.inStock && item.productStatus !== 'unavailable';
        if (val === 'Out of Stock') return !item.inStock || item.productStatus === 'unavailable';
        if (val === 'Featured') return !!item.featured;
        return true;
      }
    },
    { key: 'price', type: 'range', min: 0, max: 1000000 },
  ],
  sorts: [
    { key: 'newest', label: 'Newest First', fn: (a, b) => (b.id || '').localeCompare(a.id || '') },
    { key: 'name_asc', label: 'Name (A-Z)', fn: (a, b) => (a.name || '').localeCompare(b.name || '') },
    { key: 'name_desc', label: 'Name (Z-A)', fn: (a, b) => (b.name || '').localeCompare(a.name || '') },
    { key: 'price_asc', label: 'Price (Low to High)', fn: (a, b) => Number(a.price || 0) - Number(b.price || 0) },
    { key: 'price_desc', label: 'Price (High to Low)', fn: (a, b) => Number(b.price || 0) - Number(a.price || 0) },
  ],
  defaultSort: 'newest',
};

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, warranties } = useProducts();
  const { isAdmin, user } = useAuth();

  const {
    results: filteredProducts,
    search,
    setSearch,
    filters,
    setFilter,
    sort,
    setSort,
    clearAll,
    activeFilterCount,
  } = useAdminSearch(products, SEARCH_CONFIG);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');

  if (!isAdmin) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(''); setUploadStatus(`Uploading ${file.name}...`);
    try {
      const url = await uploadImageToImgBB(file);
      setForm(prev => ({ ...prev, image: url, imageFile: file }));
      setUploadStatus(`✓ Uploaded: ${file.name}`);
    } catch (err) {
      setUploadError(err.message); setUploadStatus('');
    }
  };

  const handleAdditionalImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError(''); setUploadStatus(`Uploading ${files.length} images...`);
    const urls = (await Promise.all(files.map(f => uploadImageToImgBB(f).catch(() => null)))).filter(Boolean);
    if (urls.length) {
      setForm(prev => ({ ...prev, imagesText: [...prev.imagesText.split(',').filter(Boolean), ...urls].join(', ') }));
      setUploadStatus(`✓ Uploaded ${urls.length} images`);
    } else {
      setUploadError('All uploads failed'); setUploadStatus('');
    }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditingProduct(null); setShowForm(true); setUploadStatus(''); setUploadError(''); };
  const openEdit = (p) => {
    setEditingProduct(p);
    setForm({
      ...EMPTY_FORM, 
      ...p,
      image: p.image || '',
      imagesText: Array.isArray(p.images) ? p.images.join(', ') : '',
      imageFile: null, imagesFiles: [],
      warrantyId: p.warrantyId || '',
    });
    setShowForm(true);
    setUploadStatus(''); setUploadError('');
  };
  const closeForm = () => { setShowForm(false); setEditingProduct(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isDuplicate = products.some(
        (p) => p.name.trim().toLowerCase() === form.name.trim().toLowerCase() && p.id !== editingProduct?.id
      );

      if (isDuplicate) {
        throw new Error('A product with this name already exists.');
      }

      const images = form.imagesText.split(',').map(s => s.trim()).filter(Boolean);
      const { imageFile, imagesFiles, ...rest } = form;
      
      const stockQuantity = parseInt(rest.stockQuantity || 0, 10);
      const reorderThreshold = parseInt(rest.reorderThreshold || 5, 10);
      const reorderQuantity = parseInt(rest.reorderQuantity || 10, 10);
      
      const productData = {
        ...rest,
        price: parseInt(rest.price, 10),
        originalPrice: rest.originalPrice ? parseInt(rest.originalPrice, 10) : null,
        stockQuantity,
        reorderThreshold,
        reorderQuantity,
        availableQuantity: stockQuantity - Number(rest.reservedQuantity || 0),
        id: editingProduct?.id || `prod_${Date.now()}`,
        inStock: stockQuantity > 0,
        productStatus: stockQuantity > 0 ? (rest.productStatus === 'unavailable' ? 'available' : rest.productStatus) : 'unavailable',
        images: images,
        image: form.image || '',
        warrantyId: form.warrantyId || '',
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        toast.success('Product updated');
        logActivity({
          module: LOG_MODULES.PRODUCTS,
          action: LOG_ACTIONS.PRODUCT_UPDATED,
          targetId: editingProduct.id,
          targetType: 'product',
          description: `Product "${productData.name}" was updated`,
          oldValue: editingProduct.name,
          newValue: productData.name,
          status: LOG_STATUS.SUCCESS,
          adminInfo: buildAdminInfo(user),
        });
      } else {
        await addProduct(productData);
        toast.success('Product added');
        logActivity({
          module: LOG_MODULES.PRODUCTS,
          action: LOG_ACTIONS.PRODUCT_CREATED,
          targetId: productData.id,
          targetType: 'product',
          description: `New product "${productData.name}" was created in ${getCategoryLabel(productData.category)}`,
          newValue: productData.name,
          status: LOG_STATUS.SUCCESS,
          adminInfo: buildAdminInfo(user),
        });
      }
      closeForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      logActivity({
        module: LOG_MODULES.PRODUCTS,
        action: LOG_ACTIONS.PRODUCT_DELETED,
        targetId: id,
        targetType: 'product',
        description: `Product "${name}" was permanently deleted`,
        oldValue: name,
        status: LOG_STATUS.SUCCESS,
        adminInfo: buildAdminInfo(user),
      });
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900">Products</h1>
          <p className="text-sm text-luxury-500 mt-0.5">{products.length} total products</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-105">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Reusable Filter Bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search by name, SKU, plating, material..."
        selects={[
          {
            key: 'category',
            label: 'All Categories',
            options: ['All', ...CATEGORIES],
            value: filters.category,
            onChange: (val) => setFilter('category', val),
          },
          {
            key: 'stock',
            label: 'All Stock',
            options: ['All', 'In Stock', 'Out of Stock', 'Featured'],
            value: filters.stock,
            onChange: (val) => setFilter('stock', val),
          },
        ]}
        ranges={[
          {
            key: 'price',
            label: 'Price (₹)',
            min: 0,
            max: 500000,
            value: filters.price,
            onChange: (val) => setFilter('price', val),
          },
        ]}
        sorts={SEARCH_CONFIG.sorts}
        currentSort={sort}
        onSort={setSort}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAll}
        resultCount={`${filteredProducts.length} products`}
      />

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-luxury-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-luxury-50 border-b border-luxury-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Featured</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-luxury-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-100">
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-luxury-400 text-sm">
                  <Package className="w-8 h-8 mx-auto mb-2 text-luxury-300" />
                  No products found
                </td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-luxury-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-luxury-100 flex-shrink-0">
                        {(p.image || (p.images && p.images[0])) ? (
                          <img
                            src={getDirectImageUrl(p.image || p.images?.[0])}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : <Image className="w-full h-full p-3 text-luxury-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-luxury-900">{p.name}</p>
                        {p.skuCode && <p className="text-xs text-luxury-400">SKU: {p.skuCode}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gold-100 text-gold-700 border border-gold-200">
                      {getCategoryLabel(p.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-luxury-900">₹{(p.price || 0).toLocaleString()}</p>
                    {p.originalPrice && <p className="text-xs text-luxury-400 line-through">₹{p.originalPrice.toLocaleString()}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StockBadge inStock={p.inStock} productStatus={p.productStatus} />
                  </td>
                  <td className="px-4 py-3">
                    {p.featured
                      ? <span className="flex items-center gap-1 text-xs font-medium text-gold-600"><Star className="w-3.5 h-3.5 fill-gold-400" />Featured</span>
                      : <span className="text-xs text-luxury-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-luxury-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-luxury-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={closeForm} className="p-2 rounded-xl text-luxury-400 hover:text-luxury-700 hover:bg-luxury-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basic Info */}
              <FormSection title="Basic Information">
                <FormField label="Product Name" required>
                  <input name="name" value={form.name} onChange={handleInputChange} required className={inputCls} placeholder="e.g. Gold Diamond Necklace" />
                </FormField>
                <FormField label="Description" required>
                  <textarea name="description" value={form.description} onChange={handleInputChange} required rows={3} className={inputCls} placeholder="Describe the product..." />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Sale Price (₹)" required>
                    <input name="price" type="number" value={form.price} onChange={handleInputChange} required className={inputCls} placeholder="0" />
                  </FormField>
                  <FormField label="Original Price (₹)">
                    <input name="originalPrice" type="number" value={form.originalPrice} onChange={handleInputChange} className={inputCls} placeholder="0" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Category" required>
                    <select name="category" value={form.category} onChange={handleInputChange} className={inputCls}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Product Status">
                    <select name="productStatus" value={form.productStatus} onChange={handleInputChange} className={inputCls}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="Warranty Override (Optional)">
                  <select name="warrantyId" value={form.warrantyId || ''} onChange={handleInputChange} className={inputCls}>
                    <option value="">No Override (Follow Collection/Category mapping rules)</option>
                    {warranties && warranties.filter(w => w.status === 'active').map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.duration})</option>
                    ))}
                  </select>
                </FormField>
                <div className="flex flex-wrap items-center gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="featured" checked={form.featured} onChange={handleInputChange} className="w-4 h-4 accent-gold-500" />
                    <span className="text-sm font-medium text-luxury-700">Featured Product</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="inStock" checked={form.inStock} onChange={handleInputChange} className="w-4 h-4 accent-gold-500" />
                    <span className="text-sm font-medium text-luxury-700">In Stock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isTrending" checked={form.isTrending} onChange={handleInputChange} className="w-4 h-4 accent-gold-500" />
                    <span className="text-sm font-medium text-luxury-700">Trending</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isBestseller" checked={form.isBestseller} onChange={handleInputChange} className="w-4 h-4 accent-gold-500" />
                    <span className="text-sm font-medium text-luxury-700">Bestseller</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isNewArrival" checked={form.isNewArrival} onChange={handleInputChange} className="w-4 h-4 accent-gold-500" />
                    <span className="text-sm font-medium text-luxury-700">New Arrival</span>
                  </label>
                </div>
              </FormSection>

              {/* Images */}
              <FormSection title="Product Images">
                <FormField label="Main Image URL">
                  <input name="image" type="text" value={form.image} onChange={handleInputChange} placeholder="https://..." className={inputCls} />
                </FormField>
                <FormField label="Upload Main Image">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed border-luxury-300 rounded-xl text-sm text-luxury-600 hover:border-gold-400 hover:text-gold-600 transition-colors w-full">
                      <Upload className="w-4 h-4" />
                      Choose file
                      <input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" />
                    </label>
                  </div>
                </FormField>
                <FormField label="Additional Images (comma-separated URLs)">
                  <textarea name="imagesText" value={form.imagesText} onChange={handleInputChange} rows={2} placeholder="https://img1.com, https://img2.com" className={inputCls} />
                </FormField>
                <FormField label="Upload Additional Images">
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-dashed border-luxury-300 rounded-xl text-sm text-luxury-600 hover:border-gold-400 hover:text-gold-600 transition-colors w-full">
                    <Upload className="w-4 h-4" />
                    Choose multiple files
                    <input type="file" accept="image/*" multiple onChange={handleAdditionalImagesUpload} className="hidden" />
                  </label>
                </FormField>
                {uploadStatus && <p className="text-sm text-green-600 font-medium">{uploadStatus}</p>}
                {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
              </FormSection>

              {/* Inventory & Luxury Jewelry details */}
              <FormSection title="Inventory & Luxury Jewelry Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Stock Quantity" required>
                    <input name="stockQuantity" type="number" value={form.stockQuantity ?? ''} onChange={handleInputChange} required className={inputCls} placeholder="e.g. 50" />
                  </FormField>
                  <FormField label="Reorder Threshold">
                    <input name="reorderThreshold" type="number" value={form.reorderThreshold ?? 5} onChange={handleInputChange} className={inputCls} placeholder="e.g. 5" />
                  </FormField>
                  <FormField label="Recommended Reorder Quantity">
                    <input name="reorderQuantity" type="number" value={form.reorderQuantity ?? 10} onChange={handleInputChange} className={inputCls} placeholder="e.g. 10" />
                  </FormField>
                  <FormField label="SKU Code">
                    <input name="skuCode" value={form.skuCode || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. GLD-NKL-001" />
                  </FormField>
                  <FormField label="Unique Serial Number">
                    <input name="serialNumber" value={form.serialNumber || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. SN-872619" />
                  </FormField>
                  <FormField label="Metal Type">
                    <input name="metalType" value={form.metalType || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. Gold (22K) / Platinum" />
                  </FormField>
                  <FormField label="Stone Type">
                    <input name="stoneType" value={form.stoneType || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. VVS Diamond / Emerald" />
                  </FormField>
                  <FormField label="Weight">
                    <input name="weight" value={form.weight || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. 14.50 grams" />
                  </FormField>
                  <FormField label="Certification Number">
                    <input name="certificationNumber" value={form.certificationNumber || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. GIA-9281726" />
                  </FormField>
                </div>
              </FormSection>

              {/* Specifications */}
              <FormSection title="Product Specifications">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['productName', 'Product Name (spec)'], ['productCategory', 'Product Category'],
                    ['productType', 'Product Type'], ['skuCode', 'SKU Code'],
                    ['barcode', 'Barcode / EAN'], ['brandName', 'Brand Name'],
                    ['collectionName', 'Collection Name'], ['gender', 'Gender'],
                    ['ageGroup', 'Age Group'], ['occasion', 'Occasion'],
                    ['countryOfOrigin', 'Country of Origin'], ['baseMaterial', 'Base Material'],
                    ['primaryStone', 'Primary Stone'], ['stoneType', 'Stone Type'],
                    ['stoneColor', 'Stone Color'], ['platingType', 'Plating Type'],
                    ['platingThickness', 'Plating Thickness'], ['finishType', 'Finish Type'],
                  ].map(([name, label]) => (
                    <FormField key={name} label={label}>
                      <input name={name} value={form[name] || ''} onChange={handleInputChange} className={inputCls} />
                    </FormField>
                  ))}
                </div>
                <div className="flex items-center gap-6 pt-2">
                  {[['nickelFree', 'Nickel Free'], ['hypoallergenic', 'Hypoallergenic'], ['tarnishResistant', 'Tarnish Resistant']].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name={name} checked={form[name] === true} onChange={handleInputChange} className="w-4 h-4 accent-gold-500" />
                      <span className="text-sm font-medium text-luxury-700">{label}</span>
                    </label>
                  ))}
                </div>
              </FormSection>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button type="button" onClick={closeForm} className="px-6 py-3 rounded-xl border border-luxury-200 text-luxury-700 text-sm font-medium hover:bg-luxury-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
