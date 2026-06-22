import { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { triggerRestockNotifications } from '../services/restockNotifications';

// Helper to get current timestamp
const getTimestamp = () => new Date().toISOString();

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

  useEffect(() => {
    loadProducts();
  }, []);

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

        // Helper to normalize product data with default inventory fields
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
          };
        };

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

      // Normalize helper
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
        };
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
        };
      };

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
    loadProducts
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export default ProductContext;
