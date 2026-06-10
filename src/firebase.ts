import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword };

