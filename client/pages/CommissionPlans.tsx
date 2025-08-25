import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Crown, 
  User,
  Zap,
  Fuel,
  Phone,
  Euro,
  Settings,
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Eye
} from "lucide-react";

// Tipi per la struttura complessa dei compensi
interface EnergyCommission {
  id: string;
  gestore: string;
  tipoCliente: 'Residenziale' | 'Business';
  tipoFornitura: 'Luce' | 'Gas';
  // Per Business Luce - Fasce kW
  fasciaKw?: '0-4' | '4-12' | '12-25' | '25-50' | 'over-50';
  // Per Business - Compenso basato sul consumo
  compensoBasatoConsumo?: boolean;
  fasciaConsumo?: '0-30000' | 'over-30000';
  importo: number;
}

interface TelefoniaCommission {
  id: string;
  gestore: string;
  tecnologia: 'FTTC' | 'FTTH' | 'FWA';
  importo: number;
}

interface CommissionPlan {
  id: string;
  nome: string;
  consultantId: string;
  consultantName: string;
  energyCommissions: EnergyCommission[];
  telefoniaCommissions: TelefoniaCommission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Consultant {
  id: string;
  name: string;
  email: string;
  totalContracts: number;
  monthlyCommission: number;
}

// Nomi piani predefiniti
const PLAN_NAMES = ['Mercurio', 'Venere', 'Terra', 'Marte', 'Giove', 'Saturno'];

const MOCK_CONSULTANTS: Consultant[] = [
  { id: '1', name: 'Mario Rossi', email: 'mario.rossi@email.com', totalContracts: 45, monthlyCommission: 1250 },
  { id: '2', name: 'Giulia Bianchi', email: 'giulia.bianchi@email.com', totalContracts: 67, monthlyCommission: 2150 },
  { id: '3', name: 'Francesco Verde', email: 'francesco.verde@email.com', totalContracts: 32, monthlyCommission: 890 },
  { id: '4', name: 'Anna Neri', email: 'anna.neri@email.com', totalContracts: 78, monthlyCommission: 2340 },
];

const MOCK_PLANS: CommissionPlan[] = [
  {
    id: '1',
    nome: 'Terra',
    consultantId: '1',
    consultantName: 'Mario Rossi',
    energyCommissions: [
      { id: '1', gestore: 'Enel', tipoCliente: 'Residenziale', tipoFornitura: 'Luce', importo: 25 },
      { id: '2', gestore: 'ENI', tipoCliente: 'Business', tipoFornitura: 'Luce', fasciaKw: '0-4', importo: 30 },
      { id: '3', gestore: 'Acea', tipoCliente: 'Residenziale', tipoFornitura: 'Gas', importo: 20 }
    ],
    telefoniaCommissions: [
      { id: '1', gestore: 'TIM', tecnologia: 'FTTH', importo: 15 },
      { id: '2', gestore: 'Vodafone', tecnologia: 'FTTC', importo: 12 }
    ],
    isActive: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  }
];

export default function CommissionPlans() {
  const [plans, setPlans] = useState<CommissionPlan[]>(MOCK_PLANS);
  const [consultants] = useState<Consultant[]>(MOCK_CONSULTANTS);
  
  // Form states
  const [selectedConsultant, setSelectedConsultant] = useState<string>('');
  const [planName, setPlanName] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [currentPlan, setCurrentPlan] = useState<CommissionPlan | null>(null);
  
  // Filter states
  const [filterPeriod, setFilterPeriod] = useState<string>('current-month');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');

  // CSV Import handling
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      // Qui implementeresti la logica di parsing del CSV
      alert('CSV caricato! Implementa la logica di parsing per processare i dati.');
    }
  };

  // Save plan
  const handleSavePlan = () => {
    if (!selectedConsultant || !planName) {
      alert('Seleziona consulente e nome piano');
      return;
    }

    const consultant = consultants.find(c => c.id === selectedConsultant);
    if (!consultant) return;

    const newPlan: CommissionPlan = {
      id: currentPlan?.id || Date.now().toString(),
      nome: planName,
      consultantId: selectedConsultant,
      consultantName: consultant.name,
      energyCommissions: currentPlan?.energyCommissions || [],
      telefoniaCommissions: currentPlan?.telefoniaCommissions || [],
      isActive: true,
      createdAt: currentPlan?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (currentPlan) {
      setPlans(plans.map(p => p.id === currentPlan.id ? newPlan : p));
    } else {
      setPlans([...plans, newPlan]);
    }

    setCurrentPlan(newPlan);
    alert('Piano salvato!');
  };

  // Process CSV data (mock implementation)
  const processCsvData = () => {
    if (!csvFile || !currentPlan) {
      alert('Carica un CSV e seleziona un piano prima');
      return;
    }

    // Mock: aggiungi dati di esempio dal CSV
    const mockEnergyData: EnergyCommission[] = [
      { id: Date.now().toString(), gestore: 'A2A', tipoCliente: 'Residenziale', tipoFornitura: 'Luce', importo: 28 },
      { id: (Date.now() + 1).toString(), gestore: 'Edison', tipoCliente: 'Business', tipoFornitura: 'Gas', fasciaKw: '4-12', importo: 35 }
    ];

    const mockTelefoniaData: TelefoniaCommission[] = [
      { id: Date.now().toString(), gestore: 'Fastweb', tecnologia: 'FTTH', importo: 18 }
    ];

    const updatedPlan = {
      ...currentPlan,
      energyCommissions: [...currentPlan.energyCommissions, ...mockEnergyData],
      telefoniaCommissions: [...currentPlan.telefoniaCommissions, ...mockTelefoniaData],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setPlans(plans.map(p => p.id === currentPlan.id ? updatedPlan : p));
    setCurrentPlan(updatedPlan);
    alert('Dati CSV importati!');
  };

  // Calculate commission for a contract (mock logic)
  const calculateCommission = (contractData: any) => {
    if (!currentPlan) return 0;

    // Logica di calcolo basata su gestore, categoria, tecnologia, fascia
    // Questo dovrebbe essere implementato in base alla struttura dei contratti
    
    return 0; // Placeholder
  };

  const totalCommissions = consultants.reduce((sum, c) => sum + c.monthlyCommission, 0);

  return (
    <AppLayout userRole="admin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Crown className="h-8 w-8" style={{ color: '#F2C927' }} />
            Gestione Piani Compensi Avanzata
          </h1>
          <p className="text-gray-600">Configurazione completa dei compensi per energia e telefonia</p>
        </div>

        {/* Sezione Gestione Piano */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gestione del Piano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <Label htmlFor="consultant">Seleziona Consulente</Label>
                <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli consulente" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map(consultant => (
                      <SelectItem key={consultant.id} value={consultant.id}>
                        {consultant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="planName">Nome Piano</Label>
                <Select value={planName} onValueChange={setPlanName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli nome piano" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_NAMES.map(name => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleSavePlan}
                  className="w-full"
                  style={{ backgroundColor: '#E6007E', color: 'white' }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salva Piano
                </Button>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Piano
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sezione Caricamento CSV */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Caricamento CSV - Compensi Energia e Telefonia
            </CardTitle>
            <CardDescription>
              Carica un file CSV con la struttura completa dei compensi per energia e telefonia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Upload CSV */}
              <div>
                <Label htmlFor="csvFile">File CSV</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="mt-2"
                />
                {csvFile && (
                  <p className="text-sm text-green-600 mt-2">
                    File caricato: {csvFile.name}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-end">
                <Button 
                  onClick={processCsvData}
                  disabled={!csvFile || !currentPlan}
                  className="w-full"
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importa Dati
                </Button>
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Template CSV
                </Button>
              </div>
            </div>

            {/* Struttura CSV Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Struttura CSV Richiesta:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-blue-700 mb-2">🔌 Energia (Luce/Gas):</h5>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Gestore</li>
                    <li>• Tipo Cliente (Residenziale/Business)</li>
                    <li>• Tipo Fornitura (Luce/Gas)</li>
                    <li>• Fascia kW (0-4, 4-12, 12-25, 25-50, &gt;50)</li>
                    <li>• Compenso basato consumo (SI/NO)</li>
                    <li>• Fascia Consumo (0-30000, &gt;30000)</li>
                    <li>• Importo (€)</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-green-700 mb-2">☎️ Telefonia:</h5>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Gestore</li>
                    <li>• Tecnologia (FTTC/FTTH/FWA)</li>
                    <li>• Importo (€)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Piano Corrente Visualizzato */}
        {currentPlan && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Piano Corrente: {currentPlan.nome}
              </CardTitle>
              <CardDescription>
                Consulente: {currentPlan.consultantName} | Aggiornato: {currentPlan.updatedAt}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="energy" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="energy">Compensi Energia</TabsTrigger>
                  <TabsTrigger value="telefonia">Compensi Telefonia</TabsTrigger>
                </TabsList>

                <TabsContent value="energy">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gestore</TableHead>
                        <TableHead>Tipo Cliente</TableHead>
                        <TableHead>Fornitura</TableHead>
                        <TableHead>Fascia kW</TableHead>
                        <TableHead>Fascia Consumo</TableHead>
                        <TableHead>Importo</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPlan.energyCommissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell className="font-medium">{commission.gestore}</TableCell>
                          <TableCell>{commission.tipoCliente}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {commission.tipoFornitura === 'Luce' ? 
                                <Zap className="h-4 w-4 text-blue-500" /> : 
                                <Fuel className="h-4 w-4 text-amber-500" />
                              }
                              {commission.tipoFornitura}
                            </div>
                          </TableCell>
                          <TableCell>{commission.fasciaKw || '-'}</TableCell>
                          <TableCell>{commission.fasciaConsumo || '-'}</TableCell>
                          <TableCell className="font-bold text-green-600">€{commission.importo}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="telefonia">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gestore</TableHead>
                        <TableHead>Tecnologia</TableHead>
                        <TableHead>Importo</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPlan.telefoniaCommissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell className="font-medium">{commission.gestore}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4 text-green-500" />
                              {commission.tecnologia}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-green-600">€{commission.importo}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Filtri e Analytics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtri e Analytics Commissioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <Label>Periodo</Label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Mese Corrente</SelectItem>
                    <SelectItem value="last-month">Mese Scorso</SelectItem>
                    <SelectItem value="current-year">Anno Corrente</SelectItem>
                    <SelectItem value="custom">Personalizzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo Fornitura</Label>
                <Select value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="luce">Luce</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                    <SelectItem value="telefonia">Telefonia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Gestore</Label>
                <Select value={filterProvider} onValueChange={setFilterProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="enel">Enel</SelectItem>
                    <SelectItem value="eni">ENI</SelectItem>
                    <SelectItem value="tim">TIM</SelectItem>
                    <SelectItem value="vodafone">Vodafone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Applica Filtri
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Commissioni Totali</p>
                      <p className="text-2xl font-bold text-green-600">€{totalCommissions.toLocaleString()}</p>
                    </div>
                    <Euro className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Contratti Lavorati</p>
                      <p className="text-2xl font-bold text-blue-600">247</p>
                    </div>
                    <Zap className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Media per Contratto</p>
                      <p className="text-2xl font-bold text-purple-600">€{Math.round(totalCommissions / 247)}</p>
                    </div>
                    <Settings className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Piani Attivi</p>
                      <p className="text-2xl font-bold text-amber-600">{plans.length}</p>
                    </div>
                    <Crown className="h-8 w-8 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Lista Piani Esistenti */}
        <Card>
          <CardHeader>
            <CardTitle>Tutti i Piani Compensi</CardTitle>
            <CardDescription>Panoramica e gestione di tutti i piani configurati</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Crown className="h-6 w-6 text-amber-500" />
                    <div>
                      <div className="font-bold text-lg">{plan.nome}</div>
                      <div className="text-gray-600">{plan.consultantName}</div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>Energia: {plan.energyCommissions.length} tariffe</span>
                        <span>Telefonia: {plan.telefoniaCommissions.length} tariffe</span>
                        <span>Aggiornato: {plan.updatedAt}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPlan(plan)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
