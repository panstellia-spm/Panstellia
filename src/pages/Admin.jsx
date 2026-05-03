import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Plus, Edit, Trash2, DollarSign, ShoppingBag, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { db } from '../services/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { getDirectImageUrl } from '../utils/imageUtils';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  
  const [activeTab, setActiveTab] = useState('products');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    image: '',
    category: 'Gold',
    featured: false,
    inStock: true
  });

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    } catch (error) {
      setOrders([
        {
          id: 'demo-1',
          items: [{ name: 'Gold Pendant', price: 15999, quantity: 1 }],
          total: 16799,
          status: 'processing',
          createdAt: new Date()
        }
      ]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        ...productForm,
        price: parseInt(productForm.price),
        originalPrice: productForm.originalPrice ? parseInt(productForm.originalPrice) : null,
        id: editingProduct?.id || `prod_${Date.now()}`
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        originalPrice: '',
        image: '',
        category: 'Gold',
        featured: false,
        inStock: true
      });
    } catch (error) {
      console.error('Error saving product:', error);
    }

    setLoading(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      image: product.image,
      category: product.category,
      featured: product.featured,
      inStock: product.inStock
    });
    setShowProductForm(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const categories = ['Gold', 'Silver', 'Lux Wear', 'Party Wear'];
  
  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: orders.filter(o => o.status === 'processing').length
  };

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8">Admin Panel</h1>

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
                        category: 'Gold',
                        featured: false,
                        inStock: true
                      });
                    }}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </button>
                </div>

                {/* Product Form Modal */}
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
                        <div>
                          <label className="block text-sm font-medium mb-1">Image URL</label>
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
                          <label className="block text-sm font-medium mb-1">Category</label>
                          <select
                            name="category"
                            value={productForm.category}
                            onChange={handleInputChange}
                            className="input-field"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
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

                {/* Products Table */}
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
                      {products.map(product => (
                        <tr key={product.id}>
                          <td className="px-4 py-3">
                            <img
                              src={getDirectImageUrl(product.image)}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/48?text=No+Image';
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-luxury-900">{product.name}</td>
                          <td className="px-4 py-3">
                            <span className="badge badge-gold">{product.category}</span>
                          </td>
                          <td className="px-4 py-3 text-luxury-900">
                            ₹{product.price?.toLocaleString()}
                          </td>
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
                  {orders.map(order => (
                    <div key={order.id} className="border border-luxury-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-luxury-900">
                            Order #{order.id?.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-sm text-luxury-500">
                            {order.items?.length} items - ₹{order.total?.toLocaleString()}
                          </p>
                        </div>
                        <span className={`badge ${
                          order.status === 'delivered' ? 'badge-success' :
                          order.status === 'cancelled' ? 'badge-error' :
                          'badge-warning'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
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
