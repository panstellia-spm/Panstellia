import { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load wishlist from Firestore when user logs in
  useEffect(() => {
    if (user) {
      loadWishlist();
    } else {
      // Load from localStorage when not logged in
      const localWishlist = localStorage.getItem('panstellia_wishlist');
      if (localWishlist) {
        setWishlistItems(JSON.parse(localWishlist));
      }
    }
  }, [user]);

  // Save to localStorage when not logged in
  useEffect(() => {
    if (!user) {
      localStorage.setItem('panstellia_wishlist', JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, user]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const wishlistDocRef = doc(db, 'wishlist', user.uid);
      const wishlistDoc = await getDoc(wishlistDocRef);
      
      if (wishlistDoc.exists()) {
        setWishlistItems(wishlistDoc.data().items || []);
      } else {
        setWishlistItems([]);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
    setLoading(false);
  };

  const saveWishlist = async (items) => {
    if (user) {
      try {
        await setDoc(doc(db, 'wishlist', user.uid), {
          items,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error saving wishlist:', error);
      }
    }
  };

  const addToWishlist = async (product) => {
    const existingItem = wishlistItems.find(item => item.id === product.id);
    
    if (existingItem) {
      return; // Already in wishlist
    }
    
    const newItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category
    };
    const updatedItems = [...wishlistItems, newItem];
    setWishlistItems(updatedItems);
    
    if (user) {
      await saveWishlist(updatedItems);
    }
  };

  const removeFromWishlist = async (productId) => {
    const updatedItems = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(updatedItems);
    
    if (user) {
      await saveWishlist(updatedItems);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const clearWishlist = async () => {
    setWishlistItems([]);
    
    if (user) {
      try {
        await deleteDoc(doc(db, 'wishlist', user.uid));
      } catch (error) {
        console.error('Error clearing wishlist:', error);
      }
    }
  };

  const value = {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;
