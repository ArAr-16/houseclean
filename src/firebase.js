import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDt8RZjNpqOVSWrzVWjKE8AHeXbrkltynQ",
  authDomain: "houseclean-20ce9.firebaseapp.com",
  databaseURL: "https://houseclean-20ce9-default-rtdb.firebaseio.com",
  projectId: "houseclean-20ce9",
  storageBucket: "houseclean-20ce9.firebasestorage.app",
  messagingSenderId: "955467151500",
  appId: "1:955467151500:web:7d42a4ffe7864b97e723a9",
  measurementId: "G-3956QKK120"
};

// Use a singleton primary app so hot-reloads don't re-initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Secondary auth instance lets us create users without logging out the admin
const secondaryApp =
  getApps().find((a) => a.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
