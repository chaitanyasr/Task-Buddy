import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD4jmVsR41Wc7iueNns_XDlVFpNDbIrZeY",
  authDomain: "day-flow-14a69.firebaseapp.com",
  projectId: "day-flow-14a69",
  storageBucket: "day-flow-14a69.firebasestorage.app",
  messagingSenderId: "469690078546",
  appId: "1:469690078546:web:6464fb16fe4bff30f1568b",
  measurementId: "G-3LPP0L5ZY1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
