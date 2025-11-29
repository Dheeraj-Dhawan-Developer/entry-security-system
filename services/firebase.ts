import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
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

// Hardcoded configuration from user
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyAY2bdSOtvKpzGAEHHkMVwSPiU2AVwZ0ew",
  authDomain: "school-security-system-4f2e3.firebaseapp.com",
  projectId: "school-security-system-4f2e3",
  storageBucket: "school-security-system-4f2e3.firebasestorage.app",
  messagingSenderId: "643061196600",
  appId: "1:643061196600:web:2966c29a05c736c11203cd",
  measurementId: "G-T3PR2W84VB"
};

// Initialize Firebase Variables
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let analytics: Analytics | null = null;
let initializationError: string | null = null;

try {
  // 1. Initialize App
  app = initializeApp(firebaseConfig);
  
  // 2. Initialize Firestore
  db = getFirestore(app);

  // 3. Initialize Auth & Sign In Anonymously
  auth = getAuth(app);
  
  // Auto-login to bypass standard "auth != null" rules
  signInAnonymously(auth).catch((error) => {
    console.error("Anonymous Auth Failed:", error);
    // Don't block app initialization, might still work if rules are open
  });

  // 4. Initialize Analytics (Optional)
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("Analytics blocked or failed:", e);
    }
  }

  // 5. Enable Offline Persistence
  if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Persistence not supported by browser');
        } else {
          console.warn("Persistence error:", err);
        }
      });
  }

} catch (error: any) {
  console.error("CRITICAL: Firebase Initialization Failed", error);
  initializationError = error.message || "Unknown Firebase Error";
}

// Backward compatibility stub
export const saveConfig = (newConfig: FirebaseConfig) => {
  console.log("Config is hardcoded.");
};

export { app, db, auth, analytics, initializationError };