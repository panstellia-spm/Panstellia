import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4CeZq6LnfSYuzUMR_lqu7XwPz7EWdi_M",
  authDomain: "panstellia-65653.firebaseapp.com",
  projectId: "panstellia-65653",
  storageBucket: "panstellia-65653.firebasestorage.app",
  messagingSenderId: "642200822148",
  appId: "1:642200822148:web:3f2d443c6edcf91b4a3dd1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Product: "${data.name}"`);
      console.log(`- Image: "${data.image}"`);
      console.log(`- Images:`, data.images);
      console.log('---');
    });
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

run();
