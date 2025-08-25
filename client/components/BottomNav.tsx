import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  ClipboardList,
  Calculator,
  FileText,
  Plus
} from "lucide-react";

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: string[];
}

const bottomNavItems: BottomNavItem[] = [
  { id: "home", label: "Dashboard", icon: Home, href: "/dashboard", roles: ["consulente", "backoffice"] },
  { id: "admin-home", label: "Dashboard", icon: Home, href: "/admin-dashboard", roles: ["admin"] },
  { id: "offers", label: "Offerte", icon: ClipboardList, href: "/offers", roles: ["consulente", "backoffice", "admin"] },
  { id: "simulator", label: "Simulatore", icon: Calculator, href: "/simulation", roles: ["consulente", "backoffice", "admin"] },
  { id: "contracts", label: "Contratti", icon: FileText, href: "/contracts", roles: ["consulente", "backoffice", "admin"] },
  { id: "new-practice", label: "Nuova", icon: Plus, href: "/new-practice", roles: ["consulente"] },
];

interface BottomNavProps {
  userRole: string;
}

export default function BottomNav({ userRole }: BottomNavProps) {
  const location = useLocation();
  
  const filteredNavItems = bottomNavItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-yellow-600 border-opacity-30 z-50"
      style={{ backgroundColor: '#F2C927' }}
    >
      <div className="grid grid-cols-4 md:grid-cols-5 max-w-md mx-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-1 text-xs transition-colors",
                isActive
                  ? "bg-white bg-opacity-20"
                  : "hover:bg-black hover:bg-opacity-5"
              )}
            >
              <Icon
                className="h-5 w-5 mb-1"
                style={{ color: isActive ? '#E6007E' : '#333333' }}
              />
              <span
                className="text-[10px] leading-none font-medium"
                style={{ color: isActive ? '#E6007E' : '#333333' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
