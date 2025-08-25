import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ProfileModal from "./ProfileModal";
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const uid = localStorage.getItem("uid");
        if (!uid) {
          setUserFullName("Utente");
          setUserData(null);
          return;
        }

        const userDoc = await getDoc(doc(db, "utenti", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({ ...data, uid });

          // Try fullName first, then concatenate nome + cognome, fallback to "Utente"
          const fullName = data.fullName ||
                            (data.nome && data.cognome ? `${data.nome} ${data.cognome}` : null) ||
                           "Utente";
          setUserFullName(fullName);
        } else {
          setUserFullName("Utente");
          setUserData(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserFullName("Utente");
        setUserData(null);
      }
    };

    fetchUserData();
  }, []);

  const handleUserDataUpdate = (updatedData: any) => {
    setUserData(updatedData);
    const fullName = updatedData.fullName ||
                      (updatedData.nome && updatedData.cognome ? `${updatedData.nome} ${updatedData.cognome}` : null) ||
                     "Utente";
    setUserFullName(fullName);
  };

  const handleUserClick = () => {
    setIsProfileModalOpen(true);
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
      userFullName={userFullName}  // 👈 passa il nome/cognome alla Sidebar
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
              <span className="text-sm" style={{ color: '#333333' }}>
                <User className="h-4 w-4 inline mr-1" />
                {userFullName}
              </span>
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
              <span className="text-sm font-semibold text-gray-800">
                <User className="h-4 w-4 inline mr-1" />
                {userFullName}
              </span>
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
