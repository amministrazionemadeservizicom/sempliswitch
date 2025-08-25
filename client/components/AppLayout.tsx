import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

interface AppLayoutProps {
  children: React.ReactNode;
  userRole?: string;
  showNavigation?: boolean;
}

export default function AppLayout({
  children,
  userRole = "consulente",
  showNavigation = true
}: AppLayoutProps) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userFullName, setUserFullName] = useState<string>("");
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const uid = localStorage.getItem("uid");
        const storedUserName = localStorage.getItem("userName");
        const storedUserRole = localStorage.getItem("userRole");
        const storedUserEmail = localStorage.getItem("userEmail");

        console.log('🔍 AppLayout: localStorage data:', {
          uid,
          userName: storedUserName,
          userRole: storedUserRole,
          userEmail: storedUserEmail
        });

        // First, set data from localStorage immediately
        if (storedUserName && storedUserName !== 'Utente') {
          setUserFullName(storedUserName);
          console.log('✅ AppLayout: Set userFullName from localStorage:', storedUserName);
        }

        if (!uid) {
          setUserFullName(storedUserName || "Utente");
          setUserData(null);
          return;
        }

        // Then try to get updated data from Firebase
        try {
          const userDoc = await getDoc(doc(db, "utenti", uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({ ...data, uid });

            // Handle both possible field name formats and update localStorage if needed
            const nome = data.nome || data.Nome || "";
            const cognome = data.cognome || data.Cognome || "";
            const fullName = data.fullName ||
                              (nome && cognome ? `${nome} ${cognome}`.trim() : null) ||
                              storedUserName ||
                              "Utente";

            setUserFullName(fullName);

            // Update localStorage if Firebase has newer data
            if (fullName !== storedUserName && fullName !== "Utente") {
              localStorage.setItem("userName", fullName);
            }

            console.log('✅ AppLayout: Updated userFullName from Firebase:', fullName);
          } else {
            // Firebase doc doesn't exist, keep localStorage data
            setUserFullName(storedUserName || "Utente");
            console.log('⚠️ AppLayout: No Firebase doc, using localStorage:', storedUserName);
          }
        } catch (firebaseError) {
          // Firebase error, keep localStorage data
          console.warn('Firebase error in AppLayout, using localStorage:', firebaseError);
          setUserFullName(storedUserName || "Utente");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        const storedUserName = localStorage.getItem("userName");
        setUserFullName(storedUserName || "Utente");
        setUserData(null);
      }
    };

    fetchUserData();
  }, []);


  const handleUserClick = () => {
    navigate('/profile');
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop Sidebar */}
      <Sidebar
        userRole={userRole}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userFullName={userFullName}
        onUserClick={handleUserClick}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden border-b border-gray-200 p-4" style={{ backgroundColor: '#F2C927' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-black rounded-lg">
                <span className="text-yellow-400 text-sm font-bold">P</span>
              </div>
              <span className="font-semibold" style={{ color: '#333333' }}>Pratiche</span>
            </div>
                       
            <div className="flex items-center gap-2">
              <button
                onClick={handleUserClick}
                className="text-sm hover:bg-black hover:bg-opacity-10 px-2 py-1 rounded-lg transition-colors"
                style={{ color: '#333333' }}
                title="Vai al mio profilo"
              >
                <User className="h-4 w-4 inline mr-1" />
                {userFullName || 'Utente'}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hover:bg-black hover:bg-opacity-10"
                style={{ color: '#333333' }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block border-b border-gray-200" style={{ backgroundColor: '#F2C927' }}>
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-black rounded-lg">
                <span className="text-yellow-400 text-sm font-bold">P</span>
              </div>
              <span className="font-semibold" style={{ color: '#333333' }}>Pratiche</span>
            </div>
                       
            <div className="flex items-center gap-3">
              <button
                onClick={handleUserClick}
                className="text-sm font-semibold text-gray-800 hover:bg-black hover:bg-opacity-10 px-3 py-1 rounded-lg transition-colors"
                title="Vai al mio profilo"
              >
                <User className="h-4 w-4 inline mr-1" />
                {userFullName || 'Utente'}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hover:bg-black hover:bg-opacity-10 text-[#333333]"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-1">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>

    </div>
  );
}
