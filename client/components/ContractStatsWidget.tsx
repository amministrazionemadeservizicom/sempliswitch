import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Sun, Moon } from "lucide-react";

interface Contract {
  id: string;
  agente_id: string;
  data_inserimento: string;
  cliente: string;
  servizio: string;
  stato: string;
}

interface ContractStatsWidgetProps {
  selectedMonth: number;
  selectedYear: number;
  currentUserRole: string;
  currentUserId: string;
  contracts?: Contract[];
}

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// Mock contract data - in a real app this would come from props or API
const MOCK_CONTRACTS: Contract[] = [
  { id: "1", agente_id: "user1", data_inserimento: "2024-01-15", cliente: "Mario Rossi", servizio: "Luce", stato: "Completata" },
  { id: "2", agente_id: "user1", data_inserimento: "2024-01-16", cliente: "Giulia Bianchi", servizio: "Gas", stato: "In lavorazione" },
  { id: "3", agente_id: "user2", data_inserimento: "2024-01-14", cliente: "Francesco Verde", servizio: "Telefonia", stato: "In attesa" },
  { id: "4", agente_id: "user1", data_inserimento: new Date().toISOString().split('T')[0], cliente: "Anna Neri", servizio: "Luce", stato: "Completata" },
  { id: "5", agente_id: "user1", data_inserimento: new Date(Date.now() - 86400000).toISOString().split('T')[0], cliente: "Paolo Bianchi", servizio: "Gas", stato: "In lavorazione" },
  { id: "6", agente_id: "user1", data_inserimento: new Date().toISOString().split('T')[0], cliente: "Laura Verdi", servizio: "Telefonia", stato: "Completata" },
  { id: "7", agente_id: "user2", data_inserimento: new Date().toISOString().split('T')[0], cliente: "Marco Rossi", servizio: "Luce", stato: "In attesa" },
  { id: "8", agente_id: "user1", data_inserimento: new Date(Date.now() - 86400000).toISOString().split('T')[0], cliente: "Sofia Neri", servizio: "Gas", stato: "Completata" },
];

export default function ContractStatsWidget({ 
  selectedMonth, 
  selectedYear, 
  currentUserRole = "consulente", 
  currentUserId = "user1",
  contracts = MOCK_CONTRACTS 
}: ContractStatsWidgetProps) {
  
  const stats = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Filter contracts based on user role
    const contrattiFiltrati = contracts.filter(c =>
      (currentUserRole === 'admin' || c.agente_id === currentUserId)
    );

    // Total contracts for selected month
    const totalContrattiMese = contrattiFiltrati.filter(c => {
      const contractDate = new Date(c.data_inserimento);
      return contractDate.getMonth() === selectedMonth && 
             contractDate.getFullYear() === selectedYear;
    }).length;

    // Contracts inserted today
    const totalContrattiOggi = contrattiFiltrati.filter(c => {
      const contractDate = new Date(c.data_inserimento);
      return contractDate.toDateString() === today.toDateString();
    }).length;

    // Contracts inserted yesterday
    const totalContrattiIeri = contrattiFiltrati.filter(c => {
      const contractDate = new Date(c.data_inserimento);
      return contractDate.toDateString() === yesterday.toDateString();
    }).length;

    return {
      totalContrattiMese,
      totalContrattiOggi,
      totalContrattiIeri,
      selectedMonthName: MONTHS[selectedMonth]
    };
  }, [selectedMonth, selectedYear, currentUserRole, currentUserId, contracts]);

  return (
    <Card className="border-2" style={{ borderColor: '#F2C927' }}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Calendar className="h-5 w-5" style={{ color: '#F2C927' }} />
          Contratti inseriti – {stats.selectedMonthName} {selectedYear}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main monthly total */}
        <div className="text-center">
          <div className="text-5xl font-bold mb-2" style={{ color: '#E6007E' }}>
            {stats.totalContrattiMese}
          </div>
          <div className="text-gray-600 text-sm">
            Contratti totali del mese
          </div>
        </div>

        {/* Today and Yesterday stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Today */}
          <div 
            className="p-4 rounded-lg border-2 text-center bg-gradient-to-br from-yellow-50 to-orange-50"
            style={{ borderColor: '#F2C927' }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sun className="h-4 w-4" style={{ color: '#F2C927' }} />
              <span className="text-sm font-medium text-gray-700">Totale oggi</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#E6007E' }}>
              {stats.totalContrattiOggi}
            </div>
          </div>

          {/* Yesterday */}
          <div 
            className="p-4 rounded-lg border-2 text-center bg-gradient-to-br from-purple-50 to-blue-50"
            style={{ borderColor: '#F2C927' }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Moon className="h-4 w-4" style={{ color: '#F2C927' }} />
              <span className="text-sm font-medium text-gray-700">Totale ieri</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#E6007E' }}>
              {stats.totalContrattiIeri}
            </div>
          </div>
        </div>

        {/* Additional context info */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t">
          {currentUserRole === 'admin' 
            ? 'Visualizzando tutti i contratti del sistema' 
            : 'Visualizzando solo i tuoi contratti'}
        </div>
      </CardContent>
    </Card>
  );
}
