import { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

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
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
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
        ...product,
        createdAt: getTimestamp()
      };
      await setDoc(doc(db, 'products', product.id), newProduct);
      setProducts(prev => [newProduct, ...prev]);
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      await setDoc(doc(db, 'products', id), {
        ...productData,
        updatedAt: getTimestamp()
      }, { merge: true });
      
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...productData } : p));
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
