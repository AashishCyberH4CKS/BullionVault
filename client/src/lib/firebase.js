import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase Web App Configuration loaded from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCrGyecvfpGopGpCY5PtmfdernXVC7Dl3c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "goldcommoditytracker.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "goldcommoditytracker",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "goldcommoditytracker.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1069927168298",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1069927168298:web:7a8e8cc900040fddc00653",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-C85VBLT633"
};

// Initialize or reuse existing Firebase instance (avoids duplicate app errors in Vite HMR)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore and Firebase Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
