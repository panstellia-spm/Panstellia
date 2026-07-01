import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { triggerRestockNotifications } from '../services/restockNotifications';

// Helper to get current timestamp
const getTimestamp = () => new Date().toISOString();

// Helper to normalize product data with default inventory fields and mock reviews/ratings
const normalizeProduct = (p) => {
  const stockQuantity = Number(p.stockQuantity ?? 0);
  const reservedQuantity = Number(p.reservedQuantity ?? 0);
  const availableQuantity = stockQuantity - reservedQuantity;
  const reorderThreshold = Number(p.reorderThreshold ?? 5);
  const price = Number(p.price ?? 0);
  
  let inventoryStatus = 'in_stock';
  if (stockQuantity <= 0) {
    inventoryStatus = 'out_of_stock';
  } else if (stockQuantity <= reorderThreshold) {
    inventoryStatus = 'low_stock';
  }

  // Generate stable mock rating and review count based on product ID/name if they aren't set
  let reviews = Number(p.reviews ?? 0);
  let ratings = Number(p.ratings ?? 0);
  
  if (!reviews || reviews === 0) {
    const charSum = (p.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    reviews = 10 + (charSum % 40); // 10 to 49 reviews (all below 50)
  }
  
  if (!ratings || ratings === 0) {
    const charSum = (p.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    ratings = 4.0 + ((charSum % 9) / 10); // 4.0 to 4.8
  }

  // Force 5-star rating for Elite Series / Lux Wear category
  if (p.category === 'Lux Wear' || p.category === 'Elite Series') {
    ratings = 5.0;
  }

  let createdAt = p.createdAt;
  if (createdAt && typeof createdAt.toDate === 'function') {
    createdAt = createdAt.toDate().toISOString();
  }
  let updatedAt = p.updatedAt;
  if (updatedAt && typeof updatedAt.toDate === 'function') {
    updatedAt = updatedAt.toDate().toISOString();
  }

  return {
    ...p,
    createdAt,
    updatedAt,
    productStatus: p.productStatus ?? 'available',
    stockQuantity,
    reservedQuantity,
    availableQuantity,
    reorderThreshold,
    reorderQuantity: Number(p.reorderQuantity ?? 10),
    inventoryStatus,
    inventoryValue: price * stockQuantity,
    skuCode: p.skuCode || '',
    serialNumber: p.serialNumber || '',
    metalType: p.metalType || p.category || '',
    stoneType: p.stoneType || p.primaryStone || '',
    weight: p.weight || '',
    certificationNumber: p.certificationNumber || '',
    collectionName: p.collectionName || '',
    reviews,
    ratings,
  };
};

const ProductContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [warranties, setWarranties] = useState([]);
  const [warrantyAssignments, setWarrantyAssignments] = useState([]);

  const [collectionsConfig, setCollectionsConfig] = useState([]);
  const [hideEmptyCollections, setHideEmptyCollections] = useState(false);
  const [quickLinksConfig, setQuickLinksConfig] = useState([]);

  const DEFAULT_COLLECTIONS = [
    { id: 'gold', name: 'Luxe Ring', category: 'Gold', enabled: true, order: 0, icon: 'Gem', image: 'https://res.cloudinary.com/omoikkzf/image/upload/v1782817101/ChatGPT_Image_Jun_30_2026_03_33_25_PM_rmxgvr.png' },
    { id: 'silver', name: 'Royal Bracelets', category: 'Silver', enabled: true, order: 1, icon: 'CircleDot', image: 'https://res.cloudinary.com/omoikkzf/image/upload/v1782817368/ChatGPT_Image_Jun_30_2026_03_35_17_PM_hylxo4.png' },
    { id: 'lux-wear', name: 'Elite Series', category: 'Lux Wear', enabled: true, order: 2, icon: 'Crown', image: 'https://res.cloudinary.com/omoikkzf/image/upload/v1782817401/ChatGPT_Image_Jun_30_2026_03_34_47_PM_ugzgsu.png' },
    { id: 'elegant-spark', name: 'Elegant Spark', category: 'Elegant Spark', enabled: true, order: 3, icon: 'Sparkles', image: 'https://res.cloudinary.com/omoikkzf/image/upload/v1782817390/ChatGPT_Image_Jun_30_2026_03_33_55_PM_smfn9p.png' },
    { id: 'party-wear', name: 'Piercings', category: 'Party Wear', enabled: true, order: 4, icon: 'Diamond', image: 'https://res.cloudinary.com/omoikkzf/image/upload/v1782817380/ChatGPT_Image_Jun_30_2026_03_34_11_PM_hpvfmm.png' }
  ];

  const DEFAULT_QUICK_LINKS = [
    { id: 'home', label: 'Home', to: '/', enabled: true, order: 0, placement: 'before', editable: false },
    { id: 'shop', label: 'Shop', to: '/products', enabled: true, order: 1, placement: 'before', editable: false },
    { id: 'about-us', label: 'About Us', to: '/about-us', enabled: true, order: 0, placement: 'after', editable: true },
    { id: 'careers', label: 'Careers', to: '/careers', enabled: true, order: 1, placement: 'after', editable: true }
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  // Listen to warranties, assignments, collections, and filters in real-time
  useEffect(() => {
    const unsubWarranties = onSnapshot(collection(db, 'warranties'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setWarranties(list);
    }, (err) => console.error('Error listing warranties:', err));

    const unsubAssignments = onSnapshot(collection(db, 'warranty_assignments'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setWarrantyAssignments(list);
    }, (err) => console.error('Error listing assignments:', err));

    const unsubCollections = onSnapshot(doc(db, 'system_settings', 'collections'), (snap) => {
      if (snap.exists() && snap.data().list) {
        setCollectionsConfig(snap.data().list);
      } else {
        setDoc(doc(db, 'system_settings', 'collections'), { list: DEFAULT_COLLECTIONS }, { merge: true })
          .catch(err => console.error('Failed to seed default collections in Firestore:', err));
        setCollectionsConfig(DEFAULT_COLLECTIONS);
      }
    }, (err) => console.error('Error listing collections config:', err));

    const unsubQuickLinks = onSnapshot(doc(db, 'system_settings', 'quickLinks'), (snap) => {
      if (snap.exists() && snap.data().list) {
        setQuickLinksConfig(snap.data().list);
      } else {
        setDoc(doc(db, 'system_settings', 'quickLinks'), { list: DEFAULT_QUICK_LINKS }, { merge: true })
          .catch(err => console.error('Failed to seed default quick links in Firestore:', err));
        setQuickLinksConfig(DEFAULT_QUICK_LINKS);
      }
    }, (err) => console.error('Error listing quick links config:', err));

    const unsubFilters = onSnapshot(doc(db, 'system_settings', 'filters'), (snap) => {
      if (snap.exists() && snap.data().hideEmptyCollections !== undefined) {
        setHideEmptyCollections(snap.data().hideEmptyCollections);
      }
    }, (err) => console.error('Error listing filters config:', err));

    return () => {
      unsubWarranties();
      unsubAssignments();
      unsubCollections();
      unsubFilters();
      unsubQuickLinks();
    };
  }, []);

  /**
   * Resolves the warranty for a specific product following assignment priority:
   * 1. Product specific ID override
   * 2. Variant ID specific override
   * 3. Collection assignment mapping
   * 4. Category assignment mapping (e.g. Lux Wear)
   * 5. Brand assignment mapping
   */
  const resolveWarrantyForProduct = (product, selectedColor = null, selectedSize = null) => {
    if (!product) return null;

    // Direct product level check (from database field on product)
    if (product.warrantyId) {
      const w = warranties.find(war => war.id === product.warrantyId && war.status === 'active');
      if (w) return w;
    }

    // 1. Specific Product Assignment Target (product ID)
    const prodAssign = warrantyAssignments.find(a => a.type === 'product' && a.target === product.id && a.enabled !== false);
    if (prodAssign) {
      const w = warranties.find(war => war.id === prodAssign.warrantyId && war.status === 'active');
      if (w) return w;
    }

    // 2. Specific Variant Assignment Target (e.g. prodId:color or prodId:size)
    if (selectedColor) {
      const varColorAssign = warrantyAssignments.find(a => a.type === 'variant' && a.target === `${product.id}:${selectedColor}` && a.enabled !== false);
      if (varColorAssign) {
        const w = warranties.find(war => war.id === varColorAssign.warrantyId && war.status === 'active');
        if (w) return w;
      }
    }
    if (selectedSize) {
      const varSizeAssign = warrantyAssignments.find(a => a.type === 'variant' && a.target === `${product.id}:${selectedSize}` && a.enabled !== false);
      if (varSizeAssign) {
        const w = warranties.find(war => war.id === varSizeAssign.warrantyId && war.status === 'active');
        if (w) return w;
      }
    }

    // 3. Collection assignment mapping
    if (product.collectionName || product.collection) {
      const collectionName = product.collectionName || product.collection;
      const collAssign = warrantyAssignments.find(a => a.type === 'collection' && a.target.trim().toLowerCase() === collectionName.trim().toLowerCase() && a.enabled !== false);
      if (collAssign) {
        const w = warranties.find(war => war.id === collAssign.warrantyId && war.status === 'active');
        if (w) return w;
      }
    }

    // 4. Category assignment mapping
    if (product.category) {
      const catAssign = warrantyAssignments.find(a => a.type === 'category' && a.target.trim().toLowerCase() === product.category.trim().toLowerCase() && a.enabled !== false);
      if (catAssign) {
        const w = warranties.find(war => war.id === catAssign.warrantyId && war.status === 'active');
        if (w) return w;
      }
    }

    // 5. Brand assignment mapping
    if (product.brandName || product.brand) {
      const brandName = product.brandName || product.brand;
      const brandAssign = warrantyAssignments.find(a => a.type === 'brand' && a.target.trim().toLowerCase() === brandName.trim().toLowerCase() && a.enabled !== false);
      if (brandAssign) {
        const w = warranties.find(war => war.id === brandAssign.warrantyId && war.status === 'active');
        if (w) return w;
      }
    }

    return null;
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const productsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const normalized = productsData.map(normalizeProduct);
        setProducts(normalized);
      } else {
        // Firestore is empty - show empty products array
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
      setError(err.message);
    }
    setLoading(false);
  };


  const addProduct = async (product) => {
    try {
      const newProduct = {
        // Default for backward compatibility.
        productStatus: product.productStatus ?? 'available',
        ...product,
        createdAt: getTimestamp(),
      };

      const normalized = normalizeProduct(newProduct);
      await setDoc(doc(db, 'products', product.id), normalized);

      setProducts(prev => [normalized, ...prev]);
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      const existingProduct = products.find(p => p.id === id) || {};
      
      // Explicitly extract and normalize createdAt to prevent deletion or timestamp/string sorting mismatch
      let createdAt = productData.createdAt || existingProduct.createdAt;
      if (createdAt && typeof createdAt.toDate === 'function') {
        createdAt = createdAt.toDate().toISOString();
      }
      if (!createdAt) {
        createdAt = getTimestamp();
      }

      const updatedData = {
        ...productData,
        createdAt,
        updatedAt: getTimestamp()
      };
      
      const normalizedMerged = normalizeProduct({ ...existingProduct, ...updatedData });
      await setDoc(doc(db, 'products', id), normalizedMerged, { merge: true });
      
      setProducts(prev =>
        prev.map((p) => (p.id === id ? normalizedMerged : p))
      );
      
      // Check if product was restocked
      if ((existingProduct.stockQuantity || 0) <= 0 && normalizedMerged.stockQuantity > 0) {
        triggerRestockNotifications(id, normalizedMerged).catch(err => {
          console.error("Failed to trigger restock notifications:", err);
        });
      }

      return { success: true };

    } catch (err) {
      throw new Error(err.message);
    }
  };

  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const getProductById = (id) => {
    return products.find(p => p.id === id);
  };

  const getProductsByCategory = (category) => {
    return products.filter(p => p.category === category);
  };

  const getFeaturedProducts = () => {
    return products.filter(p => p.featured);
  };

  const searchProducts = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.description.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  };

  const filterProducts = ({ category, minPrice, maxPrice, sortBy }) => {
    let filtered = [...products];
    
    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }
    
    if (minPrice) {
      filtered = filtered.filter(p => p.price >= minPrice);
    }
    
    if (maxPrice) {
      filtered = filtered.filter(p => p.price <= maxPrice);
    }
    
    if (sortBy) {
      switch (sortBy) {
        case 'price-low':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          filtered.sort((a, b) => b.ratings - a.ratings);
          break;
        case 'newest':
          filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          break;
        default:
          break;
      }
    }
    
    return filtered;
  };

  const collections = useMemo(() => {
    const productCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
    const baseList = collectionsConfig.length > 0 ? collectionsConfig : DEFAULT_COLLECTIONS;
    const mergedList = [...baseList];

    productCategories.forEach(cat => {
      const exists = mergedList.some(c => c.category?.toLowerCase() === cat.toLowerCase());
      if (!exists) {
        const cleanId = cat.toLowerCase().replace(/[^a-z0-9]/g, '-');
        mergedList.push({
          id: cleanId,
          name: cat,
          category: cat,
          enabled: true,
          order: mergedList.length,
          icon: 'Gem',
          image: '',
          updatedAt: new Date().toISOString()
        });
      }
    });

    return mergedList.map(col => {
      const count = products.filter(p => p.category === col.category && (p.productStatus || 'available') === 'available').length;
      return {
        ...col,
        count,
        status: col.enabled ? 'Visible' : 'Hidden'
      };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [products, collectionsConfig]);

  // visibleCollections: admin's toggle is the ONLY control. If enabled=true, always show it.
  // Product count / hideEmptyCollections does NOT gate this — that only affects the Products page sidebar.
  const visibleCollections = useMemo(() => {
    return collections.filter(col => col.enabled === true || col.enabled === undefined);
  }, [collections]);

  // For the Products page filter sidebar only — respects hideEmptyCollections setting
  const visibleCollectionsForFilter = useMemo(() => {
    return collections.filter(col => {
      if (!col.enabled) return false;
      if (hideEmptyCollections && col.count === 0) return false;
      return true;
    });
  }, [collections, hideEmptyCollections]);

  // Quick links – enabled items, sorted by order within each placement group
  const quickLinks = useMemo(() => {
    const base = quickLinksConfig.length > 0 ? quickLinksConfig : DEFAULT_QUICK_LINKS;
    return base.filter(l => l.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [quickLinksConfig]);

  const updateCollectionConfig = async (updatedList) => {
    try {
      const cleanList = updatedList.map(({ count, status, ...rest }) => rest);
      // Optimistic update – reflect immediately without waiting for Firestore snapshot
      setCollectionsConfig(cleanList);
      await setDoc(doc(db, 'system_settings', 'collections'), { list: cleanList }, { merge: true });
      return { success: true };
    } catch (err) {
      console.error('Error saving collections configuration:', err);
      throw new Error(err.message);
    }
  };

  const updateQuickLinksConfig = async (updatedList) => {
    try {
      const cleanList = updatedList.map(l => ({ ...l }));
      // Optimistic update
      setQuickLinksConfig(cleanList);
      await setDoc(doc(db, 'system_settings', 'quickLinks'), { list: cleanList }, { merge: true });
      return { success: true };
    } catch (err) {
      console.error('Error saving quick links configuration:', err);
      throw new Error(err.message);
    }
  };

  const value = {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getProductsByCategory,
    getFeaturedProducts,
    searchProducts,
    filterProducts,
    loadProducts,
    warranties,
    warrantyAssignments,
    resolveWarrantyForProduct,
    collections,
    visibleCollections,
    visibleCollectionsForFilter,
    updateCollectionConfig,
    quickLinks,
    quickLinksConfig,
    updateQuickLinksConfig
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export default ProductContext;
