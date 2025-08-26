// src/App.tsx
import "../client/global.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// PAGINE (client/pages)
import BillCheck from "../client/pages/wizard/BillCheck";
import ProductFinder from "../client/pages/ProductFinder";
import Index from "../client/pages/Index";
import Dashboard from "../client/pages/Dashboard";
import AdminDashboard from "../client/pages/AdminDashboard";
import NewPractice from "../client/pages/NewPractice";
import Offers from "../client/pages/Offers";
import Simulation from "../client/pages/Simulation";
import Commissions from "../client/pages/Commissions";
import CommissionPlans from "../client/pages/CommissionPlans";
import Contracts from "../client/pages/Contracts";
import CompileContract from "../client/pages/CompileContract";
import WidgetTest from "../client/pages/WidgetTest";
import Profile from "../client/pages/Profile";
import AdminOffers from "../client/pages/AdminOffers";
import NotFound from "../client/pages/NotFound";
import CreateUser from "../client/pages/CreateUser";
import Users from "../client/pages/users";
import WorkQueue from "../client/pages/WorkQueue";
import Processing from "../client/pages/Processing";

// LOGIN FORM (se davvero è qui)
import LoginForm from "./components/LoginForm";

// auth hook
import { useAuth } from "../client/hooks/useAuth";

const queryClient = new QueryClient();

const App = () => {
  const { userRole } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Login / landing */}
            <Route path="/" element={<LoginForm />} />
            <Route path="/index" element={<Index />} />

            {/* Dashboard: se admin -> reindirizza alla admin dashboard */}
            <Route
              path="/dashboard"
              element={
                userRole === "admin"
                  ? <Navigate to="/admin-dashboard" replace />
                  : <Dashboard userRole={userRole || "consulente"} />
              }
            />

            {/* Admin Dashboard (protetta) */}
            <Route
              path="/admin-dashboard"
              element={
                userRole === "admin" ? (
                  <AdminDashboard />
                ) : (
                  <p style={{ padding: "2rem", fontSize: 18, color: "red" }}>
                    Accesso negato: questa pagina è riservata agli admin.
                  </p>
                )
              }
            />

            {/* Users (protetta) */}
            <Route path="/users" element={<Users />} />

            {/* Work Queue (protetta - solo back office e admin) */}
            <Route
              path="/work-queue"
              element={
                (userRole === "admin" || userRole === "back office") ? (
                  <WorkQueue />
                ) : (
                  <p style={{ padding: "2rem", fontSize: 18, color: "red" }}>
                    Accesso negato: questa pagina è riservata agli operatori Back Office e Admin.
                  </p>
                )
              }
            />

            {/* Processing Status (protetta - back office, admin e master) */}
            <Route
              path="/processing"
              element={
                (userRole === "admin" || userRole === "back office" || userRole === "master") ? (
                  <Processing />
                ) : (
                  <p style={{ padding: "2rem", fontSize: 18, color: "red" }}>
                    Accesso negato: questa pagina è riservata agli operatori Back Office, Admin e Master.
                  </p>
                )
              }
            />

            {/* Create user (protetta) */}
            <Route
              path="/create-user"
              element={
                (userRole === "admin" || userRole === "master") ? (
                  <CreateUser />
                ) : (
                  <p style={{ padding: "2rem", fontSize: 18, color: "red" }}>
                    Accesso negato: questa pagina è riservata agli admin e master.
                  </p>
                )
              }
            />

            {/* Pratica / Offerte */}
            <Route path="/new-practice" element={<NewPractice />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/AdminOffers" element={<AdminOffers />} />

            {/* Varie */}
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/commissions" element={<Commissions />} />
            <Route path="/commission-plans" element={<CommissionPlans />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/compile-contract" element={<CompileContract />} />
            <Route path="/widget-test" element={<WidgetTest />} />
            <Route path="/profile" element={<Profile />} />

            {/* Wizard + Product Finder */}
            <Route path="/wizard/bill-check" element={<BillCheck />} />
            <Route path="/product-finder" element={<ProductFinder />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
