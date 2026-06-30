import { createContext, useContext, useState, useEffect } from 'react';
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

  return {
    ...p,
    productStatus: p.productStatus ?? (stockQuantity <= 0 ? 'unavailable' : 'available'),
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

  useEffect(() => {
    loadProducts();
  }, []);

  // Listen to warranties and assignments in real-time
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

    return () => {
      unsubWarranties();
      unsubAssignments();
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
      const updatedData = {
        ...productData,
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
    resolveWarrantyForProduct
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export default ProductContext;
