import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BL6EVQpO6PX5QxulmF3eLjQr-vTrC_nvURUiNgW3ZuhVWFq1tyVCLZOm7FdYR4ZaiU7tIRUPbhIDckllPCFWExY'
      });
      return token;
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

