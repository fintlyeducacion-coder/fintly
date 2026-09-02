/**
 * App.tsx
 * Orquestador principal de la plataforma educativa interactiva Fintly Campus
 * Totalmente integrado con Firebase Auth y Firestore Database para persistencia y seguridad
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_CLASSES, ASSOCIATED_SCHOOLS, SIN_ASIGNAR, COLEGIO_INTERNO } from './data';
import { ClassItem, User, Student, ActivitySubmission } from './types';

// Componentes modulares
import Background from './components/Background';
import Login from './components/Login';
import Navbar from './components/Navbar';
import StudentDashboard from './components/StudentDashboard';
import ClassView from './components/ClassView';
import StaffProgress from './components/StaffProgress';
import AdminPanel from './components/AdminPanel';

// Integración de Firebase
import { db, auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestore-errors';
import { syllabusId, assignedId, submissionId, submissionIdExistente, idsHistoricos } from './classKeys';
import { Clock } from 'lucide-react';

// ─── DEV BYPASS ──────────────────────────────────────────────────────────────
// Poner en null para restaurar el login normal
// Con un objeto aca se saltea el login (util para maquetar), PERO Firestore
// rechaza toda lectura/escritura: las reglas exigen sesion real de Firebase Auth.
// Para probar contra la base de verdad, dejarlo en null.
const DEV_BYPASS_USER: User | null = null;
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_EMAILS_TO_DELETE = [
  'sofia@faro.edu.ar',
  'lucas@faro.edu.ar',
  'mateo@faro.edu.ar',
  'alumno@fintly.pro',
  'tomas@fintly.pro',
  'camila@fintly.pro',
  'vale@fintly.pro',
  'nacho@fintly.pro',
  'santiago@fintly.pro',
  'felipe@fintly.pro',
  'benja@southgreek.edu',
  'delfi@southgreek.edu',
  'emma@globalschool.edu',
  'nico@globalschool.edu'
];

export default function App() {
  // NUNCA hidratamos el usuario desde localStorage: ese dato lo puede escribir
  // cualquiera desde la consola del navegador. La unica fuente de verdad del rol
  // es Firebase Auth + el documento en Firestore, que resuelve onAuthStateChanged.
  const [currentUser, setCurrentUser] = useState<User | null>(
    DEV_BYPASS_USER ? DEV_BYPASS_USER : null
  );

  const [authInitialized, setAuthInitialized] = useState<boolean>(
    DEV_BYPASS_USER ? true : false
  );
  
  // Ref para tener acceso al valor más actualizado de currentUser en closures asíncronos y listeners
  const currentUserRef = useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'classview' | 'progress' | 'admin' | 'pausado'>(() => {
    if (DEV_BYPASS_USER) {
      if (DEV_BYPASS_USER.role === 'admin') return 'admin';
      if (DEV_BYPASS_USER.role === 'directivo') return 'progress';
      return 'dashboard';
    }
    // Sin bypass arrancamos siempre en login: onAuthStateChanged decide a donde va
    return 'login';
  });

  const [authError, setAuthError] = useState<string>('');
  
  // Estado del tema: modo claro u oscuro (por defecto siempre 'dark' en el primer ingreso)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const initialized = localStorage.getItem('fc_theme_init_dark_v3');
    if (!initialized) {
      localStorage.setItem('fc_theme_init_dark_v3', 'true');
      localStorage.setItem('fc_theme', 'dark');
      return 'dark';
    }
    return (localStorage.getItem('fc_theme') as 'light' | 'dark') || 'dark';
  });

  // Clases administradas reactivas persistidas en Firestore
  const [classes, setClasses] = useState<ClassItem[]>([]);
  // Alumnos del campus (con su progreso interactivo)
  const [studentsByState, setStudentsByState] = useState<Student[]>([]);
  
  // Entregas de actividades persistidas en Firestore
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);

  // Todos los usuarios registrados (para monitoreo y control de aprobaciones de staff)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Clase activa que visualiza el estudiante en detalle
  const [activeClassItem, setActiveClassItem] = useState<ClassItem | null>(null);

  // Clave de reinicio para limpiar estados locales de subpaneles al hacer clic en Fintly logo
  const [homeResetKey, setHomeResetKey] = useState<number>(0);

  // --- 1. PROBAR CONEXIÓN FIRESTORE AL BOOT ---
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. Currently offline.");
        }
      }
    }
    testConnection();
  }, []);

  // --- 1.b COMPLETAR LOGIN QUE VOLVIÓ POR REDIRECCIÓN ---
  // Si el navegador no soportó el popup, el usuario fue a Google y volvió acá.
  // getRedirectResult recoge esa sesión; onAuthStateChanged hace el resto.
  useEffect(() => {
    if (DEV_BYPASS_USER) return;
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Sesión recuperada por redirección:', result.user.email);
        }
      })
      .catch((e) => {
        console.error('Error al volver de la redirección de Google:', e);
        setAuthError('No se pudo completar el inicio de sesión. Intentá nuevamente.');
      });
  }, []);

  // --- 2. ESCUCHAR CAMBIOS DE AUTHENTICATION ---
  useEffect(() => {
    if (DEV_BYPASS_USER) return; // bypass: skip Firebase auth entirely
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const cleanEmail = firebaseUser.email?.toLowerCase() || '';
          
          // Si hay una sesión activa previa con otro correo, limpiar el estado local inmediatamente
          // para desconectar listeners obsoletos antes de realizar consultas de validación async
          if (currentUserRef.current && currentUserRef.current.email.toLowerCase() !== cleanEmail) {
            setCurrentUser(null);
          }
          
          let userProfile: User | null = null;
          try {
            const userSnap = await getDoc(doc(db, 'users', cleanEmail));
            if (userSnap.exists()) {
              userProfile = userSnap.data() as User;
            }
          } catch (e) {
            console.error("Error reading profile from database", e);
            handleFirestoreError(e, OperationType.GET, `users/${cleanEmail}`);
          }

          // Si es el administrador de Fintly Educación o el propietario, se asegura de que tenga rol de admin y se guarda/actualiza de inmediato
          if ((cleanEmail === 'fintlyeducacion@gmail.com' || cleanEmail === 'fargenti01@gmail.com') && (!userProfile || userProfile.role !== 'admin')) {
            userProfile = {
              email: cleanEmail,
              name: firebaseUser.displayName || 'Admin Fintly',
              role: 'admin',
              initials: 'AD',
              school: 'Fintly Campus Virtual'
            };
            try {
              await setDoc(doc(db, 'users', cleanEmail), userProfile);
              console.log(`Auto-created or healed admin profile for ${cleanEmail} directly in Firestore.`);
            } catch (e) {
              console.error("Could not write initial admin profile to Firestore:", e);
              handleFirestoreError(e, OperationType.WRITE, `users/${cleanEmail}`);
            }
          }

          // Si el usuario tiene rol de admin/directivo en Firestore (sea demo o no),
          // eliminamos cualquier registro existente en la colección 'students' para limpiarlo de la lista de alumnos.
          if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'directivo')) {
            try {
              const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
              const studentDocRef = doc(db, 'students', studentDocId);
              const studentDocSnap = await getDoc(studentDocRef);
              if (studentDocSnap.exists()) {
                await deleteDoc(studentDocRef);
                console.log(`Successfully deleted student record for db admin/directivo user: ${cleanEmail}`);
              }
            } catch (e) {
              console.warn("Could not check/delete student record for admin:", e);
            }
          }

          // Si el usuario no existe en la colección 'users' y no es el administrador de Fintly, verificar si está en 'students' (invitado)
          if (!userProfile) {
            try {
              const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
              const studentSnap = await getDoc(doc(db, 'students', studentDocId));
              if (studentSnap.exists()) {
                const stData = studentSnap.data() as Student;
                userProfile = {
                  email: cleanEmail,
                  name: stData.name,
                  role: 'alumno',
                  initials: stData.initials || stData.name[0].toUpperCase(),
                  level: stData.level,
                  school: stData.school || SIN_ASIGNAR
                };
                // Guardar el perfil en 'users' para habilitar logins híbridos en el futuro
                await setDoc(doc(db, 'users', cleanEmail), userProfile);
              }
            } catch (e) {
              // No lanzar error limitante aquí para que el flujo de login no se cuelgue ante restricciones de permisos
              console.warn("Ignored student status read error during initial signup (user may not be a student):", e);
            }
          }

          // Si el usuario no existe en la base de datos (ni users ni students), creamos un perfil 'pausado' (pendiente) para aprobación
          if (!userProfile) {
            userProfile = {
              email: cleanEmail,
              name: firebaseUser.displayName || 'Usuario Nuevo',
              role: 'pausado',
              initials: firebaseUser.displayName 
                ? firebaseUser.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
                : cleanEmail.slice(0, 2).toUpperCase(),
              school: SIN_ASIGNAR
            };
            try {
              await setDoc(doc(db, 'users', cleanEmail), userProfile);
              console.log(`Auto-created user record for unregistered Google login: ${cleanEmail} with role: 'pausado'`);
            } catch (e) {
              console.error("Could not write 'pausado' profile to Firestore:", e);
              handleFirestoreError(e, OperationType.WRITE, `users/${cleanEmail}`);
            }
          }

          // Buscar si tiene datos actualizados en la colección de alumnos (students) - SOLO para alumnos
          if (userProfile.role === 'alumno') {
            try {
              const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
              const studentSnap = await getDoc(doc(db, 'students', studentDocId));
              if (studentSnap.exists()) {
                const stData = studentSnap.data() as Student;
                userProfile.level = stData.level;
                userProfile.school = stData.school;
                userProfile.name = stData.name;
                userProfile.initials = stData.initials || stData.name[0].toUpperCase();
                
                // Marcar como registrado si no lo estaba
                if (!stData.registered) {
                  await setDoc(doc(db, 'students', studentDocId), { registered: true }, { merge: true });
                }
              }
            } catch (e) {
              console.error("Error matching student records:", e);
              handleFirestoreError(e, OperationType.GET, `students/${cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_')}`);
            }
          }

          setCurrentUser(userProfile);
          localStorage.setItem('fintly_logged_user', JSON.stringify(userProfile));
          localStorage.setItem('fintly_login_provider', 'google');

          // Enrutar al panel correspondiente de forma automática
          if (userProfile.role === 'admin') {
            setCurrentView('admin');
          } else if (userProfile.role === 'directivo') {
            setCurrentView('progress');
          } else if (userProfile.role === 'pausado') {
            setCurrentView('pausado');
          } else {
            setCurrentView('dashboard');
          }
        } else {
          // Sin sesión de Firebase Auth no hay sesión válida: limpiamos cualquier rastro local
          localStorage.removeItem('fintly_logged_user');
          localStorage.removeItem('fintly_login_provider');
          setCurrentUser(null);
          setCurrentView('login');
        }
      } catch (err) {
        console.error("General error in onAuthStateChanged wrapper:", err);
      } finally {
        setAuthInitialized(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 3. ESCUCHAR CLASES REAL-TIME COMPLETAS ---
  useEffect(() => {
    if (!currentUser || !authInitialized) return;

    const classesRef = collection(db, 'classes');
    const unsubscribe = onSnapshot(classesRef, (snapshot) => {
      let loadedClasses: ClassItem[] = [];
      snapshot.forEach((doc) => {
        loadedClasses.push({ id: doc.id, ...doc.data() } as ClassItem);
      });

      // Auto-sembrar base de clases si el panel está vacío y somos administradores
      if (loadedClasses.length === 0 && currentUser.role === 'admin') {
        const seedClasses = async () => {
          try {
            const initialSyllabus = DEFAULT_CLASSES.map(cl => ({ ...cl, isSyllabus: true }));
            const initialAssigned: ClassItem[] = [];
            ASSOCIATED_SCHOOLS.forEach(school => {
              DEFAULT_CLASSES.forEach(cl => {
                initialAssigned.push({
                  ...cl,
                  school,
                  unlockAt: cl.unlockAt || "2026-01-01T00:00",
                  deadline: cl.deadline || "2099-01-01T00:00"
                });
              });
            });
            const combined = [...initialSyllabus, ...initialAssigned];
            
            for (const cl of combined) {
              const docId = cl.isSyllabus 
                ? syllabusId(cl.level, cl.module, cl.week)
                : assignedId(cl.school || '', cl.level, cl.module, cl.week);
              await setDoc(doc(db, 'classes', docId), cl);
            }
          } catch (err) {
            console.error("Could not seed database classes:", err);
          }
        };
        seedClasses();
      } else {
        setClasses(loadedClasses);
      }
    }, (error) => {
      if (auth.currentUser?.email?.toLowerCase() !== currentUserRef.current?.email?.toLowerCase()) {
        console.warn("Ignored Firestore permission error during user transition phase:", error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'classes');
    });

    return () => unsubscribe();
  }, [currentUser, authInitialized]);

  // --- 4. ESCUCHAR SUBMISSIONS REAL-TIME (SEGÚN ROL) ---
  useEffect(() => {
    if (!currentUser || !authInitialized) return;

    let submissionsQuery;
    if (currentUser.role === 'admin' || currentUser.role === 'directivo') {
      submissionsQuery = collection(db, 'submissions');
    } else {
      submissionsQuery = query(
        collection(db, 'submissions'),
        where('studentEmail', '==', currentUser.email.toLowerCase())
      );
    }

    const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
      const loaded: ActivitySubmission[] = [];
      snapshot.forEach((doc) => {
        loaded.push(doc.data() as ActivitySubmission);
      });
      setSubmissions(loaded);
    }, (error) => {
      if (currentUserRef.current?.role !== 'admin' && currentUserRef.current?.role !== 'directivo') {
        console.warn("Ignored collection-level submissions error for non-staff:", error);
        return;
      }
      if (auth.currentUser?.email?.toLowerCase() !== currentUserRef.current?.email?.toLowerCase()) {
        console.warn("Ignored Firestore permission error during user transition phase:", error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'submissions');
    });

    return () => unsubscribe();
  }, [currentUser, authInitialized]);

  // --- 4B. ESCUCHAR UNIVERSAL DE USUARIOS PARA STAFF ---
  useEffect(() => {
    if (!currentUser || !authInitialized || (currentUser.role !== 'admin' && currentUser.role !== 'directivo')) {
      setAllUsers([]);
      return;
    }

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const loaded: User[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as User;
        const cleanEmail = u.email?.toLowerCase().trim();
        if (!cleanEmail) return;

        // Ignorar localmente los correos de prueba eliminados
        if (DEMO_EMAILS_TO_DELETE.includes(cleanEmail)) {
          return;
        }
        
        // Corrección de visualización inmediata en memoria para consistencia
        if (u.role === 'admin') {
          u.school = COLEGIO_INTERNO;
        } else if (!u.school) {
          // Solo completamos si viene vacío: nunca pisamos un colegio ya asignado
          u.school = SIN_ASIGNAR;
        }

        loaded.push(u);
      });
      setAllUsers(loaded);
    }, (error) => {
      console.warn("Ignored read error on users collection (possible permission or transitional shift):", error);
    });

    return () => unsubscribe();
  }, [currentUser, authInitialized]);

  // --- 5. ESCUCHAR ESTUDIANTES REAL-TIME ---
  useEffect(() => {
    if (!currentUser || !authInitialized) return;

    // SI NO ES STAFF, SOLO ESCUCHAR SU PROPIO REGISTRO DE ALUMNO (EVITA ERROR DE PERMISOS DE COLECCIÓN COMPLETA)
    if (currentUser.role !== 'admin' && currentUser.role !== 'directivo') {
      const studentDocId = currentUser.email.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_');
      const studentDocRef = doc(db, 'students', studentDocId);
      const unsubscribeSelf = onSnapshot(studentDocRef, (snap) => {
        if (snap.exists()) {
          setStudentsByState([snap.data() as Student]);
        } else {
          const userLevel = currentUser.level || 0;
          const userSchool = currentUser.school || SIN_ASIGNAR;
          const availableCount = classes.filter(cl => cl.level === userLevel && !cl.isSyllabus && (cl.school?.toLowerCase() === userSchool.toLowerCase() || !cl.school)).length;

          setStudentsByState([{
            name: currentUser.name,
            email: currentUser.email,
            initials: currentUser.initials,
            level: userLevel,
            progress: 0,
            total: availableCount || 32,
            status: 'ok',
            school: userSchool
          }]);
        }
      }, (error) => {
        console.warn("Ignored self student profile read error during transition:", error);
      });
      return () => unsubscribeSelf();
    }

    const studentsRef = collection(db, 'students');
    const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
      let loaded: Student[] = [];
      snapshot.forEach((sn) => {
        const st = sn.data() as Student;
        const cleanEmail = st.email?.toLowerCase().trim();
        if (!cleanEmail) return;

        // Ignorar localmente los correos de prueba eliminados
        if (DEMO_EMAILS_TO_DELETE.includes(cleanEmail)) {
          return;
        }

        // Respetar el colegio asignado o marcarlo como pendiente si no tiene
        if (!st.school) {
          st.school = SIN_ASIGNAR;
        }

        loaded.push(st);
      });
      setStudentsByState(loaded);
    }, (error) => {
      if (currentUserRef.current?.role !== 'admin' && currentUserRef.current?.role !== 'directivo') {
         console.warn("Ignored collection-level students error for non-staff:", error);
         return;
      }
      if (auth.currentUser?.email?.toLowerCase() !== currentUserRef.current?.email?.toLowerCase()) {
        console.warn("Ignored Firestore permission error during user transition phase:", error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'students');
    });

    return () => unsubscribe();
  }, [currentUser, authInitialized]);

  // --- 5B. ONE-TIME DATABASE HEALING & CLEANUP (ASÍNCRONO Y DE BAJO IMPACTO) ---
  useEffect(() => {
    if (!currentUser || !authInitialized) return;
    if (currentUser.role !== 'admin' && currentUser.role !== 'directivo') return;

    const runDatabaseHealing = async () => {
      try {
        console.log("Healing DB: Deleting demo users...");
        
        // 1. Eliminar todos los alumnos/usuarios de prueba que estén en la base de datos
        for (const email of DEMO_EMAILS_TO_DELETE) {
          const studentDocId = email.replace(/[^a-zA-Z0-9_.-]/g, '_');
          deleteDoc(doc(db, 'students', studentDocId)).catch(() => {});
          deleteDoc(doc(db, 'users', email)).catch(() => {});
        }

        // 2. Limpiar usuarios corruptos o de demo en Firestore
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnap.docs) {
          const u = userDoc.data() as User;
          const cleanEmail = u.email?.toLowerCase().trim();
          if (!cleanEmail) continue;

          const userName = (u.name || '').toLowerCase().trim();
          if (DEMO_EMAILS_TO_DELETE.includes(cleanEmail) || userName === 'asd') {
            await deleteDoc(doc(db, 'users', cleanEmail)).catch(() => {});
            const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
            await deleteDoc(doc(db, 'students', studentDocId)).catch(() => {});
            console.log(`[Heal] Deleted user named asd/demo: ${cleanEmail}`);
            continue;
          }
        }

        // 3. Limpiar alumnos corruptos de demo en Firestore
        const studentsSnap = await getDocs(collection(db, 'students'));
        for (const studentDoc of studentsSnap.docs) {
          const st = studentDoc.data() as Student;
          const cleanEmail = st.email?.toLowerCase().trim();
          if (!cleanEmail) continue;

          const studentName = (st.name || '').toLowerCase().trim();
          if (DEMO_EMAILS_TO_DELETE.includes(cleanEmail) || studentName === 'asd') {
            await deleteDoc(doc(db, 'students', studentDoc.id)).catch(() => {});
            console.log(`[Heal] Deleted student record named asd/demo: ${cleanEmail}`);
            continue;
          }
        }
        console.log("Database healing completed!");
      } catch (err) {
        console.warn("Could not execute full database healing (possible read/write restriction):", err);
      }
    };

    runDatabaseHealing();
  }, [currentUser, authInitialized]);

  // Sincronizar el tema activo con la clase del body (con transición suave)
  useEffect(() => {
    localStorage.setItem('fc_theme', theme);
    document.body.classList.add('theme-switching');
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    const t = setTimeout(() => document.body.classList.remove('theme-switching'), 500);
    return () => clearTimeout(t);
  }, [theme]);

  // Mantener actualizado el progreso de cada estudiante basándose en las entregas reales en la base de datos
  useEffect(() => {
    if (classes.length === 0 || studentsByState.length === 0) return;
    if (!currentUser) return;

    const now = new Date();

    const updateStudentProgressesOnServer = async () => {
      for (const student of studentsByState) {
        const studentEmail = student.email || 'alumno@fintly.pro';
        const studentSchool = student.school || SIN_ASIGNAR;
        const studentSubmissions = submissions.filter(
          (sub) => sub.studentEmail.toLowerCase() === studentEmail.toLowerCase()
        );
        const courseClasses = classes.filter(
          (cl) => cl.level === student.level && !cl.isSyllabus && (cl.school?.toLowerCase() === studentSchool.toLowerCase() || !cl.school)
        );
        const totalClassesCount = courseClasses.length || 32;
        const progress = studentSubmissions.length;

        // Semáforo con criterio temporal real:
        // Clases que ya vencieron según su deadline
        const overdueClasses = courseClasses.filter(cl => cl.deadline && now > new Date(cl.deadline));
        // De esas clases vencidas, cuántas entregó el alumno
        const completedOverdueCount = overdueClasses.filter(cl => 
          studentSubmissions.some(s => s.classLevel === cl.level && s.classWeek === cl.week)
        ).length;

        // Si no hay clases vencidas aún, o entregó todas las clases que ya vencieron -> 'ok' (Verde).
        // Si adeuda alguna clase con fecha límite vencida -> 'warn' (Amarillo).
        const status = (overdueClasses.length === 0 || completedOverdueCount >= overdueClasses.length) ? 'ok' : 'warn';

        if (student.progress !== progress || student.total !== totalClassesCount || student.status !== status) {
          try {
            const studentDocId = studentEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
            await setDoc(doc(db, 'students', studentDocId), {
              ...student,
              progress,
              total: totalClassesCount,
              status
            }, { merge: true });
          } catch (e) {
            // Silenciar o manejar con error de persistencia
            console.warn("Could not sync student progress recalculation:", e);
          }
        }
      }
    };

    updateStudentProgressesOnServer();
  }, [submissions, classes, studentsByState]);

  // --- MANDAR AL INGRESO DE GOOGLE (REAL) ---
  const handleGoogleLogin = async () => {
    setAuthError('');
    setCurrentUser(null);

    // Errores que significan "este navegador no puede con el popup".
    // Pasan seguido en Safari iOS y en equipos administrados por el colegio.
    const POPUP_NO_DISPONIBLE = [
      'auth/popup-blocked',
      'auth/operation-not-supported-in-this-environment',
      'auth/cancelled-popup-request',
      'auth/web-storage-unsupported',
    ];

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      // El usuario cerró el popup a propósito: no es un error que haya que mostrar.
      if (e?.code === 'auth/popup-closed-by-user') return;

      if (POPUP_NO_DISPONIBLE.includes(e?.code)) {
        // Segundo intento por redirección: se va a Google y vuelve.
        // getRedirectResult (más abajo) completa el login al volver.
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirErr) {
          console.error('Google Sign-In por redirección también falló:', redirErr);
        }
      }

      console.error('Google Sign-In failed:', e);

      // Mensajes concretos por causa: el genérico no deja diagnosticar nada
      const MENSAJES: Record<string, string> = {
        'auth/unauthorized-domain':
          'Este dominio no está autorizado en Firebase. Agregá "localhost" en Firebase Console → Authentication → Settings → Authorized domains.',
        'auth/operation-not-allowed':
          'El proveedor de Google no está habilitado. Activalo en Firebase Console → Authentication → Sign-in method → Google.',
        'auth/invalid-api-key':
          'La apiKey del archivo firebase-applet-config.json no es válida para este proyecto.',
        'auth/configuration-not-found':
          'Falta configurar Authentication en este proyecto de Firebase.',
        'auth/network-request-failed':
          'No hubo conexión con Firebase. Revisá la red o si algo está bloqueando el pedido.',
        'auth/internal-error':
          'Error interno de Firebase Auth. Suele ser configuración incompleta del proveedor de Google.',
      };

      const codigo = e?.code || 'sin-codigo';
      const detalle = MENSAJES[codigo] || (e?.message || 'Error desconocido');
      setAuthError(`${detalle}  [${codigo}]`);
    }
  };

  // Logout real de Firebase Auth
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("SignOut auth error:", e);
    }
    localStorage.removeItem('fintly_logged_user');
    localStorage.removeItem('fintly_login_provider');
    setCurrentUser(null);
    setCurrentView('login');
    setActiveClassItem(null);
  };

  // Navegar a la pantalla principal según el rol actual
  const handleNavigateHome = () => {
    setActiveClassItem(null);
    setHomeResetKey((prev) => prev + 1);
    if (!currentUser) return;
    if (currentUser.role === 'admin') {
      setCurrentView('admin');
    } else if (currentUser.role === 'directivo') {
      setCurrentView('progress');
    } else {
      setCurrentView('dashboard');
    }
  };

  // Abrir vista detallada de una clase
  const handleOpenClass = (level: number, week: number) => {
    let targetClass: ClassItem | undefined;

    if (currentUser && currentUser.role === 'alumno') {
      // Priorizar la clase asignada al colegio del alumno (que no sea Syllabus)
      targetClass = classes.find(
        (cl) =>
          cl.level === level &&
          cl.week === week &&
          cl.school?.toLowerCase() === currentUser.school?.toLowerCase() &&
          !cl.isSyllabus
      );
    }

    // Si no se encontró (o no es alumno), buscar la clase asignada o la primera que coincida
    if (!targetClass) {
      targetClass = classes.find(
        (cl) => cl.level === level && cl.week === week && !cl.isSyllabus
      );
    }
    if (!targetClass) {
      targetClass = classes.find(
        (cl) => cl.level === level && cl.week === week
      );
    }

    if (targetClass) {
      setActiveClassItem(targetClass);
      setCurrentView('classview');
    }
  };

  // Mandar una actividad de desafío semanal a Firestore
  const handleSubmitActivity = async (responseText: string) => {
    if (!currentUser || !activeClassItem) return;

    const newSubmission: ActivitySubmission = {
      classLevel: activeClassItem.level,
      classModule: activeClassItem.module ?? 1,
      classWeek: activeClassItem.week,
      studentEmail: currentUser.email.toLowerCase(),
      responseText: responseText.trim(),
      submittedAt: new Date().toISOString()
    };

    try {
      const docId = submissionId(currentUser.email, activeClassItem.level, activeClassItem.module, activeClassItem.week);
      await setDoc(doc(db, 'submissions', docId), newSubmission);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  };

  // Crear o guardar cambios de una clase en Firestore (Admin)
  const handleSaveClass = async (classItem: ClassItem, oldKey?: { level: number; module?: number; week: number }) => {
    try {
      const docId = classItem.isSyllabus 
        ? syllabusId(classItem.level, classItem.module, classItem.week)
        : assignedId(classItem.school || '', classItem.level, classItem.module, classItem.week);

      if (oldKey && (oldKey.level !== classItem.level || oldKey.module !== classItem.module || oldKey.week !== classItem.week)) {
        const oldDocId = classItem.isSyllabus 
          ? syllabusId(oldKey.level, oldKey.module, oldKey.week)
          : assignedId(classItem.school || '', oldKey.level, oldKey.module, oldKey.week);
        await deleteDoc(doc(db, 'classes', oldDocId));
      }

      await setDoc(doc(db, 'classes', docId), classItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
      throw error; // que lo vea quien llamó, para poder avisarle al usuario
    }
  };

  // Subir / publicar una clase a múltiples colegios con fechas dinámicas en Firestore (Admin)
  const handleAssignClass = async (sourceClass: ClassItem, schools: string[], unlockAt: string, deadline: string) => {
    try {
      for (const schoolName of schools) {
        const docId = assignedId(schoolName, sourceClass.level, sourceClass.module, sourceClass.week);
        const assignedItem: ClassItem = {
          ...sourceClass,
          isSyllabus: false,
          school: schoolName,
          unlockAt,
          deadline
        };
        delete assignedItem.id;
        await setDoc(doc(db, 'classes', docId), assignedItem);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
      throw error; // que lo vea quien llamó, para poder avisarle al usuario
    }
  };

  // Borrar una clase en Firestore (Admin)
  const handleDeleteClass = async (
    level: number,
    week: number,
    school?: string,
    id?: string,
    module?: number
  ) => {
    try {
      // 1. Por ID exacto si lo tenemos
      if (id) {
        await deleteDoc(doc(db, 'classes', id));
      }

      // 2. El ID actual (con módulo)
      const idActual = school
        ? assignedId(school, level, module, week)
        : syllabusId(level, module, week);
      await deleteDoc(doc(db, 'classes', idActual)).catch(() => {});

      // 3. Variantes históricas sin módulo, para limpiar lo que quedó de antes
      for (const viejo of idsHistoricos(school, level, week)) {
        await deleteDoc(doc(db, 'classes', viejo)).catch(() => {});
      }

      // 4. Las entregas de esa clase
      const entregasDeLaClase = submissions.filter((sub) => {
        // Las entregas viejas no tienen classModule: si falta, no filtramos por módulo
        const mismoModulo = sub.classModule === undefined || sub.classModule === (module ?? 1);
        const mismaClase = sub.classLevel === level && sub.classWeek === week && mismoModulo;
        if (!mismaClase) return false;

        if (school) {
          const alumno = studentsByState.find(
            st => st.email?.toLowerCase() === sub.studentEmail.toLowerCase()
          );
          return alumno?.school?.toLowerCase() === school.toLowerCase();
        }
        return true;
      });

      for (const sub of entregasDeLaClase) {
        const subId = submissionIdExistente(sub.studentEmail, sub.classLevel, sub.classModule, sub.classWeek);
        await deleteDoc(doc(db, 'submissions', subId)).catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
    }
  };

  // Guardar, crear, admitir o invitar un alumno en Firestore
  const handleSaveStudent = async (student: Student) => {
    if (!student.email) return;
    const cleanEmail = student.email.toLowerCase();

    try {
      const docId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      await setDoc(doc(db, 'students', docId), {
        ...student,
        email: cleanEmail
      });

      // Asegurar perfil del usuario si no existe
      const userProfileRef = doc(db, 'users', cleanEmail);
      const userProfileSnap = await getDoc(userProfileRef);
      if (!userProfileSnap.exists()) {
        await setDoc(userProfileRef, {
          email: cleanEmail,
          name: student.name,
          role: 'alumno',
          initials: student.initials || student.name[0].toUpperCase(),
          level: student.level,
          school: student.school
        });

        // ENVIAR INVITACIÓN AUTOMÁTICA VÍA FIREBASE (Trigger Email Extension)
        // Guardamos el documento en la colección 'mail' para que la extensión de Firebase envíe el correo físico
        const registerLink = `${window.location.origin}/?register&email=${encodeURIComponent(cleanEmail)}`;
        const mailDocRef = doc(collection(db, 'mail'));
        await setDoc(mailDocRef, {
          to: cleanEmail,
          message: {
            subject: `Invitación Académica a Fintly Campus Virtual (${student.school})`,
            text: `¡Hola ${student.name}!\n\nTe damos la bienvenida a Fintly, la plataforma interactiva de educación financiera.\nHas sido invitado/a por tus docentes de "${student.school}" para formar parte del Nivel ${student.level + 1}.\n\nPara activar tu cuenta y comenzar, ingresá en el siguiente enlace institucional:\n${registerLink}\n\n¡Te deseamos el mayor de los éxitos!\n\nEquipo Fintly`,
            html: `
              <div style="background-color: #050510; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; width: 100%; box-sizing: border-box; margin: 0;">
                <div style="max-width: 540px; margin: 0 auto; background-color: #0f0f24; border: 1px solid #221c4e; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  <!-- Top Vivid Banner -->
                  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 36px 24px; text-align: center; border-bottom: 1px solid #221c4e;">
                    <!-- Logo Accent -->
                    <div style="background-color: rgba(255, 255, 255, 0.12); display: inline-block; padding: 8px 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.18);">
                      <span style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; font-family: sans-serif;">Fintly</span>
                    </div>
                    <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;">¡Hola, ${student.name}!</h2>
                    <p style="color: #c7d2fe; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Te damos la bienvenida al Campus Virtual de Fintly</p>
                  </div>

                  <!-- Main Content Body -->
                  <div style="padding: 32px 24px; color: #d1d5db; line-height: 1.6; font-size: 14px; background-color: #0f0f24;">
                    <p style="margin-top: 0; color: #9ca3af;">Tu institución educativa te ha asignado acceso directo para formar parte de la plataforma de educación financiera interactiva.</p>
                    
                    <div style="background-color: #060614; border: 1px solid #1e1b4b; border-radius: 18px; padding: 20px; margin: 24px 0;">
                      <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #818cf8; letter-spacing: 0.12em; display: block; margin-bottom: 12px; font-family: monospace;">Credenciales Académicas</span>
                      
                      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e5e7eb;">
                        <tr>
                          <td style="padding: 6px 0; color: #6b7280; width: 35%; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Colegio:</td>
                          <td style="padding: 6px 0; font-weight: 600; color: #ffffff;">${student.school}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Curso/Nivel:</td>
                          <td style="padding: 6px 0; font-weight: 700; color: #818cf8;">Nivel ${student.level + 1}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Correo:</td>
                          <td style="padding: 6px 0; font-family: monospace; color: #a5b4fc; font-weight: bold;">${cleanEmail}</td>
                        </tr>
                      </table>
                    </div>

                    <p style="color: #9ca3af;">Presioná el botón de abajo para activar tu cuenta escolar, configurar tu clave e ingresar al simulador de finanzas y lecciones virtuales:</p>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0 28px 0;">
                      <a href="${registerLink}" style="background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25); border: 1px solid #4f46e5; text-transform: uppercase; letter-spacing: 0.08em;">
                        Comenzar Aprendizaje
                      </a>
                    </div>

                    <!-- Copy-Paste helper -->
                    <div style="border-top: 1px solid #1e1b4b; margin-top: 32px; padding-top: 20px;">
                      <p style="color: #6b7280; font-size: 11px; margin-bottom: 8px; line-height: 1.4;">Si tenés problemas con el botón, podés copiar y pegar este enlace en tu navegador:</p>
                      <p style="font-family: monospace; background-color: #060614; padding: 12px; border-radius: 10px; font-size: 11px; word-break: break-all; color: #6366f1; border: 1px solid #1e1b4b; margin: 0;">
                        ${registerLink}
                      </p>
                    </div>
                  </div>

                  <!-- Professional Footer -->
                  <div style="background-color: #060614; padding: 24px; text-align: center; border-top: 1px solid #1e1b4b;">
                    <p style="color: #4b5563; font-size: 10px; margin: 0 0 6px 0; line-height: 1.5;">Este correo es de uso estrictamente educativo y automático para alumnos verificados de la red Fintly.</p>
                    <p style="color: #6b7280; font-size: 10px; margin: 0; font-weight: 500;">&copy; 2026 Fintly Campus Virtual. Todos los derechos reservados.</p>
                  </div>
                </div>
              </div>
            `
          },
          createdAt: new Date().toISOString()
        });
        console.log(`Successfully queued invitation email document in Firestore 'mail' collection for: ${cleanEmail}`);
      } else {
        // Actualizar el perfil de usuario existente (colegio, nivel y nombre)
        await setDoc(userProfileRef, {
          name: student.name,
          level: student.level,
          school: student.school
        }, { merge: true });
        console.log(`Successfully updated existing user profile for: ${cleanEmail}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
    }
  };

  // Eliminar un alumno descatalogado de Firestore
  const handleDeleteStudent = async (email: string) => {
    const cleanEmail = email.toLowerCase();

    try {
      const docId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      await deleteDoc(doc(db, 'students', docId));
      await deleteDoc(doc(db, 'users', cleanEmail));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
    }
  };

  // Aprobar un usuario con rol 'pausado' y asignarle un rol y curso formal
  const handleApproveUser = async (email: string, targetRole: 'alumno' | 'directivo' | 'admin', level?: number, school?: string) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const userRef = doc(db, 'users', cleanEmail);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.warn(`User by email ${cleanEmail} not found`);
        return;
      }
      const existingData = userSnap.data() as User;
      let finalSchool = school || existingData.school || SIN_ASIGNAR;
      if (targetRole === 'admin') {
        finalSchool = 'Fintly Campus Virtual';
      } else if (targetRole === 'directivo') {
        finalSchool = school || existingData.school || SIN_ASIGNAR;
      } else if (targetRole === 'alumno') {
        finalSchool = school || existingData.school || SIN_ASIGNAR;
      }

      const updatedUser: User = {
        ...existingData,
        role: targetRole,
        level: level !== undefined ? level : (existingData.level || 0),
        school: finalSchool
      };

      await setDoc(userRef, updatedUser);
      console.log(`Successfully approved user ${cleanEmail} to role ${targetRole} for school ${finalSchool}`);

      // Si es aprobado como alumno, asegurarse de que exista su registro en la colección 'students'
      if (targetRole === 'alumno') {
        const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const studentDocRef = doc(db, 'students', studentDocId);
        const studentSnap = await getDoc(studentDocRef);

        const assignedLevel = updatedUser.level || 0;
        const availableClassesCount = classes.filter(cl => cl.level === assignedLevel && !cl.isSyllabus && (cl.school?.toLowerCase() === finalSchool.toLowerCase() || !cl.school)).length;

        const studentRecord: Student = {
          name: updatedUser.name,
          email: cleanEmail,
          initials: updatedUser.initials || updatedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          level: assignedLevel,
          school: finalSchool,
          progress: studentSnap.exists() ? (studentSnap.data() as Student).progress : 0,
          total: studentSnap.exists() ? (studentSnap.data() as Student).total : (availableClassesCount || 32),
          status: studentSnap.exists() ? (studentSnap.data() as Student).status : 'ok',
          registered: true
        };
        await setDoc(studentDocRef, studentRecord);
        console.log(`Created/updated student record for approved user:`, studentRecord);
      }
    } catch (e) {
      console.error("Error approving user role:", e);
      handleFirestoreError(e, OperationType.WRITE, `users/${email}`);
    }
  };

  // Declinar / Eliminar un registro de usuario en 'users'
  const handleDeleteUser = async (email: string) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      await deleteDoc(doc(db, 'users', cleanEmail));
      console.log(`Successfully deleted user record for ${cleanEmail}`);
    } catch (e) {
      console.error("Error deleting user:", e);
      handleFirestoreError(e, OperationType.DELETE, `users/${email}`);
    }
  };

  // Guardar corrección cualitativa y comentario técnico en Firestore (Docentes)
  const handleSaveSubmission = async (submission: ActivitySubmission) => {
    try {
      const docId = submissionIdExistente(submission.studentEmail, submission.classLevel, submission.classModule, submission.classWeek);
      await setDoc(doc(db, 'submissions', docId), submission, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  };

  return (
    <div className={`min-h-screen text-gray-200 font-sans relative flex flex-col antialiased selection:bg-violet-600/35 selection:text-white transition-colors duration-200 ${theme === 'light' ? 'light text-neutral-800' : 'text-gray-200'}`}>
      {/* Fondo Canvas Fluido Interactivo de Fintly */}
      <Background theme={theme} />

      {/* Orbes Líquidos Orgánicos Flotantes de Fondo Decorativos */}
      <div className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-violet-600/15 via-indigo-500/10 to-transparent blur-3xl liquid-blob" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[60%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-violet-600/12 via-indigo-600/8 to-transparent blur-3xl liquid-blob" style={{ animationDelay: '-4s' }} />
        <div className="absolute bottom-[10%] left-[25%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-r from-violet-600/10 via-sky-500/8 to-transparent blur-3xl liquid-blob" style={{ animationDelay: '-8s' }} />
      </div>

      {/* Contenedor Principal Reactivo */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Renderizado de NavBar solo si el usuario inició sesión */}
        {currentUser && (
          <Navbar
            user={currentUser}
            onLogout={handleLogout}
            onNavigateHome={handleNavigateHome}
            theme={theme}
            onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            classes={classes}
            onOpenClass={handleOpenClass}
          />
        )}

        {/* Pantallas del Campus Virtual con transiciones finas de animador */}
        <main className="flex-1 w-full">
          <AnimatePresence mode="wait">
            {/* Hasta que Firebase confirme quien sos no mostramos NINGUNA vista con rol.
                Sin esto, el panel se pintaba a partir de localStorage, que es editable. */}
            {!authInitialized && (
              <motion.div
                key="auth-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center min-h-[70vh] gap-4"
              >
                <span className="relative w-10 h-10">
                  <span className="absolute inset-0 rounded-full border-2 border-violet-500/15" />
                  <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400 animate-spin-slow" />
                </span>
                <span className="text-xs text-slate-500 font-mono tracking-wide">Verificando sesion…</span>
              </motion.div>
            )}

            {authInitialized && currentView === 'login' && (
              <motion.div
                key="login-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Login onGoogleLogin={handleGoogleLogin} externalError={authError} />
              </motion.div>
            )}

            {authInitialized && currentView === 'dashboard' && currentUser && (
              <motion.div
                key="dashboard-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <StudentDashboard
                  user={currentUser}
                  classes={classes}
                  submissions={submissions}
                  onOpenClass={handleOpenClass}
                />
              </motion.div>
            )}

            {authInitialized && currentView === 'classview' && currentUser && activeClassItem && (
              <motion.div
                key="classview-screen"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.35 }}
              >
                <ClassView
                  user={currentUser}
                  classItem={activeClassItem}
                  submissions={submissions}
                  onBack={() => setCurrentView('dashboard')}
                  onSubmitActivity={handleSubmitActivity}
                />
              </motion.div>
            )}

            {authInitialized && currentView === 'pausado' && currentUser && (
              <motion.div
                key="paused-screen"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center min-h-[80vh] px-4"
              >
                <div className="relative max-w-sm w-full">
                  {/* Outer glow */}
                  <div className="absolute -inset-px rounded-[24px] bg-gradient-to-br from-amber-500/15 via-transparent to-orange-500/10 blur-[2px] pointer-events-none" />
                  <div className="relative bg-[#0a0a1a]/90 light:bg-white border border-white/10 light:border-neutral-200 rounded-[22px] p-8 shadow-2xl space-y-6 text-center backdrop-blur-xl">
                    {/* Icon */}
                    <div className="relative mx-auto w-16 h-16">
                      <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping-slow" />
                      <div className="relative w-16 h-16 rounded-full bg-amber-500/12 border border-amber-500/20 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-amber-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="font-display text-xl font-bold text-white light:text-neutral-900 tracking-tight">
                        Cuenta en revisión
                      </h2>
                      <p className="text-gray-400 light:text-neutral-500 text-sm leading-relaxed">
                        Tu cuenta está registrada pero aún no fue habilitada por el equipo directivo.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-500/6 light:bg-amber-50 rounded-xl border border-amber-500/12 light:border-amber-200/60 text-xs text-amber-300 light:text-amber-800 leading-relaxed text-left flex items-start gap-2.5">
                      <span className="mt-0.5 text-amber-400">💬</span>
                      <span>Comunicate con tu equipo docente o directivo para que activen tu acceso y te asignen un nivel.</span>
                    </div>

                    <div className="py-2.5 px-3 bg-white/3 light:bg-neutral-50 rounded-lg border border-white/5 light:border-neutral-200">
                      <span className="text-[10px] text-gray-500 font-mono block">Cuenta registrada como</span>
                      <span className="text-xs text-gray-300 light:text-neutral-700 font-mono font-semibold">{currentUser.email}</span>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] light:bg-neutral-100 light:hover:bg-neutral-200 border border-white/8 light:border-neutral-200 text-gray-400 hover:text-white light:text-neutral-600 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {authInitialized && currentView === 'progress' && currentUser && (
              <motion.div
                key={`progress-screen-${homeResetKey}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
              >
                <StaffProgress
                  students={studentsByState}
                  submissions={submissions}
                  classes={classes}
                  role={currentUser.role as 'directivo'}
                  user={currentUser}
                  onSaveSubmission={handleSaveSubmission}
                />
              </motion.div>
            )}

            {authInitialized && currentView === 'admin' && currentUser && (
              <motion.div
                key={`admin-screen-${homeResetKey}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
              >
                <AdminPanel
                  classes={classes}
                  students={studentsByState}
                  submissions={submissions}
                  allUsers={allUsers}
                  onSaveClass={handleSaveClass}
                  onDeleteClass={handleDeleteClass}
                  onAssignClass={handleAssignClass}
                  onApproveUser={handleApproveUser}
                  onDeleteUser={handleDeleteUser}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

