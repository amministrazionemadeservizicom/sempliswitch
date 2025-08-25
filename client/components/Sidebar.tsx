import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Home,
  Plus,
  FileText,
  BarChart3,
  Settings,
  Users,
  Zap,
  TrendingUp,
  Calculator,
  Coins,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard", roles: ["consulente", "backoffice"] },
  { id: "admin-dashboard", label: "Dashboard", icon: Home, href: "/admin-dashboard", roles: ["admin"] },
  { id: "master-dashboard", label: "Dashboard", icon: Home, href: "/dashboard", roles: ["master"] },
  { id: "new-practice", label: "Nuova Pratica", icon: Plus, href: "/new-practice", roles: ["consulente", "backoffice", "admin", "master"] },
  { id: "contracts", label: "Contratti", icon: ClipboardList, href: "/contracts", roles: ["consulente", "backoffice", "admin", "master"] },
  { id: "offers", label: "Offerte", icon: TrendingUp, href: "/offers", roles: ["admin", "master"] },
  { id: "simulation", label: "Simulazione", icon: Calculator, href: "/simulation", roles: ["consulente", "master"] },
  { id: "commissions", label: "Provvigioni", icon: Coins, href: "/commissions", roles: ["admin", "master"] },
  { id: "processing", label: "Stato Lavorazione", icon: BarChart3, href: "/processing", roles: ["backoffice", "admin", "master"] },
  { id: "users", label: "Gestione Utenti", icon: Users, href: "/users", roles: ["admin"] },
  { id: "commission-plans", label: "Piani Compensi", icon: Coins, href: "/commission-plans", roles: ["admin"] },
  { id: "admin-offers", label: "Gestione Offerte", icon: Zap, href: "/AdminOffers", roles: ["admin"] },
  { id: "reports", label: "Report", icon: BarChart3, href: "/reports", roles: ["admin", "master"] },
  { id: "settings", label: "Configurazioni", icon: Settings, href: "/settings", roles: ["admin"] },
];

interface SidebarProps {
  userRole: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  userFullName?: string;
  onUserClick?: () => void;
}

