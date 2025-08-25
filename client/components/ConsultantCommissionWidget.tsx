import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro } from "lucide-react";

interface Contract {
  id: string;
  agente_id: string;
  data_inserimento: string;
  importo_provvigione: number;
  cliente: string;
  servizio: string;
}

interface ConsultantCommissionWidgetProps {
  selectedMonth: number;
  selectedYear: number;
  currentUserId: string;
  contracts?: Contract[];
}

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// Mock contract data with commission amounts - in a real app this would come from props or API
const MOCK_CONTRACTS: Contract[] = [
  { id: "1", agente_id: "user1", data_inserimento: "2024-01-15", importo_provvigione: 30, cliente: "Mario Rossi", servizio: "Luce" },
  { id: "2", agente_id: "user1", data_inserimento: "2024-01-16", importo_provvigione: 25, cliente: "Giulia Bianchi", servizio: "Gas" },
  { id: "3", agente_id: "user2", data_inserimento: "2024-01-14", importo_provvigione: 15, cliente: "Francesco Verde", servizio: "Telefonia" },
  { id: "4", agente_id: "user1", data_inserimento: "2024-01-20", importo_provvigione: 30, cliente: "Anna Neri", servizio: "Luce" },
  { id: "5", agente_id: "user1", data_inserimento: "2024-01-22", importo_provvigione: 25, cliente: "Paolo Bianchi", servizio: "Gas" },
  { id: "6", agente_id: "user1", data_inserimento: "2024-01-25", importo_provvigione: 15, cliente: "Laura Verdi", servizio: "Telefonia" },
  { id: "7", agente_id: "user1", data_inserimento: "2024-02-10", importo_provvigione: 30, cliente: "Marco Rossi", servizio: "Luce" },
  { id: "8", agente_id: "user1", data_inserimento: "2024-02-12", importo_provvigione: 25, cliente: "Sofia Neri", servizio: "Gas" },
  { id: "9", agente_id: "user1", data_inserimento: "2024-02-15", importo_provvigione: 15, cliente: "Luca Bianchi", servizio: "Telefonia" },
  { id: "10", agente_id: "user1", data_inserimento: "2024-02-18", importo_provvigione: 30, cliente: "Elena Verde", servizio: "Luce" },
];

export default function ConsultantCommissionWidget({ 
  selectedMonth, 
  selectedYear, 
  currentUserId = "user1",
  contracts = MOCK_CONTRACTS 
}: ConsultantCommissionWidgetProps) {
  
  const commissionData = useMemo(() => {
    // Filter contracts for current consultant and selected month/year
    const provvigioni = contracts.filter(c =>
      c.agente_id === currentUserId &&
      new Date(c.data_inserimento).getMonth() === selectedMonth &&
      new Date(c.data_inserimento).getFullYear() === selectedYear
    );

    // Calculate total commission amount
    const totaleProvvigioni = provvigioni.reduce((acc, c) => acc + c.importo_provvigione, 0);

    return {
      totaleProvvigioni,
      numeroContratti: provvigioni.length,
      selectedMonthName: MONTHS[selectedMonth]
    };
  }, [selectedMonth, selectedYear, currentUserId, contracts]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Euro className="h-5 w-5" style={{ color: '#F2C927' }} />
          💰 Provvigioni maturate – {commissionData.selectedMonthName} {selectedYear}
        </h3>
      </div>

      <div className="space-y-4">
        {/* Main total */}
        <div className="text-center">
          <div className="text-5xl font-bold mb-2" style={{ color: '#E6007E' }}>
            €{commissionData.totaleProvvigioni}
          </div>
          <div className="text-gray-600 text-sm">
            Totale maturato questo mese
          </div>
        </div>

        {/* Additional context */}
        <div className="text-center pt-4 border-t" style={{ borderColor: '#F2C927', borderOpacity: 0.3 }}>
          <div className="text-sm text-gray-600">
            {commissionData.numeroContratti === 0
              ? "Nessun contratto inserito questo mese"
              : `Calcolato su ${commissionData.numeroContratti} contratto${commissionData.numeroContratti !== 1 ? 'i' : ''} inserito${commissionData.numeroContratti !== 1 ? 'i' : ''}`}
          </div>
        </div>
      </div>
    </div>
  );
}
