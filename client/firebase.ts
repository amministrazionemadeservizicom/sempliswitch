import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4aTIVR50hR-raI3Y_7rYk5x7Ta3kWmi0",
  authDomain: "sempliswitch.firebaseapp.com",
  projectId: "sempliswitch",
  storageBucket: "sempliswitch.appspot.com",
  messagingSenderId: "937194103700",
  appId: "1:937194103700:web:8debe82363a3e00751a581",
  measurementId: "G-5LSTVTZ9JP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environment
let analytics;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Export Firestore functions for easy import
export {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc
} from "firebase/firestore";

// Export Auth functions
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";

export default app;
