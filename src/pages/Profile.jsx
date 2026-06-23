import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, MapPin, Package, Heart, Plus, Edit3, Trash2, CheckCircle2, 
  Map, Star, Phone, Mail, ChevronRight, ShoppingBag, X, Info, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import SEOHelmet from '../utils/seoHelmet';
import { getCategoryLabel } from '../utils/categoryLabels';
import { toast } from 'react-toastify';
import { StatusBadge } from '../components/UI/OrderTimeline';

export default function ProfilePage() {
  const { 
    user, userData, addAddress, updateAddress, deleteAddress, setDefaultAddress 
  } = useAuth();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile'); // profile, addresses, orders, wishlist
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addedItems, setAddedItems] = useState({});

  // Address Modal/Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null); // null means adding new
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    email: '',
    address: '',
    apartment: '',
    landmark: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    isDefault: false
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/profile');
    }
  }, [user, navigate]);

  // Fetch Orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setOrdersLoading(true);
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(data);
      } catch (err) {
        console.error('Error fetching orders in profile:', err);
      } finally {
        setOrdersLoading(false);
      }
    };

    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [user, activeTab]);

  if (!user) return null;

  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: 'Home',
      fullName: user.displayName || '',
      phone: '',
      email: user.email || '',
      address: '',
      apartment: '',
      landmark: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      isDefault: (userData?.addresses || []).length === 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddressId(addr._id);
    setAddressForm({
      label: addr.label || 'Home',
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      email: addr.email || '',
      address: addr.address || '',
      apartment: addr.apartment || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      country: addr.country || 'India',
      pincode: addr.pincode || '',
      isDefault: addr.isDefault || false
    });
    setIsModalOpen(true);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!addressForm.fullName || !addressForm.phone || !addressForm.address || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, addressForm);
        toast.success('Address updated successfully');
      } else {
        await addAddress(addressForm);
        toast.success('Address added successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving address:', err);
      toast.error('Failed to save address');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await deleteAddress(id);
        toast.info('Address deleted');
      } catch (err) {
        toast.error('Failed to delete address');
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      toast.success('Default address updated');
    } catch (err) {
      toast.error('Failed to set default address');
    }
  };

  const handleUseAddress = async (id) => {
    try {
      await setDefaultAddress(id);
      toast.success('Default address updated! Ready for checkout.');
    } catch (err) {
      toast.error('Failed to set address');
    }
  };

  const handleAddToCart = async (product) => {
    setAddedItems(prev => ({ ...prev, [product.id]: 'adding' }));
    try {
      await addToCart(product);
      setAddedItems(prev => ({ ...prev, [product.id]: 'added' }));
      toast.success('Added to cart!', { position: 'bottom-right' });
      setTimeout(() => {
        removeFromWishlist(product.id);
        setAddedItems(prev => {
          const newState = { ...prev };
          delete newState[product.id];
          return newState;
        });
      }, 1500);
    } catch (error) {
      setAddedItems(prev => {
        const newState = { ...prev };
        delete newState[product.id];
        return newState;
      });
      toast.error('Failed to add to cart');
    }
  };

  const savedAddresses = userData?.addresses || [];

  return (
    <div className="min-h-screen bg-luxury-50 py-12">
      <SEOHelmet 
        title="My Profile | Panstellia"
        description="Manage your Panstellia account details, saved addresses, orders, and wishlist."
        keywords="profile, saved addresses, orders, wishlist"
        canonical="https://panstellia.com/profile"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-8">
        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8 text-center md:text-left">
          My Account
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-luxury-100 p-6 space-y-1.5">
              
              <div className="flex items-center gap-3 pb-6 border-b border-luxury-100 mb-4">
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 font-bold text-lg">
                  {user.displayName?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-serif font-bold text-luxury-900 truncate">
                    {user.displayName || 'Luxury Customer'}
                  </p>
                  <p className="text-xs text-luxury-500 truncate">{user.email}</p>
                </div>
              </div>

              {[
                { key: 'profile', label: 'Personal Details', icon: User },
                { key: 'addresses', label: 'Saved Addresses', icon: MapPin },
                { key: 'orders', label: 'My Orders', icon: Package },
                { key: 'wishlist', label: 'Wishlist', icon: Heart }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-md'
                      : 'text-luxury-600 hover:bg-luxury-50 hover:text-gold-650'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                  {tab.key === 'wishlist' && wishlistItems.length > 0 && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      activeTab === 'wishlist' ? 'bg-white text-gold-600' : 'bg-gold-100 text-gold-700'
                    }`}>
                      {wishlistItems.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Pane */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md border border-luxury-100 p-6 min-h-[400px]">
              
              {/* Tab 1: Profile / Personal Details */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="font-serif text-xl font-bold text-luxury-900 border-b border-luxury-100 pb-3">
                    Personal Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-luxury-50 rounded-xl border border-luxury-100/50">
                      <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Full Name</p>
                      <p className="mt-1 text-sm font-bold text-luxury-900">{user.displayName || '—'}</p>
                    </div>
                    <div className="p-4 bg-luxury-50 rounded-xl border border-luxury-100/50">
                      <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Email Address</p>
                      <p className="mt-1 text-sm font-bold text-luxury-900">{user.email || '—'}</p>
                    </div>
                    <div className="p-4 bg-luxury-50 rounded-xl border border-luxury-100/50">
                      <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Account Role</p>
                      <p className="mt-1 text-sm font-bold text-gold-600 uppercase tracking-wider">
                        {userData?.role || 'User'}
                      </p>
                    </div>
                    <div className="p-4 bg-luxury-50 rounded-xl border border-luxury-100/50">
                      <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Member Since</p>
                      <p className="mt-1 text-sm font-bold text-luxury-900">
                        {user.metadata?.creationTime
                          ? new Date(user.metadata.creationTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Saved Addresses */}
              {activeTab === 'addresses' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-luxury-100 pb-3">
                    <h2 className="font-serif text-xl font-bold text-luxury-900">
                      Saved Addresses
                    </h2>
                    <button
                      onClick={handleOpenAddModal}
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Address
                    </button>
                  </div>

                  {savedAddresses.length === 0 ? (
                    <div className="text-center py-12">
                      <Map className="w-12 h-12 text-luxury-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-luxury-600">No saved addresses found</p>
                      <p className="text-xs text-luxury-400 mt-1">Add a shipping address to speed up your checkout process.</p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-4 border border-gold-500 text-gold-600 px-4 py-2 rounded-lg text-xs hover:bg-gold-50 transition-colors font-semibold"
                      >
                        Add Your First Address
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {savedAddresses.map((addr) => (
                        <div 
                          key={addr._id}
                          className={`relative rounded-xl border p-5 transition-all flex flex-col justify-between ${
                            addr.isDefault 
                              ? 'border-gold-500 bg-gold-50/5 shadow-sm' 
                              : 'border-luxury-100 hover:border-luxury-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-0.5 bg-luxury-900 text-white rounded text-[10px] uppercase font-bold tracking-wider">
                                {addr.label || 'Home'}
                              </span>
                              {addr.isDefault && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gold-600 bg-gold-100 px-1.5 py-0.5 rounded">
                                  <Star className="w-3 h-3 fill-current" /> Default
                                </span>
                              )}
                            </div>

                            <div className="text-sm space-y-1 text-luxury-700 mb-6">
                              <p className="font-bold text-luxury-900 text-base">{addr.fullName}</p>
                              {addr.phone && (
                                <p className="flex items-center gap-1.5 text-xs text-luxury-500">
                                  <Phone className="w-3.5 h-3.5 text-luxury-400" /> {addr.phone}
                                </p>
                              )}
                              {addr.email && (
                                <p className="flex items-center gap-1.5 text-xs text-luxury-500">
                                  <Mail className="w-3.5 h-3.5 text-luxury-400" /> {addr.email}
                                </p>
                              )}
                              
                              <p className="pt-2 text-sm leading-relaxed text-luxury-800">
                                {addr.address}
                                {addr.apartment && <span className="block">{addr.apartment}</span>}
                                {addr.landmark && <span className="block text-xs text-luxury-500">Landmark: {addr.landmark}</span>}
                                <span className="block">
                                  {[addr.city, addr.state, addr.country].filter(Boolean).join(', ')} - {addr.pincode}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-3 border-t border-luxury-50 flex items-center justify-between gap-2 flex-wrap text-xs">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(addr)}
                                className="text-luxury-600 hover:text-gold-600 flex items-center gap-1 font-semibold"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(addr._id)}
                                className="text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>

                            <div className="flex gap-2">
                              {!addr.isDefault && (
                                <button
                                  onClick={() => handleSetDefault(addr._id)}
                                  className="text-gold-600 hover:text-gold-700 font-bold"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                onClick={() => handleUseAddress(addr._id)}
                                className="bg-luxury-900 text-white px-2.5 py-1 rounded hover:bg-gold-600 transition-colors font-bold text-[11px]"
                              >
                                Use This Address
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Orders */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <h2 className="font-serif text-xl font-bold text-luxury-900 border-b border-luxury-100 pb-3">
                    My Orders
                  </h2>

                  {ordersLoading ? (
                    <div className="space-y-4">
                      {Array(2).fill(0).map((_, i) => (
                        <div key={i} className="bg-luxury-50 rounded-xl p-4 border border-luxury-100">
                          <div className="skeleton h-4 w-32 mb-2" />
                          <div className="skeleton h-8 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-luxury-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-luxury-600">No orders placed yet</p>
                      <Link to="/products" className="mt-4 btn-primary inline-flex text-xs">
                        Start Shopping
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div 
                          key={order.id} 
                          className="border border-luxury-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="bg-luxury-50/50 px-4 py-3 flex items-center justify-between border-b border-luxury-100 flex-wrap gap-2 text-xs text-luxury-500 font-semibold">
                            <div>
                              <span>Order </span>
                              <span className="font-mono text-luxury-800 font-bold uppercase">#{order.id.slice(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span>
                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })}
                              </span>
                              <StatusBadge status={order.status} />
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="space-y-3">
                              {(order.items || []).slice(0, 2).map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                  <img 
                                    src={getOptimizedImageUrl(item.image, { width: 120 })} 
                                    alt={item.name} 
                                    className="w-12 h-12 object-cover rounded-lg border border-luxury-100 flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-luxury-900 truncate">{item.name}</p>
                                    <p className="text-[10px] text-luxury-500">Qty: {item.quantity}</p>
                                  </div>
                                  <p className="text-xs font-bold text-luxury-900">₹{item.price?.toLocaleString()}</p>
                                </div>
                              ))}
                              {order.items?.length > 2 && (
                                <p className="text-[10px] text-luxury-400">+{order.items.length - 2} more item(s)</p>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-luxury-50 flex items-center justify-between">
                              <span className="text-sm font-bold text-luxury-900">Total: ₹{order.total?.toLocaleString()}</span>
                              <Link 
                                to={`/order/${order.id}`}
                                className="text-xs text-gold-600 hover:text-gold-700 font-bold flex items-center gap-0.5"
                              >
                                View Details <ChevronRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Wishlist */}
              {activeTab === 'wishlist' && (
                <div className="space-y-6">
                  <h2 className="font-serif text-xl font-bold text-luxury-900 border-b border-luxury-100 pb-3">
                    My Wishlist ({wishlistItems.length})
                  </h2>

                  {wishlistItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="w-12 h-12 text-luxury-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-luxury-600">Your wishlist is empty</p>
                      <Link to="/products" className="mt-4 btn-primary inline-flex text-xs">
                        Browse Products
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {wishlistItems.map(item => (
                        <div key={item.id} className="bg-white rounded-xl border border-luxury-100 overflow-hidden hover:shadow-md transition-shadow">
                          <Link to={`/product/${item.id}`}>
                            <div className="relative overflow-hidden aspect-[3/4]">
                              <img
                                src={getOptimizedImageUrl(item.image, { width: 400, quality: 75 })}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </Link>
                          <div className="p-4">
                            <p className="text-[10px] text-gold-600 font-bold uppercase tracking-wider">
                              {getCategoryLabel(item.category)}
                            </p>
                            <Link to={`/product/${item.id}`}>
                              <h3 className="mt-1 text-xs text-luxury-950 font-bold line-clamp-2 hover:text-gold-650 leading-snug">
                                {item.name}
                              </h3>
                            </Link>
                            <p className="mt-1 text-sm font-bold text-luxury-900">
                              ₹{item.price?.toLocaleString()}
                            </p>
                            <div className="mt-3.5 flex gap-2">
                              <button
                                onClick={() => handleAddToCart(item)}
                                disabled={addedItems[item.id]}
                                className={`flex-1 text-[10px] py-1.5 flex items-center justify-center font-bold tracking-wide rounded-lg transition-all ${
                                  addedItems[item.id] === 'added'
                                    ? 'bg-green-500 text-white'
                                    : 'btn-primary'
                                }`}
                              >
                                {addedItems[item.id] === 'added' ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Added!
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                                    {addedItems[item.id] === 'adding' ? 'Adding...' : 'Add to Cart'}
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  removeFromWishlist(item.id);
                                  toast.info('Removed from wishlist');
                                }}
                                className="p-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50"
                              >
                                <Heart className="w-3.5 h-3.5 fill-current" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-luxury-100">
            
            <div className="flex items-center justify-between p-6 border-b border-luxury-100">
              <h3 className="font-serif text-lg font-bold text-luxury-900">
                {editingAddressId ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-luxury-50 text-luxury-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Label */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    Address Label *
                  </label>
                  <select
                    value={addressForm.label}
                    onChange={(e) => setAddressForm(p => ({ ...p, label: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Parents">Parents</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* If label is other, let them input */}
                {addressForm.label === 'Other' && (
                  <div>
                    <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                      Custom Label Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vacation Home"
                      value={addressForm.customLabel || ''}
                      onChange={(e) => setAddressForm(p => ({ ...p, customLabel: e.target.value }))}
                      className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 XXXXX XXXXX"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={addressForm.email}
                  onChange={(e) => setAddressForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>

              {/* Address Line */}
              <div>
                <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                  Address Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Street Address, Building Name"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Apartment */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    Apartment / Flat / Suite
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apt 4B, 3rd Floor"
                    value={addressForm.apartment}
                    onChange={(e) => setAddressForm(p => ({ ...p, apartment: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near City Mall"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm(p => ({ ...p, landmark: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm(p => ({ ...p, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm(p => ({ ...p, pincode: e.target.value }))}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-[11px] font-bold text-luxury-700 uppercase tracking-wider mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.country}
                  onChange={(e) => setAddressForm(p => ({ ...p, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>

              {/* isDefault checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm(p => ({ ...p, isDefault: e.target.checked }))}
                  disabled={editingAddressId && savedAddresses.find(a => a._id === editingAddressId)?.isDefault} // Can't un-default the only default address
                  className="w-4 h-4 text-gold-500 border-luxury-200 rounded focus:ring-gold-500"
                />
                <label htmlFor="isDefault" className="text-xs font-semibold text-luxury-700 cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              <div className="pt-4 border-t border-luxury-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-luxury-200 text-luxury-600 rounded-lg text-sm hover:bg-luxury-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-6 text-sm"
                >
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
