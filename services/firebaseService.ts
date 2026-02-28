import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB9v2reO7_PdFyk7Un2A-Ms7XLOz0QTPgw",
  authDomain: "jurniqcareers.firebaseapp.com",
  projectId: "jurniqcareers",
  storageBucket: "jurniqcareers.firebasestorage.app",
  messagingSenderId: "490681867588",
  appId: "1:490681867588:web:f0783ae47a6743a976cb11",
  measurementId: "G-6E51CKE328"
};

const app = firebase.initializeApp(firebaseConfig);
export const auth = app.auth();
export const db = getFirestore(app as any);
export const storage = getStorage(app as any);