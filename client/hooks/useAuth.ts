import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

interface AuthReturn {
  user: any;
  userRole: string | null;
  userData: any;
}

export function useAuth(): AuthReturn {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // First, try to get data from localStorage for immediate use
    const storedRole = localStorage.getItem("userRole");
    const storedUID = localStorage.getItem("uid");
    const storedUserName = localStorage.getItem("userName");
    const storedUserEmail = localStorage.getItem("userEmail");

    console.log('🔍 useAuth: localStorage data:', {
      storedRole,
      storedUID,
      storedUserName,
      storedUserEmail
    });

    if (storedRole && storedUID) {
      // Create a user object from localStorage data
      const localUser = {
        uid: storedUID,
        email: storedUserEmail || '',
        displayName: storedUserName || 'Utente'
      };

      setUser(localUser);
      setUserRole(storedRole);
      setUserData({
        uid: storedUID,
        ruolo: storedRole,
        nome: storedUserName?.split(' ')[0] || '',
        cognome: storedUserName?.split(' ')[1] || '',
        fullName: storedUserName || 'Utente'
      });

      console.log('✅ useAuth: Set user data from localStorage:', {
        uid: storedUID,
        role: storedRole,
        name: storedUserName
      });
    } else {
      console.log('⚠️ useAuth: No complete localStorage data found');
    }

    // Only try Firebase if we don't have localStorage data or to sync updates
    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      console.log('🔥 useAuth: Firebase auth state changed:', firebaseUser ? 'User found' : 'No user');

      if (firebaseUser) {
        // Update with Firebase user if available
        setUser(firebaseUser);
        console.log('✅ useAuth: Firebase user authenticated:', firebaseUser.uid);

        try {
          const docRef = doc(db, "utenti", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const firebaseRole = data.ruolo?.toLowerCase() || storedRole || "consulente";

            setUserRole(firebaseRole);
            setUserData({ ...data, uid: firebaseUser.uid });

            // Update localStorage with Firebase data if different
            if (firebaseRole !== storedRole) {
              localStorage.setItem("userRole", firebaseRole);
            }
            if (data.fullName && data.fullName !== storedUserName) {
              localStorage.setItem("userName", data.fullName);
            }
          } else {
            // Firebase doc doesn't exist, keep localStorage data if available
            if (!storedRole || !storedUID) {
              // Only clear if we don't have localStorage fallback
              setUser(null);
              setUserRole(null);
              setUserData(null);
            }
          }
        } catch (error) {
          console.error("Error fetching user data from Firebase:", error);
          // Keep localStorage data on Firebase error if available
          if (!storedRole || !storedUID) {
            setUser(null);
            setUserRole(null);
            setUserData(null);
          }
        }
      } else {
        // Only clear if we don't have localStorage data
        if (!storedRole || !storedUID) {
          setUser(null);
          setUserRole(null);
          setUserData(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, userRole, userData };
}