export default function Sidebar({ userRole, isCollapsed = false, onToggle, userFullName = "Utente", onUserClick }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState<MenuItem[]>([]);
  const [overflowItems, setOverflowItems] = useState<MenuItem[]>([]);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const filteredMenuItems = useMemo(() => {
    const filtered = menuItems.filter(item => item.roles.includes(userRole));
    console.log('🔍 Sidebar - userRole:', userRole, 'filtered items:', filtered.length);
    return filtered;
  }, [userRole]);

  // Calculate initials from userFullName
  const initials = (userFullName && userFullName !== 'Utente')
    ? userFullName
        .split(' ')
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('')
    : 'U';

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Calculate visible and overflow items for mobile
  useEffect(() => {
    const calculateVisibleItems = () => {
      if (typeof window === 'undefined') return;
      
      const screenWidth = window.innerWidth;
      if (screenWidth >= 1024) return; // Only for mobile screens
      
      // Estimate how many items can fit
      // Each item needs roughly 80px, plus hamburger button (40px), plus some padding
      const availableWidth = screenWidth - 100; // Account for padding and hamburger
      const itemWidth = 80;
      const maxVisibleItems = Math.max(1, Math.floor(availableWidth / itemWidth));
      
      const visible = filteredMenuItems.slice(0, maxVisibleItems - 1); // Reserve space for hamburger
      const overflow = filteredMenuItems.slice(maxVisibleItems - 1);
      
      setVisibleItems(visible);
      setOverflowItems(overflow);
    };

    calculateVisibleItems();
    window.addEventListener('resize', calculateVisibleItems);
    return () => window.removeEventListener('resize', calculateVisibleItems);
  }, [filteredMenuItems]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Desktop Sidebar - Keep exactly as before */}
      <div className={cn(
        "hidden lg:flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )} style={{ backgroundColor: '#F2C927' }}>
                
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-yellow-600 border-opacity-30">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-black rounded-lg">
                <Zap className="h-4 w-4 text-yellow-400" />
              </div>
              <span className="font-semibold text-gray-900">Pratiche</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2 hover:bg-black hover:bg-opacity-10 text-[#333333]"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 mx-2 text-sm transition-all duration-200",
                    isActive
                      ? "bg-white text-gray-900 font-semibold rounded-r-2xl border-l-4 border-[#E6007E] shadow-sm"
                      : "text-gray-800 hover:text-gray-900 hover:bg-black hover:bg-opacity-5 rounded-lg"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-[#E6007E]" : "text-[#333333]"
                    )}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
        
        {/* User Info + Logout */}
        <div className="p-4 border-t border-yellow-600 border-opacity-30 space-y-3">
          {isCollapsed ? (
            <>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center justify-center w-8 h-8 bg-black rounded-full text-yellow-400 font-semibold text-sm mx-auto hover:bg-opacity-80 transition-all"
                title={`${userFullName || 'Utente'} - Clicca per vedere il profilo`}
              >
                {initials}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full text-[#333333] hover:text-red-600 transition"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/profile')}
                className="text-sm text-[#333333] w-full text-left p-2 hover:bg-black hover:bg-opacity-5 rounded-lg transition-colors"
              >
                <div className="font-medium">{userFullName || 'Utente'}</div>
                <div className="capitalize text-xs opacity-70">{userRole}</div>
                <div className="text-xs opacity-50 mt-1">Clicca per vedere il profilo</div>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-[#333333] hover:text-red-600 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </div>

     {/* Mobile Bottom Fixed Menu */}
<div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-yellow-600/30 shadow-lg"
     style={{ backgroundColor: '#F2C927' }}>
  <div className="flex items-center justify-between px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
    {/* Voci visibili */}
    <div className="flex items-center space-x-1 flex-1 overflow-hidden">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;

        return (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-w-[72px]",
              isActive
                ? "bg-white text-gray-900"          // pill bianca per la voce attiva
                : "text-[#333333] hover:bg-black/10" // testo scuro su giallo
            )}
          >
            <Icon className={cn("h-5 w-5 flex-shrink-0",
              isActive ? "text-[#E6007E]" : "text-[#333333]")} />
            <span className="text-xs mt-1 truncate w-full text-center">
              {item.label.length > 9 ? item.label.substring(0, 9) + "…" : item.label}
            </span>
          </Link>
        );
      })}
    </div>

    {/* Voce fissa: Altro (apre l'hamburger) */}
    <button
      onClick={() => setIsMobileMenuOpen((v) => !v)}
      className="ml-1 flex flex-col items-center justify-center px-3 py-2 rounded-lg text-[#333333] hover:bg-black/10 min-w-[72px] flex-shrink-0"
      aria-label="Apri menu"
    >
      <Menu className="h-5 w-5" />
      <span className="text-xs mt-1">Altro</span>
    </button>
  </div>
</div>
      {/* Mobile Overflow Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div 
            ref={mobileMenuRef}
            className="fixed right-0 top-0 h-full w-80 max-w-[80vw] bg-white shadow-xl transform transition-transform duration-300"
            style={{ backgroundColor: '#F2C927' }}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-yellow-600 border-opacity-30">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-black rounded-lg">
                  <Zap className="h-4 w-4 text-yellow-400" />
                </div>
                <span className="font-semibold text-gray-900">Menu</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-black hover:bg-opacity-10 text-[#333333]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Menu Items - Show ALL filtered menu items */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 mx-2 text-sm transition-all duration-200",
                        isActive
                          ? "bg-white text-gray-900 font-semibold rounded-r-2xl border-l-4 border-[#E6007E] shadow-sm"
                          : "text-gray-800 hover:text-gray-900 hover:bg-black hover:bg-opacity-5 rounded-lg"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive ? "text-[#E6007E]" : "text-[#333333]"
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* User Info + Logout in Mobile Menu */}
            <div className="p-4 border-t border-yellow-600 border-opacity-30 space-y-3">
              <button
                onClick={() => {
                  navigate('/profile');
                  setIsMobileMenuOpen(false);
                }}
                className="text-sm text-[#333333] w-full text-left p-2 hover:bg-black hover:bg-opacity-5 rounded-lg transition-colors"
              >
                <div className="font-medium">{userFullName || 'Utente'}</div>
                <div className="capitalize text-xs opacity-70">{userRole}</div>
                <div className="text-xs opacity-50 mt-1">Clicca per vedere il profilo</div>
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm text-[#333333] hover:text-red-600 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
