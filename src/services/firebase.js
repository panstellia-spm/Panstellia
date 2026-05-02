// Firebase configuration
// Replace these values with your Firebase project configuration
// Get them from: https://console.firebase.google.com/project/YOUR_PROJECT/settings/general

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA4CeZq6LnfSYuzUMR_lqu7XwPz7EWdi_M",
  authDomain: "panstellia-65653.firebaseapp.com",
  projectId: "panstellia-65653",
  storageBucket: "panstellia-65653.firebasestorage.app",
  messagingSenderId: "642200822148",
  appId: "1:642200822148:web:3f2d443c6edcf91b4a3dd1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export app for other Firebase features
export default app;
