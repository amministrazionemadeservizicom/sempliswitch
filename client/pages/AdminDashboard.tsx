import { useAuth } from "../hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  DollarSign,
} from "lucide-react";

export default function AdminDashboard() {
  const { userRole } = useAuth();

  if (userRole === null) {
    return (
      <div className="p-6 text-center text-blue-600 font-medium">
        Caricamento contenuto...
      </div>
    );
  }

  if (userRole !== "admin") {
    return (
      <div className="p-6 text-center text-red-600 font-bold">
        Accesso negato – sezione riservata agli amministratori.
      </div>
    );
  }

  return (
    <AppLayout userRole="admin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Amministratore</h1>
          <p className="text-gray-600">Panoramica generale del sistema</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Consulenti Attivi</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pratiche Totali</p>
                  <p className="text-2xl font-bold text-gray-900">1,247</p>
                </div>
                <FileText className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Commissioni Mese</p>
                  <p className="text-2xl font-bold text-gray-900">€34,580</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Crescita</p>
                  <p className="text-2xl font-bold text-green-600">+12.5%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions (sezione lasciata per estensioni future) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Aggiungi qui link o componenti extra */}
        </div>
      </div>
    </AppLayout>
  );
}