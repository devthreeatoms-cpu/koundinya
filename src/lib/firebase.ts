import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoyl_NNVh7IoUOwMT4GFEyaY8qSO4kqkU",
  authDomain: "koundinya-wms.firebaseapp.com",
  projectId: "koundinya-wms",
  storageBucket: "koundinya-wms.firebasestorage.app",
  messagingSenderId: "93040642111",
  appId: "1:93040642111:web:cfca5779788e843053d08a",
  measurementId: "G-7ZHBK3QCBM",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
