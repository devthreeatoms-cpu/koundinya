import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMwdJ0QRA1tcfRr7-d6qYNR0feDVqUOQU",
  authDomain: "workforce-management-sys-f3960.firebaseapp.com",
  projectId: "workforce-management-sys-f3960",
  storageBucket: "workforce-management-sys-f3960.firebasestorage.app",
  messagingSenderId: "1037583336811",
  appId: "1:1037583336811:web:3df5db05441e1c231a782e",
  measurementId: "G-V455RFZP67",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
