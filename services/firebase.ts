import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import type { Auth } from "firebase/auth";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyAY2bdSOtvKpzGAEHHkMVwSPiU2AVwZ0ew",
  authDomain: "school-security-system-4f2e3.firebaseapp.com",
  projectId: "school-security-system-4f2e3",
  storageBucket: "school-security-system-4f2e3.firebasestorage.app",
  messagingSenderId: "643061196600",
  appId: "1:643061196600:web:2966c29a05c736c11203cd",
  measurementId: "G-T3PR2W84VB"
};

let app: FirebaseApp | null = null;
let db: Firestore | any = null; 
let auth: Auth | null = null;
let analytics: Analytics | null = null;
let initializationError: string | null = null;

try {
  // Initialize App
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore
  db = getFirestore(app);

  // Initialize Auth
  auth = getAuth(app);
  
  // Auto-login
  signInAnonymously(auth).catch((error) => {
    console.warn("Auth Failed:", error);
  });

  // Initialize Analytics safely
  isSupported().then(yes => {
    if (yes) analytics = getAnalytics(app);
  }).catch(() => {});

  // Enable Persistence
  if (typeof window !== 'undefined' && db) {
      enableIndexedDbPersistence(db).catch((err) => {
         console.log("Persistence disabled:", err.code);
      });
  }

} catch (error: any) {
  console.error("Firebase Init Error:", error);
  initializationError = error.message;
}

export const saveConfig = (newConfig: FirebaseConfig) => {};
export { app, db, auth, analytics, initializationError };