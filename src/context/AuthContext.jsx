import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  // Tracks when auth state is in transition (login/logout/refresh).
  // AdminRoute waits for this to be false before making access decisions,
  // preventing the race condition where isAdmin is still false when navigate('/admin') fires.
  const [roleLoading, setRoleLoading] = useState(true);

  // Check for admin emails
  const adminEmails = ['support@panstellia.com', 'admin@panstellia.com']; // Add your admin email here

  const hasPermission = (allowedRoles) => {
    if (!user) return false;
    if (adminEmails.includes(user.email)) return true;
    return allowedRoles.includes(role);
  };

  useEffect(() => {
    let unsubscribeUserSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Signal that role is being resolved — guards must wait
      setRoleLoading(true);
      setUser(currentUser);
      
      if (unsubscribeUserSnapshot) {
        unsubscribeUserSnapshot();
        unsubscribeUserSnapshot = null;
      }

      if (currentUser) {
        // Set up real-time listener for user data in Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribeUserSnapshot = onSnapshot(userDocRef, (docSnap) => {
          const isEmailAdmin = adminEmails.includes(currentUser.email);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            const userRole = data.role || (data.isAdmin ? 'admin' : 'user');
            setRole(userRole);
            setIsAdmin(isEmailAdmin || userRole !== 'user');
          } else {
            setUserData(null);
            setRole(isEmailAdmin ? 'admin' : 'user');
            setIsAdmin(isEmailAdmin);
          }
          setRoleLoading(false);
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user document changes:", error);
          const isEmailAdmin = adminEmails.includes(currentUser.email);
          setRole(isEmailAdmin ? 'admin' : 'user');
          setIsAdmin(isEmailAdmin);
          setRoleLoading(false);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setRole('user');
        setIsAdmin(false);
        setRoleLoading(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserSnapshot) {
        unsubscribeUserSnapshot();
      }
    };
  }, []);

  const addAddress = async (newAddress) => {
    if (!user) throw new Error('Authentication required');
    const userDocRef = doc(db, 'users', user.uid);
    const currentAddresses = userData?.addresses || [];
    
    const addressId = Math.random().toString(36).substring(2, 11);
    const addressWithId = {
      ...newAddress,
      _id: addressId,
      isDefault: newAddress.isDefault || currentAddresses.length === 0
    };

    let updatedAddresses = [];
    if (addressWithId.isDefault) {
      updatedAddresses = currentAddresses.map(addr => ({ ...addr, isDefault: false }));
      updatedAddresses.push(addressWithId);
    } else {
      updatedAddresses = [...currentAddresses, addressWithId];
    }

    await updateDoc(userDocRef, {
      addresses: updatedAddresses,
      updatedAt: serverTimestamp()
    });
  };

  const updateAddress = async (addressId, updatedAddress) => {
    if (!user) throw new Error('Authentication required');
    const userDocRef = doc(db, 'users', user.uid);
    const currentAddresses = userData?.addresses || [];

    let updatedAddresses = currentAddresses.map(addr => {
      if (addr._id === addressId) {
        return { ...addr, ...updatedAddress, _id: addressId };
      }
      if (updatedAddress.isDefault) {
        return { ...addr, isDefault: false };
      }
      return addr;
    });

    const hasDefault = updatedAddresses.some(addr => addr.isDefault);
    if (!hasDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    await updateDoc(userDocRef, {
      addresses: updatedAddresses,
      updatedAt: serverTimestamp()
    });
  };

  const deleteAddress = async (addressId) => {
    if (!user) throw new Error('Authentication required');
    const userDocRef = doc(db, 'users', user.uid);
    const currentAddresses = userData?.addresses || [];

    const addressToDelete = currentAddresses.find(addr => addr._id === addressId);
    let updatedAddresses = currentAddresses.filter(addr => addr._id !== addressId);

    if (addressToDelete?.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    await updateDoc(userDocRef, {
      addresses: updatedAddresses,
      updatedAt: serverTimestamp()
    });
  };

  const setDefaultAddress = async (addressId) => {
    if (!user) throw new Error('Authentication required');
    const userDocRef = doc(db, 'users', user.uid);
    const currentAddresses = userData?.addresses || [];

    const updatedAddresses = currentAddresses.map(addr => ({
      ...addr,
      isDefault: addr._id === addressId
    }));

    await updateDoc(userDocRef, {
      addresses: updatedAddresses,
      updatedAt: serverTimestamp()
    });
  };


  const signup = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        role: 'user',
        isAdmin: adminEmails.includes(email),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Determine admin status immediately so Login.jsx can route without waiting for onAuthStateChanged
      const isAdminUser = adminEmails.includes(email);
      return { success: true, user: userCredential.user, isAdmin: isAdminUser };
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists, if not create it
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document for Google sign-in
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: 'user',
          isAdmin: adminEmails.includes(user.email),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Determine admin status immediately so Login.jsx can route without waiting for onAuthStateChanged
      const isAdminUser = adminEmails.includes(user.email);
      return { success: true, user, isAdmin: isAdminUser };
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setIsAdmin(false);
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const value = {
    user,
    userData,
    loading,
    roleLoading,
    role,
    isAdmin,
    hasPermission,
    signup,
    login,
    signInWithGoogle,
    logout,
    resetPassword,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

