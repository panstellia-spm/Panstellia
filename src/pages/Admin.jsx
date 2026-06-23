import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Edit, Trash2, DollarSign, ShoppingBag, BarChart3 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { db } from '../services/firebase';
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { getCategoryLabel } from '../utils/categoryLabels';
import RevenueAdmin from './RevenueAdmin';
import ReportsAdmin from './ReportsAdmin';

const IMGBB_API_KEY = '9a0e0b55fb1deeb61ec148cf9273fd43';

const uploadImageToImgBB = async (file) => {
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', file);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data?.success) {
    const msg = data?.error?.message || 'IMGBB upload failed';
    throw new Error(msg);
  }

  return data?.data?.url;
};


const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  const [activeTab, setActiveTab] = useState('products');

  const [orders, setOrders] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  const [loading, setLoading] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    image: '',
    imageFile: null,
    imagesText: '',
    imagesFiles: [],

    category: 'Gold',
    featured: false,
    inStock: true,
    isTrending: false,
    isBestseller: false,
    isNewArrival: false,

    // Admin controlled product arrival stage / availability state.
    productStatus: 'available',

    // Product Specifications (used on ProductDetail page)
    productName: '',
    productCategory: '',
    productType: '',
    skuCode: '',
    barcode: '',
    brandName: '',
    collectionName: '',
    gender: '',
    ageGroup: '',
    occasion: '',
    countryOfOrigin: '',

    baseMaterial: '',
    primaryStone: '',
    stoneType: '',
    stoneColor: '',
    platingType: '',
    platingThickness: '',
    finishType: '',
    nickelFree: null,
    hypoallergenic: null,
    tarnishResistant: null,
  });

  useEffect(() => {
    if (!user || !isAdmin) navigate('/login');
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    fetchOrders();
    fetchFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const feedbackRef = collection(db, 'customerFeedback');
      const q = query(feedbackRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const feedbacksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeedbacks(feedbacksData);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      setFeedbacks([]);
    }
  };

  const fetchOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(ordersData);
    } catch (error) {
      setOrders([
        {
          id: 'demo-1',
          items: [{ name: 'Gold Pendant', price: 15999, quantity: 1 }],
          total: 16799,
          status: 'processing',
          createdAt: new Date(),
        },
      ]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError('');
    setImageUploadStatus(`Uploading ${file.name}...`);

    try {
      const url = await uploadImageToImgBB(file);
      setProductForm((prev) => ({
        ...prev,
        imageFile: file,
        image: url,
      }));
      setImageUploadStatus(`Uploaded ${file.name}`);
    } catch (error) {
      setImageUploadError(error?.message || 'Failed to upload image');
      setImageUploadStatus('');
      console.error('Image upload failed:', error);
    }
  };

  const handleImagesFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageUploadError('');
    setImageUploadStatus(`Uploading ${files.length} images...`);

    const uploadPromises = files.map(async (file) => {
      try {
        return await uploadImageToImgBB(file);
      } catch (error) {
        console.error('Image upload failed:', file.name, error);
        return null;
      }
    });

    const urls = (await Promise.all(uploadPromises)).filter(Boolean);

    if (urls.length > 0) {
      setProductForm((prev) => ({
        ...prev,
        imagesFiles: files,
        imagesText: urls.join(', '),
      }));
      setImageUploadStatus(`Uploaded ${urls.length} images`);
    } else {
      setImageUploadError('Failed to upload selected images.');
      setImageUploadStatus('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const images = productForm.imagesText
        ? productForm.imagesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const { imageFile, imagesFiles, ...formValues } = productForm;

      const productData = {
        ...formValues,
        // Firestore rejects undefined values in documents.
        // So we omit `images` entirely when none are provided.
        ...(images.length > 0 ? { images } : {}),
        price: parseInt(formValues.price, 10),
        originalPrice: formValues.originalPrice
          ? parseInt(formValues.originalPrice, 10)
          : null,
        id: editingProduct?.id || `prod_${Date.now()}`,
      };

      if (!productData.images || productData.images.length === 0) {
        productData.image = formValues.image;
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      setShowProductForm(false);
      setEditingProduct(null);
      setImageUploadStatus('');
      setImageUploadError('');
      setProductForm({
        name: '',
        description: '',
        price: '',
        originalPrice: '',
        image: '',
        imageFile: null,
        imagesText: '',
        imagesFiles: [],
        category: 'Gold',
        featured: false,
        inStock: true,
        isTrending: false,
        isBestseller: false,
        isNewArrival: false,
        productStatus: 'available',

        // Specifications
        productName: '',
        productCategory: '',
        productType: '',
        skuCode: '',
        barcode: '',
        brandName: '',
        collectionName: '',
        gender: '',
        ageGroup: '',
        occasion: '',
        countryOfOrigin: '',

        baseMaterial: '',
        primaryStone: '',
        stoneType: '',
        stoneColor: '',
        platingType: '',
        platingThickness: '',
        finishType: '',
        nickelFree: null,
        hypoallergenic: null,
        tarnishResistant: null,
      });
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const imagesText = Array.isArray(product.images)
      ? product.images.join(', ')
      : '';

    setProductForm({
      name: product.name ?? '',
      description: product.description ?? '',
      price: product.price?.toString() || '',
      originalPrice: product.originalPrice?.toString() || '',
      image: product.image ?? '',
      imageFile: null,
      imagesText,
      imagesFiles: [],
      category: product.category || 'Gold',
      featured: product.featured || false,
      inStock: product.inStock ?? true,
      isTrending: product.isTrending || false,
      isBestseller: product.isBestseller || false,
      isNewArrival: product.isNewArrival || false,
      productStatus: product.productStatus ?? 'available',

      // Specifications
      productName: product.productName ?? '',
      productCategory: product.productCategory ?? '',
      productType: product.productType ?? '',
      skuCode: product.skuCode ?? '',
      barcode: product.barcode ?? '',
      brandName: product.brandName ?? '',
      collectionName: product.collectionName ?? '',
      gender: product.gender ?? '',
      ageGroup: product.ageGroup ?? '',
      occasion: product.occasion ?? '',
      countryOfOrigin: product.countryOfOrigin ?? '',

      baseMaterial: product.baseMaterial ?? '',
      primaryStone: product.primaryStone ?? '',
      stoneType: product.stoneType ?? '',
      stoneColor: product.stoneColor ?? '',
      platingType: product.platingType ?? '',
      platingThickness: product.platingThickness ?? '',
      finishType: product.finishType ?? '',
      nickelFree: product.nickelFree ?? null,
      hypoallergenic: product.hypoallergenic ?? null,
      tarnishResistant: product.tarnishResistant ?? null,
    });

    setShowProductForm(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteProduct(productId);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const categories = ['Gold', 'Silver', 'Lux Wear', 'Party Wear', 'Elegant Spark'];

  const STATUS_OPTIONS = [
    'picked',
    'packed',
    'shipped',
    'out of delivery',
    'delivered',
  ];

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    if (!orderId || !nextStatus) return;

    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, { status: nextStatus });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch (e) {
      console.error('Error updating order status:', e);
    }
  };

  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: orders.filter((o) => o.status === 'processing').length,
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8">
          Admin Panel
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-gold-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-luxury-900">{stats.totalProducts}</p>
                <p className="text-sm text-luxury-500">Products</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-luxury-900">{stats.totalOrders}</p>
                <p className="text-sm text-luxury-500">Orders</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-luxury-900">₹{(stats.totalRevenue / 1000).toFixed(1)}k</p>
                <p className="text-sm text-luxury-500">Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-luxury-900">{stats.pendingOrders}</p>
                <p className="text-sm text-luxury-500">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="border-b border-luxury-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 border-b-2 font-medium ${
                  activeTab === 'products'
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-luxury-500 hover:text-luxury-700'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 border-b-2 font-medium ${
                  activeTab === 'orders'
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-luxury-500 hover:text-luxury-700'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-4 border-b-2 font-medium ${
                  activeTab === 'payments'
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-luxury-500 hover:text-luxury-700'
                }`}
              >
                Payments
              </button>
              <button
                onClick={() => setActiveTab('revenue')}
                className={`py-4 border-b-2 font-medium ${
                  activeTab === 'revenue'
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-luxury-500 hover:text-luxury-700'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-4 border-b-2 font-medium ${
                  activeTab === 'reports'
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-luxury-500 hover:text-luxury-700'
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`py-4 border-b-2 font-medium ${
                  activeTab === 'feedback'
                    ? 'border-gold-500 text-gold-600'
                    : 'border-transparent text-luxury-500 hover:text-luxury-700'
                }`}
              >
                Customer Feedback
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-luxury-900">Manage Products</h2>
                  <button
                    onClick={() => {
                      setShowProductForm(true);
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        description: '',
                        price: '',
                        originalPrice: '',
                        image: '',
                        imagesText: '',
                        category: 'Gold',
                        featured: false,
                        inStock: true,
                        isTrending: false,
                        isBestseller: false,
                        isNewArrival: false,
                        productStatus: 'available',

                        // Specifications
                        productName: '',
                        productCategory: '',
                        productType: '',
                        skuCode: '',
                        barcode: '',
                        brandName: '',
                        collectionName: '',
                        gender: '',
                        ageGroup: '',
                        occasion: '',
                        countryOfOrigin: '',

                        baseMaterial: '',
                        primaryStone: '',
                        stoneType: '',
                        stoneColor: '',
                        platingType: '',
                        platingThickness: '',
                        finishType: '',
                        nickelFree: null,
                        hypoallergenic: null,
                        tarnishResistant: null,
                      });
                    }}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </button>
                </div>

                {showProductForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                      <h3 className="font-semibold text-lg mb-4">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Name</label>
                          <input
                            type="text"
                            name="name"
                            value={productForm.name}
                            onChange={handleInputChange}
                            required
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea
                            name="description"
                            value={productForm.description}
                            onChange={handleInputChange}
                            required
                            rows={3}
                            className="input-field"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Price</label>
                            <input
                              type="number"
                              name="price"
                              value={productForm.price}
                              onChange={handleInputChange}
                              required
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Original Price</label>
                            <input
                              type="number"
                              name="originalPrice"
                              value={productForm.originalPrice}
                              onChange={handleInputChange}
                              className="input-field"
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-luxury-200 bg-luxury-50 p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-base font-semibold text-luxury-900">Product Images</h4>
                              <p className="text-sm text-luxury-600">Provide a main image and optional additional images.</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Main Image URL</label>
                              <input
                                type="url"
                                name="image"
                                value={productForm.image}
                                onChange={handleInputChange}
                                required
                                placeholder="https://..."
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Or upload main image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageFileChange}
                                className="w-full text-sm text-luxury-700"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Additional Images</label>
                              <input
                                type="text"
                                name="imagesText"
                                value={productForm.imagesText}
                                onChange={handleInputChange}
                                placeholder="https://... , https://..."
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Or upload additional images</label>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImagesFilesChange}
                                className="w-full text-sm text-luxury-700"
                              />
                            </div>
                          </div>

                          {imageUploadStatus && (
                            <p className="mt-3 text-sm text-gold-600">{imageUploadStatus}</p>
                          )}
                          {imageUploadError && (
                            <p className="mt-3 text-sm text-red-600">{imageUploadError}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Category</label>
                          <select
                            name="category"
                            value={productForm.category}
                            onChange={handleInputChange}
                            className="input-field"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {getCategoryLabel(cat)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="featured"
                              checked={productForm.featured}
                              onChange={handleInputChange}
                              className="mr-2"
                            />
                            Featured
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="inStock"
                              checked={productForm.inStock}
                              onChange={handleInputChange}
                              className="mr-2"
                            />
                            In Stock
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="isTrending"
                              checked={productForm.isTrending}
                              onChange={handleInputChange}
                              className="mr-2"
                            />
                            Trending
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="isBestseller"
                              checked={productForm.isBestseller}
                              onChange={handleInputChange}
                              className="mr-2"
                            />
                            Bestseller
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="isNewArrival"
                              checked={productForm.isNewArrival}
                              onChange={handleInputChange}
                              className="mr-2"
                            />
                            New Arrival
                          </label>
                        </div>

                        {/* Specifications */}
                        <div className="pt-4 border-t border-luxury-200">
                          <h4 className="font-semibold text-luxury-900 mb-3">
                            Add Products Specifications
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Product Name</label>
                              <input
                                type="text"
                                name="productName"
                                value={productForm.productName}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Product Category</label>
                              <input
                                type="text"
                                name="productCategory"
                                value={productForm.productCategory}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Product Type</label>
                              <input
                                type="text"
                                name="productType"
                                value={productForm.productType}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">SKU Code</label>
                              <input
                                type="text"
                                name="skuCode"
                                value={productForm.skuCode}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Barcode / EAN</label>
                              <input
                                type="text"
                                name="barcode"
                                value={productForm.barcode}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Brand Name</label>
                              <input
                                type="text"
                                name="brandName"
                                value={productForm.brandName}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Collection Name</label>
                              <input
                                type="text"
                                name="collectionName"
                                value={productForm.collectionName}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Gender</label>
                              <input
                                type="text"
                                name="gender"
                                value={productForm.gender}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Age Group</label>
                              <input
                                type="text"
                                name="ageGroup"
                                value={productForm.ageGroup}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Occasion</label>
                              <input
                                type="text"
                                name="occasion"
                                value={productForm.occasion}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Country of Origin</label>
                              <input
                                type="text"
                                name="countryOfOrigin"
                                value={productForm.countryOfOrigin}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Base Material</label>
                              <input
                                type="text"
                                name="baseMaterial"
                                value={productForm.baseMaterial}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Primary Stone</label>
                              <input
                                type="text"
                                name="primaryStone"
                                value={productForm.primaryStone}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Stone Type</label>
                              <input
                                type="text"
                                name="stoneType"
                                value={productForm.stoneType}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Stone Color</label>
                              <input
                                type="text"
                                name="stoneColor"
                                value={productForm.stoneColor}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Plating Type</label>
                              <input
                                type="text"
                                name="platingType"
                                value={productForm.platingType}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Plating Thickness</label>
                              <input
                                type="text"
                                name="platingThickness"
                                value={productForm.platingThickness}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Finish Type</label>
                              <input
                                type="text"
                                name="finishType"
                                value={productForm.finishType}
                                onChange={handleInputChange}
                                className="input-field"
                              />
                            </div>

                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium mb-1">
                                <input
                                  type="checkbox"
                                  name="nickelFree"
                                  checked={productForm.nickelFree === true}
                                  onChange={(e) =>
                                    setProductForm((prev) => ({
                                      ...prev,
                                      nickelFree: e.target.checked ? true : false,
                                    }))
                                  }
                                />
                                Nickel Free
                              </label>
                            </div>

                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium mb-1">
                                <input
                                  type="checkbox"
                                  name="hypoallergenic"
                                  checked={productForm.hypoallergenic === true}
                                  onChange={(e) =>
                                    setProductForm((prev) => ({
                                      ...prev,
                                      hypoallergenic: e.target.checked ? true : false,
                                    }))
                                  }
                                />
                                Hypoallergenic
                              </label>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="flex items-center gap-2 text-sm font-medium mb-1">
                                <input
                                  type="checkbox"
                                  name="tarnishResistant"
                                  checked={productForm.tarnishResistant === true}
                                  onChange={(e) =>
                                    setProductForm((prev) => ({
                                      ...prev,
                                      tarnishResistant: e.target.checked ? true : false,
                                    }))
                                  }
                                />
                                Tarnish Resistant
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-primary"
                          >
                            {loading ? 'Saving...' : 'Save Product'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowProductForm(false);
                              setEditingProduct(null);
                            }}
                            className="px-6 py-3 border border-luxury-200 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-luxury-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Image</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-200">
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-4 py-3">
                            <img
                              src={getOptimizedImageUrl(product.image, { width: 100, quality: 60 })}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/48?text=No+Image';
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-luxury-900">{product.name}</td>
                          <td className="px-4 py-3">
                            <span className="badge badge-gold">{getCategoryLabel(product.category)}</span>
                          </td>
                          <td className="px-4 py-3 text-luxury-900">₹{product.price?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
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
            )}

            {activeTab === 'orders' && (
              <div>
                <h2 className="font-semibold text-luxury-900 mb-4">All Orders</h2>
                <div className="space-y-4">
                  {orders.map((order) => {
                    const customerNameRaw =
                      order.customerName || order.name || order.fullName || '';
                    const customerName =
                      typeof customerNameRaw === 'object'
                        ? customerNameRaw.fullName || customerNameRaw.name || ''
                        : customerNameRaw;

                    const customerPhoneRaw =
                      order.customerPhone ||
                      order.phone ||
                      order.contact ||
                      order.mobile ||
                      '';
                    const customerPhone =
                      typeof customerPhoneRaw === 'object'
                        ? customerPhoneRaw.mobile || customerPhoneRaw.phone || ''
                        : customerPhoneRaw;

                    const customerAddressRaw =
                      order.address ||
                      order.shippingAddress ||
                      order.customerAddress ||
                      '';
                    const customerAddress =
                      typeof customerAddressRaw === 'object'
                        ? [
                            customerAddressRaw.addressLine1,
                            customerAddressRaw.addressLine2,
                            customerAddressRaw.city,
                            customerAddressRaw.state,
                          ]
                            .filter(Boolean)
                            .join(', ')
                        : customerAddressRaw;

                    const customerPincodeRaw =
                      order.pincode || order.zip || order.postalCode || '';
                    const customerPincode =
                      typeof customerPincodeRaw === 'object'
                        ? customerPincodeRaw.pincode || ''
                        : customerPincodeRaw;

                    const canCancel =
                      order.status !== 'delivered' && order.status !== 'cancelled';

                    const handleCancelOrder = async () => {
                      if (!canCancel) return;
                      if (
                        !window.confirm(
                          `Cancel order ${order.id?.slice(0, 8).toUpperCase()}?`
                        )
                      ) {
                        return;
                      }

                      try {
                        const orderDocRef = doc(db, 'orders', order.id);
                        await updateDoc(orderDocRef, { status: 'cancelled' });
                        setOrders((prev) =>
                          prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o))
                        );
                      } catch (e) {
                        console.error('Error cancelling order:', e);
                      }
                    };

                    const handleDeleteOrder = async () => {
                      if (
                        !window.confirm(
                          `Delete order ${order.id?.slice(0, 8).toUpperCase()}? This cannot be undone.`
                        )
                      ) {
                        return;
                      }

                      try {
                        const orderDocRef = doc(db, 'orders', order.id);
                        await deleteDoc(orderDocRef);
                        setOrders((prev) => prev.filter((o) => o.id !== order.id));
                      } catch (e) {
                        console.error('Error deleting order:', e);
                      }
                    };

                    const statusBadgeClass =
                      order.status === 'delivered'
                        ? 'badge-success'
                        : order.status === 'cancelled'
                          ? 'badge-error'
                          : 'badge-warning';

                    return (
                      <div key={order.id} className="border border-luxury-200 rounded-lg p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-medium text-luxury-900">
                              Order #{order.id?.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-sm text-luxury-500">
                              {order.items?.length} items - ₹{order.total?.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className={`badge ${statusBadgeClass}`}>{order.status}</span>

                            {/* Status update buttons */}
                            <div className="flex flex-wrap justify-end gap-2">
                              {STATUS_OPTIONS.map((s) => {
                                const isActive = order.status === s;
                                const disabled = isActive || order.status === 'cancelled';

                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => handleUpdateOrderStatus(order.id, s)}
                                    className={`px-3 py-1 rounded-lg text-sm border transition ${
                                      isActive
                                        ? 'border-gold-500 text-gold-700 bg-luxury-50'
                                        : 'border-luxury-200 text-luxury-700 hover:bg-luxury-50'
                                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleCancelOrder}
                                disabled={!canCancel}
                                className={`px-3 py-1 rounded-lg text-sm border ${
                                  canCancel
                                    ? 'border-luxury-200 text-luxury-700 hover:bg-luxury-50'
                                    : 'border-luxury-200 text-luxury-400 cursor-not-allowed'
                                }`}
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={handleDeleteOrder}
                                className="px-3 py-1 rounded-lg text-sm border border-red-200 text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-luxury-200">
                          <h3 className="font-semibold text-luxury-900 mb-2">Customer Details</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-luxury-600">Name</p>
                              <p className="text-luxury-900 font-medium">{customerName || '—'}</p>
                            </div>

                            <div>
                              <p className="text-luxury-600">Mob No</p>
                              <p className="text-luxury-900 font-medium">{customerPhone || '—'}</p>
                            </div>

                            <div className="md:col-span-2">
                              <p className="text-luxury-600">Address</p>
                              <p className="text-luxury-900 font-medium">{customerAddress || '—'}</p>
                            </div>

                            <div>
                              <p className="text-luxury-600">Pincode</p>
                              <p className="text-luxury-900 font-medium">{customerPincode || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div>
                <h2 className="font-semibold text-luxury-900 mb-4">
                  Payments
                </h2>
                <div className="bg-luxury-50 border border-luxury-200 rounded-xl p-6 text-luxury-600">
                  Payments list is available inside the Revenue dashboard.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('revenue')}
                      className="btn-primary"
                    >
                      Go to Revenue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'revenue' && <RevenueAdmin />}
            {activeTab === 'reports' && <ReportsAdmin />}

            {activeTab === 'feedback' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-semibold text-luxury-900 text-xl">Customer Feedback</h2>
                  <button
                    onClick={fetchFeedbacks}
                    className="text-sm px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {feedbacks.length === 0 ? (
                  <div className="text-center py-12 bg-luxury-50 rounded-lg">
                    <p className="text-luxury-500">No customer feedback yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="bg-white border border-luxury-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-luxury-100">
                          <div>
                            <p className="text-xs text-luxury-500 font-semibold uppercase tracking-wide">Customer Name</p>
                            <p className="text-luxury-900 font-medium mt-1">{feedback.customerName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-luxury-500 font-semibold uppercase tracking-wide">Phone Number</p>
                            <a
                              href={`tel:${feedback.phoneNumber}`}
                              className="text-gold-500 font-medium mt-1 hover:text-gold-600"
                            >
                              {feedback.phoneNumber}
                            </a>
                          </div>
                          <div>
                            <p className="text-xs text-luxury-500 font-semibold uppercase tracking-wide">City</p>
                            <p className="text-luxury-900 font-medium mt-1">{feedback.city}</p>
                          </div>
                          <div>
                            <p className="text-xs text-luxury-500 font-semibold uppercase tracking-wide">Date</p>
                            <p className="text-luxury-900 font-medium mt-1">
                              {feedback.createdAt
                                ? new Date(feedback.createdAt.toDate()).toLocaleDateString('en-IN')
                                : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-luxury-500 font-semibold uppercase tracking-wide mb-2">Feedback</p>
                          <p className="text-luxury-700 leading-relaxed whitespace-pre-wrap bg-luxury-50 p-4 rounded border border-luxury-100">
                            {feedback.feedback}
                          </p>
                        </div>

                        {feedback.status && (
                          <div className="mt-4 flex items-center gap-2">
                            <span className="text-xs text-luxury-500 font-semibold uppercase">Status:</span>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              feedback.status === 'new'
                                ? 'bg-blue-100 text-blue-700'
                                : feedback.status === 'read'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Total Feedback:</strong> {feedbacks.length} responses received
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

