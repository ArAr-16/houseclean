import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "houseclean-20ce9.firebaseapp.com",
  databaseURL: "https://houseclean-20ce9-default-rtdb.firebaseio.com/",
  projectId: "houseclean-20ce9",
  storageBucket: "houseclean-20ce9.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };