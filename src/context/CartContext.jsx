import { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal > 1000 ? 0 : 99;
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + shipping + tax;

  // Load cart from Firestore when user logs in
  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      // Load from localStorage when not logged in
      const localCart = localStorage.getItem('panstellia_cart');
      if (localCart) {
        setCartItems(JSON.parse(localCart));
      }
    }
  }, [user]);

  // Save to localStorage when not logged in
  useEffect(() => {
    if (!user) {
      localStorage.setItem('panstellia_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  const loadCart = async () => {
    setLoading(true);
    try {
      const cartDocRef = doc(db, 'carts', user.uid);
      const cartDoc = await getDoc(cartDocRef);
      
      if (cartDoc.exists()) {
        setCartItems(cartDoc.data().items || []);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
    setLoading(false);
  };

  const saveCart = async (items) => {
    if (user) {
      try {
        await setDoc(doc(db, 'carts', user.uid), {
          items,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    }
  };

  const addToCart = async (product, quantity = 1) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      const updatedItems = cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      setCartItems(updatedItems);
      await saveCart(updatedItems);
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
        category: product.category
      };
      const updatedItems = [...cartItems, newItem];
      setCartItems(updatedItems);
      await saveCart(updatedItems);
    }
  };

  const removeFromCart = async (productId) => {
    const updatedItems = cartItems.filter(item => item.id !== productId);
    setCartItems(updatedItems);
    
    if (user) {
      await saveCart(updatedItems);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    
    const updatedItems = cartItems.map(item =>
      item.id === productId
        ? { ...item, quantity }
        : item
    );
    setCartItems(updatedItems);
    await saveCart(updatedItems);
  };

  const clearCart = async () => {
    setCartItems([]);
    
    if (user) {
      try {
        await deleteDoc(doc(db, 'carts', user.uid));
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  };

  const value = {
    cartItems,
    loading,
    subtotal,
    shipping,
    tax,
    total,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
