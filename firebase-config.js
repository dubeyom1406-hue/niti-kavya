// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAJt2CvnAonV2wLCw_hefCjDdUhPdCZUbM",
    authDomain: "niti-kavya.firebaseapp.com",
    projectId: "niti-kavya",
    storageBucket: "niti-kavya.firebasestorage.app",
    messagingSenderId: "867020899195",
    appId: "1:867020899195:web:1e48cefd9063f624dff3de",
    measurementId: "G-FWBR9NLHYF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, collection, getDocs };
