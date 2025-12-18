// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { get } from "http";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBuqXGZU6Y6jRD26wjEKhAqRZB8Pf1mPGc",
  authDomain: "vist-ai-system.firebaseapp.com",
  projectId: "vist-ai-system",
  storageBucket: "vist-ai-system.firebasestorage.app",
  messagingSenderId: "718190563508",
  appId: "1:718190563508:web:f0442fb02a904c9a4b47e1",
  measurementId: "G-3BWY1BC4VE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);