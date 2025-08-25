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
    // First, try to get role from localStorage for immediate use
    const storedRole = localStorage.getItem("userRole");
    const storedUID = localStorage.getItem("uid");

    if (storedRole) {
      setUserRole(storedRole);
    }

    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

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
          } else {
            // Firebase doc doesn't exist, use localStorage role if available
            const fallbackRole = storedRole || "consulente";
            setUserRole(fallbackRole);
            setUserData({ uid: firebaseUser.uid, ruolo: fallbackRole });
          }
        } catch (error) {
          console.error("Error fetching user data from Firebase:", error);
          // Fallback to localStorage role on Firebase error
          const fallbackRole = storedRole || "consulente";
          setUserRole(fallbackRole);
          setUserData({ uid: firebaseUser.uid, ruolo: fallbackRole });
        }
      } else {
        setUser(null);
        setUserRole(null);
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, userRole, userData };
}
