import { initializeApp } from "firebase/app";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
