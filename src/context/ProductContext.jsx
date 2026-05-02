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

  // Sample products for demo (will be replaced by Firestore data)
  const sampleProducts = [
    {
      id: '1',
      name: 'Ethereal Gold Pendant Necklace',
      description: 'A stunning 24K gold pendant featuring intricate filigree work. Perfect for bridal wear and special occasions.',
      price: 15999,
      originalPrice: 19999,
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
      category: 'Gold',
      ratings: 4.8,
      reviews: 124,
      featured: true,
      inStock: true
    },
    {
      id: '2',
      name: 'Pearl Strand Choker',
      description: 'Elegant freshwater pearl choker with sterling silver clasp. A timeless piece for party wear.',
      price: 4999,
      originalPrice: 6999,
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
      category: 'Silver',
      ratings: 4.5,
      reviews: 89,
      featured: true,
      inStock: true
    },
    {
      id: '3',
      name: 'Bridal Kundan Necklace Set',
      description: 'Exquisite handcrafted Kundan necklace with matching earrings. Traditional Rajasthani design.',
      price: 24999,
      originalPrice: 32999,
      image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800',
      category: 'Bridal',
      ratings: 4.9,
      reviews: 67,
      featured: true,
      inStock: true
    },
    {
      id: '4',
      name: 'Diamond Tennis Necklace',
      description: 'Stunning VS-quality diamond tennis necklace in 18K white gold. Statement piece for grand events.',
      price: 89999,
      originalPrice: 119999,
      image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800',
      category: 'Gold',
      ratings: 5.0,
      reviews: 45,
      featured: true,
      inStock: true
    },
    {
      id: '5',
      name: 'Silver Gemstone Pendant',
      description: 'Handcrafted sterling silver pendant with turquoise stone. Bohemian chic style.',
      price: 2499,
      originalPrice: 3999,
      image: 'https://images.unsplash.com/photo-1570308320678-1e4c8cf566db?w=800',
      category: 'Silver',
      ratings: 4.3,
      reviews: 156,
      featured: false,
      inStock: true
    },
    {
      id: '6',
      name: 'Rose Gold Layered Necklace',
      description: 'Trendy rose gold layered necklace set. Perfect for modern party looks.',
      price: 3999,
      originalPrice: 5999,
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
      category: 'Party Wear',
      ratings: 4.6,
      reviews: 203,
      featured: true,
      inStock: true
    },
    {
      id: '7',
      name: 'Temple Jewelry Necklace',
      description: 'Traditional South Indian temple jewelry with goddess motif. 22K gold plating.',
      price: 12999,
      originalPrice: 17999,
      image: 'https://images.unsplash.com/photo-1589128777076-f4a6712b1dc2?w=800',
      category: 'Bridal',
      ratings: 4.7,
      reviews: 98,
      featured: false,
      inStock: true
    },
    {
      id: '8',
      name: 'Crystal Drop Earrings Necklace',
      description: 'Elegant crystal drop necklace with matching earrings. Vintage Hollywood style.',
      price: 5999,
      originalPrice: 8999,
      image: 'https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=800',
      category: 'Party Wear',
      ratings: 4.4,
      reviews: 112,
      featured: false,
      inStock: true
    },
    {
      id: '9',
      name: 'Antique Necklace',
      description: 'Antique copper necklace with oxidation finish. Vintage inspired design.',
      price: 1999,
      originalPrice: 2999,
      image: 'https://images.unsplash.com/photo-1583391723448-a9323d2e6796?w=800',
      category: 'Silver',
      ratings: 4.2,
      reviews: 78,
      featured: false,
      inStock: true
    },
    {
      id: '10',
      name: 'Mangalsutra Traditional',
      description: 'Classic mangalsutra with black beads and gold pendant. Wedding essential.',
      price: 8999,
      originalPrice: 12999,
      image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800',
      category: 'Bridal',
      ratings: 4.8,
      reviews: 234,
      featured: true,
      inStock: true
    },
    {
      id: '11',
      name: 'Fancy Chain Necklace',
      description: 'Designer fancy chain with pendant. Italian inspired design.',
      price: 3499,
      originalPrice: 4999,
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
      category: 'Party Wear',
      ratings: 4.5,
      reviews: 167,
      featured: false,
      inStock: true
    },
    {
      id: '12',
      name: 'Gold Plated Chain',
      description: 'Affordable gold plated chain for daily wear. Anti-tarnish coating.',
      price: 1299,
      originalPrice: 1999,
      image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800',
      category: 'Gold',
      ratings: 4.1,
      reviews: 312,
      featured: false,
      inStock: true
    }
  ];

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
        // Use sample products if Firestore is empty
        setProducts(sampleProducts);
        // Optionally save sample products to Firestore
        await saveSampleProducts();
      }
    } catch (err) {
      console.log('Using sample products:', err);
      setProducts(sampleProducts);
    }
    setLoading(false);
  };

  const saveSampleProducts = async () => {
    try {
      for (const product of sampleProducts) {
        await setDoc(doc(db, 'products', product.id), {
          ...product,
          createdAt: getTimestamp()
        });
      }
    } catch (err) {
      console.error('Error saving sample products:', err);
    }
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
