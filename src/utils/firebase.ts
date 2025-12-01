import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA7kU5OhdJJupgC-0HsvcZIUqIFoVWifOk",
  authDomain: "duoloop-f22ab.firebaseapp.com",
  projectId: "duoloop-f22ab",
  storageBucket: "duoloop-f22ab.firebasestorage.app",
  messagingSenderId: "464064456296",
  appId: "1:464064456296:web:23ff55de13ef111649bddd",
  measurementId: "G-0RM2L88H2M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

