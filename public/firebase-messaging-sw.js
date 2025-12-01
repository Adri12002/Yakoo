importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyA7kU5OhdJJupgC-0HsvcZIUqIFoVWifOk",
  authDomain: "duoloop-f22ab.firebaseapp.com",
  projectId: "duoloop-f22ab",
  storageBucket: "duoloop-f22ab.firebasestorage.app",
  messagingSenderId: "464064456296",
  appId: "1:464064456296:web:23ff55de13ef111649bddd",
  measurementId: "G-0RM2L88H2M"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

