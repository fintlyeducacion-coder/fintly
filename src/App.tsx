/**
 * App.tsx
 * Orquestador principal de la plataforma educativa interactiva Fintly Campus
 * Totalmente integrado con Firebase Auth y Firestore Database para persistencia y seguridad
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_CLASSES, DEMO_USERS, DEMO_STUDENTS } from './data';
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
import { db, auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
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
import { Clock } from 'lucide-react';

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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fintly_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  
  // Ref para tener acceso al valor más actualizado de currentUser en closures asíncronos y listeners
  const currentUserRef = useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'classview' | 'progress' | 'admin' | 'pausado'>(() => {
    const saved = localStorage.getItem('fintly_logged_user');
    if (saved) {
      try {
        const user = JSON.parse(saved) as User;
        if (user.role === 'admin') return 'admin';
        if (user.role === 'directivo') return 'progress';
        if (user.role === 'pausado') return 'pausado';
        return 'dashboard';
      } catch (err) {
        return 'login';
      }
    }
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

  // --- 2. ESCUCHAR CAMBIOS DE AUTHENTICATION ---
  useEffect(() => {
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

          // Si es el administrador de Fintly Educación, se asegura de que tenga rol de admin y se guarda/actualiza de inmediato
          if (cleanEmail === 'fintlyeducacion@gmail.com' && (!userProfile || userProfile.role !== 'admin')) {
            userProfile = {
              email: cleanEmail,
              name: firebaseUser.displayName || 'Fintly Educación (Admin)',
              role: 'admin',
              initials: 'FE',
              school: 'Fintly Campus Virtual',
              password: '123456'
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
                  school: stData.school || 'Red itinere',
                  password: '123456'
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
              school: 'Red itinere',
              password: '123456'
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
          // Si no hay firebaseUser, ver si hay una sesión activa de correo/contraseña guardada
          const saved = localStorage.getItem('fintly_logged_user');
          const provider = localStorage.getItem('fintly_login_provider');
          if (saved && provider === 'email') {
            try {
              const user = JSON.parse(saved) as User;
              setCurrentUser(user);
            } catch (err) {
              localStorage.removeItem('fintly_logged_user');
              localStorage.removeItem('fintly_login_provider');
              setCurrentUser(null);
              setCurrentView('login');
            }
          } else {
            setCurrentUser(null);
            setCurrentView('login');
          }
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
            const ASSOCIATED_SCHOOLS = [
              'Red itinere'
            ];
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
                ? `syllabus_l${cl.level}_w${cl.week}`
                : `assigned_s${cl.school?.replace(/[^a-zA-Z0-9]/g, '_')}_l${cl.level}_w${cl.week}`;
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
        if (u.role === 'directivo' || u.role === 'alumno') {
          u.school = 'Red itinere';
        } else if (u.role === 'admin') {
          u.school = 'Fintly Campus Virtual';
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
          setStudentsByState([{
            name: currentUser.name,
            email: currentUser.email,
            initials: currentUser.initials,
            level: currentUser.level || 0,
            progress: 0,
            total: 16,
            status: 'ok',
            school: currentUser.school || 'Red itinere'
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

        // Corrección de visualización inmediata en memoria para consistencia
        st.school = 'Red itinere';

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
        console.log("Healing DB: Deleting demo users and updating schools...");
        
        // 1. Eliminar todos los alumnos/usuarios de prueba que estén en la base de datos
        for (const email of DEMO_EMAILS_TO_DELETE) {
          const studentDocId = email.replace(/[^a-zA-Z0-9_.-]/g, '_');
          deleteDoc(doc(db, 'students', studentDocId)).catch(() => {});
          deleteDoc(doc(db, 'users', email)).catch(() => {});
        }

        // 2. Normalizar colegios de usuarios reales en Firestore
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnap.docs) {
          const u = userDoc.data() as User;
          const cleanEmail = u.email?.toLowerCase().trim();
          if (!cleanEmail) continue;

          if (DEMO_EMAILS_TO_DELETE.includes(cleanEmail)) {
            await deleteDoc(doc(db, 'users', cleanEmail)).catch(() => {});
            continue;
          }

          let targetSchool = u.school;
          if (u.role === 'directivo' || u.role === 'alumno') {
            targetSchool = 'Red itinere';
          } else if (u.role === 'admin') {
            targetSchool = 'Fintly Campus Virtual';
          }

          if (u.school !== targetSchool) {
            await setDoc(doc(db, 'users', cleanEmail), { school: targetSchool }, { merge: true });
            console.log(`[Heal] Updated school for user ${cleanEmail} -> ${targetSchool}`);
          }
        }

        // 3. Normalizar colegios de alumnos reales en Firestore
        const studentsSnap = await getDocs(collection(db, 'students'));
        for (const studentDoc of studentsSnap.docs) {
          const st = studentDoc.data() as Student;
          const cleanEmail = st.email?.toLowerCase().trim();
          if (!cleanEmail) continue;

          if (DEMO_EMAILS_TO_DELETE.includes(cleanEmail)) {
            await deleteDoc(doc(db, 'students', studentDoc.id)).catch(() => {});
            continue;
          }

          if (st.school !== 'Red itinere') {
            await setDoc(doc(db, 'students', studentDoc.id), { school: 'Red itinere' }, { merge: true });
            console.log(`[Heal] Updated school for student record ${cleanEmail} -> Red itinere`);
          }
        }
        console.log("Database healing completed!");
      } catch (err) {
        console.warn("Could not execute full database healing (possible read/write restriction):", err);
      }
    };

    runDatabaseHealing();
  }, [currentUser, authInitialized]);

  // Sincronizar el tema activo con la clase del body
  useEffect(() => {
    localStorage.setItem('fc_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  // Mantener actualizado el progreso de cada estudiante basándose en las entregas reales en la base de datos
  useEffect(() => {
    if (classes.length === 0 || studentsByState.length === 0 || submissions.length === 0) return;
    if (!currentUser) return;

    const updateStudentProgressesOnServer = async () => {
      for (const student of studentsByState) {
        const studentEmail = student.email || 'alumno@fintly.pro';
        const studentSubmissions = submissions.filter(
          (sub) => sub.studentEmail.toLowerCase() === studentEmail.toLowerCase()
        );
        const courseClasses = classes.filter((cl) => cl.level === student.level && !cl.isSyllabus);
        const totalClassesCount = courseClasses.length || 1;
        const progress = studentSubmissions.length;
        
        const isBehind = totalClassesCount > 0 && progress < Math.ceil(totalClassesCount / 1.5);
        const status = isBehind ? 'warn' : 'ok';

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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error("Google Sign-In failed:", e);
      setAuthError("No se pudo iniciar sesión con Google. Intentá nuevamente.");
    }
  };

  const handleLogin = async (email: string, password?: string) => {
    setAuthError('');
    setCurrentUser(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password || '';

    // 1. Buscar si tiene datos en la colección 'users' o 'students' de Firestore
    let userProfile: User | null = null;
    let studentData: Student | null = null;

    try {
      const userSnap = await getDoc(doc(db, 'users', cleanEmail));
      if (userSnap.exists()) {
        userProfile = userSnap.data() as User;
      }
    } catch (e) {
      console.warn("Failed to read user doc directly:", e);
      handleFirestoreError(e, OperationType.GET, `users/${cleanEmail}`);
    }

    try {
      const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const studentSnap = await getDoc(doc(db, 'students', studentDocId));
      if (studentSnap.exists()) {
        studentData = studentSnap.data() as Student;
        // Si no tenía perfil en 'users', creamos uno al vuelo
        if (!userProfile) {
          userProfile = {
            email: cleanEmail,
            name: studentData.name,
            role: 'alumno',
            initials: studentData.initials || studentData.name[0].toUpperCase(),
            level: studentData.level,
            school: studentData.school || 'Red itinere',
            password: '123456' // Contraseña por defecto para alumnos invitados
          };
          await setDoc(doc(db, 'users', cleanEmail), userProfile);
        }
      }
    } catch (e) {
      console.warn("Failed to read student doc directly:", e);
      const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      handleFirestoreError(e, OperationType.GET, `students/${studentDocId}`);
    }



    // 3. Validar si existe en la base de datos
    if (!userProfile) {
      throw new Error("No encontramos una cuenta registrada con este correo institucional. Comunicate con tu docente para recibir tu invitación.");
    }

    // 4. Validar la contraseña suministrada
    if (userProfile.password !== cleanPassword) {
      throw new Error("Contraseña incorrecta. Por favor verificala.");
    }

    // 5. Intentar login en Firebase Auth en background para tokens de sesión
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    } catch (authErr: any) {
      console.warn("Firebase Auth native login failed or was bypassed:", authErr.code);
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
        // Si no existe el usuario en Auth pero sí en nuestra base de datos con esa contraseña, creamos la Auth account al vuelo!
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } catch (createErr: any) {
          console.warn("Could not auto-create Firebase Auth account in background:", createErr);
        }
      }
    }

    // 6. Completar sesión local exitosa
    setCurrentUser(userProfile);
    localStorage.setItem('fintly_logged_user', JSON.stringify(userProfile));
    localStorage.setItem('fintly_login_provider', 'email');

    // Enrutar al panel correspondiente de forma automática
    if (userProfile.role === 'admin') {
      setCurrentView('admin');
    } else if (userProfile.role === 'directivo') {
      setCurrentView('progress');
    } else {
      setCurrentView('dashboard');
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
    const targetClass = classes.find((cl) => cl.level === level && cl.week === week);
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
      classWeek: activeClassItem.week,
      studentEmail: currentUser.email.toLowerCase(),
      responseText: responseText.trim(),
      submittedAt: new Date().toISOString()
    };

    try {
      const docId = `${currentUser.email.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_')}_l${activeClassItem.level}_w${activeClassItem.week}`;
      await setDoc(doc(db, 'submissions', docId), newSubmission);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  };

  // Crear o guardar cambios de una clase en Firestore (Admin)
  const handleSaveClass = async (classItem: ClassItem, oldKey?: { level: number; week: number }) => {
    try {
      const docId = classItem.isSyllabus 
        ? `syllabus_l${classItem.level}_w${classItem.week}`
        : `assigned_s${classItem.school?.replace(/[^a-zA-Z0-9]/g, '_')}_l${classItem.level}_w${classItem.week}`;

      if (oldKey && (oldKey.level !== classItem.level || oldKey.week !== classItem.week)) {
        const oldDocId = classItem.isSyllabus 
          ? `syllabus_l${oldKey.level}_w${oldKey.week}`
          : `assigned_s${classItem.school?.replace(/[^a-zA-Z0-9]/g, '_')}_l${oldKey.level}_w${oldKey.week}`;
        await deleteDoc(doc(db, 'classes', oldDocId));
      }

      await setDoc(doc(db, 'classes', docId), classItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
    }
  };

  // Subir / publicar una clase a múltiples colegios con fechas dinámicas en Firestore (Admin)
  const handleAssignClass = async (sourceClass: ClassItem, schools: string[], unlockAt: string, deadline: string) => {
    try {
      for (const schoolName of schools) {
        const docId = `assigned_s${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_l${sourceClass.level}_w${sourceClass.week}`;
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
    }
  };

  // Borrar una clase en Firestore (Admin)
  const handleDeleteClass = async (level: number, week: number, school?: string, id?: string) => {
    try {
      // 1. Intentar borrar por ID exacto si se recibe
      if (id) {
        await deleteDoc(doc(db, 'classes', id));
      }

      // 2. Borrar posibles variantes de ID de documento por seguridad
      if (school) {
        // Variante 1: Casing original con reemplazo de raros
        const docId1 = `assigned_s${school.replace(/[^a-zA-Z0-9]/g, '_')}_l${level}_w${week}`;
        await deleteDoc(doc(db, 'classes', docId1));

        // Variante 2: Lowercase del reemplazo
        const docId2 = `assigned_s${school.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}_l${level}_w${week}`;
        await deleteDoc(doc(db, 'classes', docId2));

        // Variante 3: Normalizado sin tildes
        const normalized = school.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const docId3 = `assigned_s${normalized.replace(/[^a-zA-Z0-9]/g, '_')}_l${level}_w${week}`;
        await deleteDoc(doc(db, 'classes', docId3));

        // Variante 4: Normalizado sin tildes en lowercase
        const docId4 = `assigned_s${normalized.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}_l${level}_w${week}`;
        await deleteDoc(doc(db, 'classes', docId4));
      } else {
        const docId = `syllabus_l${level}_w${week}`;
        await deleteDoc(doc(db, 'classes', docId));
      }

      const matchingSubmissions = submissions.filter((sub) => {
        if (school) {
          const studentObj = studentsByState.find(st => st.email?.toLowerCase() === sub.studentEmail.toLowerCase());
          const isFromSchool = studentObj?.school?.toLowerCase() === school.toLowerCase();
          return sub.classLevel === level && sub.classWeek === week && isFromSchool;
        } else {
          return sub.classLevel === level && sub.classWeek === week;
        }
      });

      for (const sub of matchingSubmissions) {
        const subDocId = `${sub.studentEmail.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_')}_l${sub.classLevel}_w${sub.classWeek}`;
        await deleteDoc(doc(db, 'submissions', subDocId));
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
          school: student.school,
          password: '123456' // Contraseña por defecto para nuevos alumnos invitados
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
      let finalSchool = 'Red itinere';
      if (targetRole === 'admin') {
        finalSchool = 'Fintly Campus Virtual';
      } else if (targetRole === 'directivo') {
        finalSchool = 'Red itinere';
      } else if (targetRole === 'alumno') {
        finalSchool = school || existingData.school || 'Red itinere';
        if (finalSchool !== 'Red itinere') {
          finalSchool = 'Red itinere';
        }
      }

      const updatedUser: User = {
        ...existingData,
        role: targetRole,
        level: level !== undefined ? level : (existingData.level || 0),
        school: finalSchool
      };

      await setDoc(userRef, updatedUser);
      console.log(`Successfully approved user ${cleanEmail} to role ${targetRole}`);

      // Si es aprobado como alumno, asegurarse de que exista su registro en la colección 'students'
      if (targetRole === 'alumno') {
        const studentDocId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const studentDocRef = doc(db, 'students', studentDocId);
        const studentSnap = await getDoc(studentDocRef);

        const studentRecord: Student = {
          name: updatedUser.name,
          email: cleanEmail,
          initials: updatedUser.initials || updatedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          level: updatedUser.level || 0,
          school: finalSchool,
          progress: studentSnap.exists() ? (studentSnap.data() as Student).progress : 0,
          total: studentSnap.exists() ? (studentSnap.data() as Student).total : 16,
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
      const docId = `${submission.studentEmail.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_')}_l${submission.classLevel}_w${submission.classWeek}`;
      await setDoc(doc(db, 'submissions', docId), submission, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  };

  // Crear registro individual de alumno y vincular credenciales
  const handleRegisterWithEmail = async (email: string, password: string, name: string) => {
    setAuthError('');
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Validar que se encuentre previamente invitado por el colegio en la lista de alumnos directamente en Firestore
    const docId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const studentDocRef = doc(db, 'students', docId);
    let studentData: Student | null = null;
    
    try {
      const studentSnap = await getDoc(studentDocRef);
      if (!studentSnap.exists()) {
        throw new Error("Lamentablemente tu correo institucional no se encuentra en la lista de alumnos invitados. Por favor contactá a tu docente de curso.");
      }
      studentData = studentSnap.data() as Student;
    } catch (e: any) {
      if (e.message && e.message.includes("invitados")) {
        throw e;
      }
      // Fallback local en caso de que Firestore falle por falta de red, etc.
      const foundInState = studentsByState.find(s => s.email?.toLowerCase() === cleanEmail);
      if (!foundInState) {
        throw new Error("Lamentablemente tu correo institucional no se encuentra en la lista de alumnos invitados. Por favor contactá a tu docente de curso.");
      }
      studentData = foundInState;
    }

    // 2. Registrar en Firebase Auth
    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        console.warn("Email-password auth is currently disabled in Firebase, relying on direct Firestore persistence.");
      } else if (err.code === 'auth/email-already-in-use') {
        throw new Error("Este correo electrónico ya tiene una cuenta registrada. Podés iniciar sesión directamente o contactar soporte.");
      } else {
        throw err;
      }
    }

    // 3. Crear el documento completo en la coleccion de users de Firestore
    const initials = studentData.initials || name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AL';
    const newUserProfile: User = {
      email: cleanEmail,
      name: studentData.name || name.trim(),
      role: 'alumno',
      initials,
      level: studentData.level,
      school: studentData.school,
      password: password // Almacenamos la contraseña de manera segura en el documento del usuario para inicios de sesión híbridos resilientes
    };

    try {
      await setDoc(doc(db, 'users', cleanEmail), newUserProfile);
      
      // 4. Actualizar el alumno asignándole registrado: true
      await setDoc(studentDocRef, { ...studentData, registered: true }, { merge: true });
    } catch (dbErr) {
      console.error("Database registration records could not be fully written (possible write permission issue):", dbErr);
    }

    // 5. Configurar sesión de React y localStorage para persistencia híbrida segura
    setCurrentUser(newUserProfile);
    localStorage.setItem('fintly_logged_user', JSON.stringify(newUserProfile));
    localStorage.setItem('fintly_login_provider', 'email');
    setCurrentView('dashboard');
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
          />
        )}

        {/* Pantallas del Campus Virtual con transiciones finas de animador */}
        <main className="flex-1 w-full">
          <AnimatePresence mode="wait">
            {currentView === 'login' && (
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

            {currentView === 'dashboard' && currentUser && (
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

            {currentView === 'classview' && currentUser && activeClassItem && (
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

            {currentView === 'pausado' && currentUser && (
              <motion.div
                key="paused-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="max-w-md mx-auto px-6 py-16 text-center"
              >
                <div className="bg-neutral-900/80 light:bg-white p-8 rounded-2xl border border-white/5 light:border-neutral-200 shadow-2xl space-y-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white light:text-neutral-900 tracking-tight">
                      Cuenta Pendiente de Activación
                    </h2>
                    <p className="text-gray-400 light:text-neutral-500 text-sm leading-relaxed">
                      Lo sentimos, pero tu cuenta todavía no se encuentra registrada o habilitada en la plataforma.
                    </p>
                  </div>

                  <div className="p-4 bg-amber-500/5 light:bg-amber-50 rounded-xl border border-amber-500/10 text-xs text-amber-200 light:text-amber-800 leading-normal text-left">
                    Ponte en contacto con tu equipo directivo para activar tu cuenta y asignarte un rol.
                  </div>

                  <div className="text-gray-500 text-[10px] font-mono">
                    Registrado como: {currentUser.email}
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 light:bg-neutral-100 light:hover:bg-neutral-200 border border-white/10 light:border-neutral-200 text-gray-300 light:text-neutral-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </motion.div>
            )}

            {currentView === 'progress' && currentUser && (
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

            {currentView === 'admin' && currentUser && (
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
                  onSaveStudent={handleSaveStudent}
                  onDeleteStudent={handleDeleteStudent}
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
