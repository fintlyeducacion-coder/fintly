import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Persistencia local: la sesión sobrevive al cierre de la pestaña y del navegador.
 * Sin esto, el alumno tiene que volver a loguearse cada vez que cierra el celular.
 */
setPersistence(auth, browserLocalPersistence).catch((e) => {
  console.warn('No se pudo fijar la persistencia local de sesión:', e);
});

/**
 * initializeFirestore (en vez de getFirestore) porque necesitamos dos ajustes:
 *
 *  · ignoreUndefinedProperties — varios campos de ClassItem son opcionales
 *    (unlockAt, deadline, actTitle, actDesc). Sin este flag, guardar un
 *    documento con alguno en undefined lanza excepción y se rompe el guardado.
 *
 *  · experimentalForceLongPolling — las redes de colegio suelen tener proxies
 *    que cortan el streaming de Firestore. Con long polling la app sigue
 *    funcionando donde si no daría "the client is offline".
 */
export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || undefined
);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signInWithRedirect, getRedirectResult };
