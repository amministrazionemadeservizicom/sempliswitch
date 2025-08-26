import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Workflow,
  Clock,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  Edit,
  Calendar,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  FileDown
} from "lucide-react";
import { adminApi } from "../utils/admin-api";
import { Contract, ContractStatus, StatusColors, AllowedTransitions } from "../types/contracts";
import DocumentManager from "../components/DocumentManager";

interface WorkQueueStats {
  daLavorare: number;
  inLavorazione: number;
  completatiOggi: number;
  richiedonoIntegrazione: number;
  tempoMedioLavorazione: string;
  contrattiFinalizzatiOggi: number;
}

export default function WorkQueue() {
  const { user: currentUser, userRole } = useAuth();
  const { toast } = useToast();

  // State management
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("da-lavorare");
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGestore, setFilterGestore] = useState('all');
  const [filterTipologia, setFilterTipologia] = useState('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [workNote, setWorkNote] = useState('');
  const [newStatus, setNewStatus] = useState<ContractStatus>('Documenti OK');
  
  // Lock management
  const [lockingContract, setLockingContract] = useState<string | null>(null);

  // Verifica permessi
  if (userRole !== 'admin' && userRole !== 'back office') {
    return (
      <AppLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesso Negato</h3>
            <p className="text-gray-600">Solo gli operatori Back Office e Admin possono accedere alla coda di lavorazione</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const contractsFromAdmin = await adminApi.getAllContracts();
      
      const formattedContracts: Contract[] = contractsFromAdmin.map((doc: any) => ({
        id: doc.id,
        codiceUnivocoOfferta: doc.codiceUnivocoOfferta || '',
        dataCreazione: doc.dataCreazione || '',
        creatoDa: {
          id: doc.creatoDa?.id || '',
          nome: doc.creatoDa?.nome || '',
          cognome: doc.creatoDa?.cognome || '',
          ruolo: doc.creatoDa?.ruolo || 'consulente'
        },
        contatto: doc.contatto || { nome: '', cognome: '', codiceFiscale: '' },
        ragioneSociale: doc.ragioneSociale || '',
        isBusiness: doc.isBusiness || false,
        statoOfferta: doc.statoOfferta || 'Caricato',
        noteStatoOfferta: doc.noteStatoOfferta || '',
        cronologiaStati: doc.cronologiaStati || [],
        lock: doc.lock || undefined,
        documenti: doc.documenti || [],
        pod: doc.pod || [],
        pdr: doc.pdr || [],
        gestore: doc.gestore || '',
        filePath: doc.filePath || '',
        masterReference: doc.masterReference || '',
        tipologiaContratto: doc.tipologiaContratto || 'energia',
        nuoviPodAggiunti: doc.nuoviPodAggiunti || false,
        dataUltimaIntegrazione: doc.dataUltimaIntegrazione || ''
      }));

      setContracts(formattedContracts);
    } catch (error) {
      console.error("❌ Errore nel recupero contratti:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i contratti"
      });
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const isContractLocked = (contract: Contract): boolean => {
    if (!contract.lock) return false;
    const lockTime = new Date(contract.lock.dataLock).getTime();
    const now = new Date().getTime();
    const lockDuration = 30 * 60 * 1000; // 30 minuti
    return (now - lockTime) < lockDuration;
  };

  const isLockedByCurrentUser = (contract: Contract): boolean => {
    return contract.lock?.lockedBy.id === currentUser?.uid;
  };

  const getStatusBadge = (stato: ContractStatus, contract?: Contract) => {
    const config = StatusColors[stato];
    const isLocked = contract && isContractLocked(contract);
    
    return (
      <div className="flex items-center gap-2">
        <Badge className={`${config.bg} ${config.text} ${config.border} border`}>
          {stato}
        </Badge>
        {isLocked && (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {isLockedByCurrentUser(contract!) ? 'Da te' : 'In lavorazione'}
          </Badge>
        )}
        {contract?.nuoviPodAggiunti && (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 border flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Nuovi POD
          </Badge>
        )}
      </div>
    );
  };

  // Filter contracts by category
  const contractsDaLavorare = contracts.filter(c => 
    (c.statoOfferta === 'Caricato' || c.statoOfferta === 'Integrazione') && !isContractLocked(c)
  );

  const contractsInLavorazione = contracts.filter(c => 
    c.statoOfferta === 'In Lavorazione' || isContractLocked(c)
  );

  const contractsCompletati = contracts.filter(c => 
    ['Documenti OK', 'Inserimento OK', 'Pagato', 'Stornato'].includes(c.statoOfferta)
  );

  const contractsRichiedonoIntegrazione = contracts.filter(c => 
    c.statoOfferta === 'Documenti KO'
  );

  // Apply search and filters
  const applyFilters = (contractList: Contract[]) => {
    return contractList.filter(contract => {
      const matchesSearch = 
        !searchTerm || 
        contract.contatto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contatto.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contatto.codiceFiscale.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.codiceUnivocoOfferta.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGestore = 
        filterGestore === 'all' || 
        contract.gestore === filterGestore;

      const matchesTipologia = 
        filterTipologia === 'all' || 
        contract.tipologiaContratto === filterTipologia;

      return matchesSearch && matchesGestore && matchesTipologia;
    });
  };

  // Action handlers
  const handleLockContract = async (contract: Contract) => {
    if (!currentUser) return;

    try {
      setLockingContract(contract.id);
      
      const lockData = {
        lockedBy: {
          id: currentUser.uid,
          nome: currentUser.displayName?.split(' ')[0] || 'Nome',
          cognome: currentUser.displayName?.split(' ')[1] || 'Cognome',
          ruolo: userRole as any
        },
        dataLock: new Date().toISOString(),
        inScadenza: false
      };

      await adminApi.updateContract(contract.id, {
        lock: lockData,
        statoOfferta: 'In Lavorazione'
      } as any);

      // Update local state
      setContracts(contracts.map(c =>
        c.id === contract.id
          ? { ...c, lock: lockData, statoOfferta: 'In Lavorazione' }
          : c
      ));

      toast({
        title: "Contratto preso in carico",
        description: `Hai bloccato il contratto ${contract.codiceUnivocoOfferta} per la lavorazione`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile bloccare il contratto",
      });
    } finally {
      setLockingContract(null);
    }
  };

  const handleUnlockContract = async (contract: Contract) => {
    if (!currentUser || !contract.lock) return;

    try {
      await adminApi.updateContract(contract.id, {
        lock: null,
        statoOfferta: 'Caricato' // Torna allo stato precedente
      } as any);

      setContracts(contracts.map(c =>
        c.id === contract.id
          ? { ...c, lock: undefined, statoOfferta: 'Caricato' }
          : c
      ));

      toast({
        title: "Contratto rilasciato",
        description: "Il contratto è ora disponibile per altri operatori",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile sbloccare il contratto",
      });
    }
  };

  const handleStartWork = (contract: Contract) => {
    setSelectedContract(contract);
    setNewStatus('Documenti OK');
    setWorkNote('');
    setIsWorkModalOpen(true);
  };

  const handleCompleteWork = async () => {
    if (!selectedContract) return;

    try {
      await adminApi.updateContract(selectedContract.id, {
        statoOfferta: newStatus,
        noteStatoOfferta: workNote,
        lock: newStatus === 'Documenti KO' ? selectedContract.lock : null // Mantieni lock solo se KO
      });

      setContracts(contracts.map(c =>
        c.id === selectedContract.id
          ? { 
              ...c, 
              statoOfferta: newStatus, 
              noteStatoOfferta: workNote,
              lock: newStatus === 'Documenti KO' ? c.lock : undefined,
              cronologiaStati: [
                ...c.cronologiaStati,
                {
                  stato: newStatus,
                  dataModifica: new Date().toISOString(),
                  modificatoDa: {
                    id: currentUser?.uid || '',
                    nome: currentUser?.displayName?.split(' ')[0] || 'Nome',
                    cognome: currentUser?.displayName?.split(' ')[1] || 'Cognome',
                    ruolo: userRole as any
                  },
                  note: workNote
                }
              ]
            }
          : c
      ));

      toast({
        title: "Lavorazione completata",
        description: `Contratto aggiornato a: ${newStatus}`,
      });

      setIsWorkModalOpen(false);
      setSelectedContract(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile completare la lavorazione",
      });
    }
  };

  const handleViewDocuments = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDocumentsModalOpen(true);
  };

  const handleDocumentUploaded = async () => {
    // Refresh contracts after document upload
    await fetchContracts();
  };

  // Statistics calculation
  const stats: WorkQueueStats = {
    daLavorare: contractsDaLavorare.length,
    inLavorazione: contractsInLavorazione.length,
    completatiOggi: contractsCompletati.filter(c => {
      const today = new Date().toDateString();
      return c.cronologiaStati.some(s => 
        ['Documenti OK', 'Inserimento OK'].includes(s.stato) &&
        new Date(s.dataModifica).toDateString() === today
      );
    }).length,
    richiedonoIntegrazione: contractsRichiedonoIntegrazione.length,
    tempoMedioLavorazione: "2.5h", // Placeholder - calcolo complesso
    contrattiFinalizzatiOggi: contractsCompletati.filter(c => {
      const today = new Date().toDateString();
      return c.cronologiaStati.some(s => 
        s.stato === 'Pagato' &&
        new Date(s.dataModifica).toDateString() === today
      );
    }).length
  };

  const gestori = [...new Set(contracts.map(c => c.gestore).filter(Boolean))];

  if (loading) {
    return (
      <AppLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento coda lavorazione...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole={userRole}>
      <div className="font-roboto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Workflow className="h-8 w-8" style={{ color: '#F2C927' }} />
                Coda di Lavorazione
              </h1>
              <p className="text-gray-600 mt-1">
                Gestisci i contratti in ingresso e monitora lo stato di lavorazione
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchContracts}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </div>

          {/* Statistiche */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Da Lavorare</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.daLavorare}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Lavorazione</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.inLavorazione}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completati Oggi</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completatiOggi}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Richiedono Integrazione</p>
                    <p className="text-2xl font-bold text-red-600">{stats.richiedonoIntegrazione}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tempo Medio</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.tempoMedioLavorazione}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Finalizzati Oggi</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.contrattiFinalizzatiOggi}</p>
                  </div>
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtri */}
          <Card className="mb-6 rounded-2xl shadow-md">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Ricerca</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cerca per nome, CF o codice..."
                      className="pl-10 rounded-2xl"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="filterGestore">Gestore</Label>
                  <Select value={filterGestore} onValueChange={setFilterGestore}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i gestori</SelectItem>
                      {gestori.map(gestore => (
                        <SelectItem key={gestore} value={gestore}>{gestore}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filterTipologia">Tipologia</Label>
                  <Select value={filterTipologia} onValueChange={setFilterTipologia}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le tipologie</SelectItem>
                      <SelectItem value="energia">Energia</SelectItem>
                      <SelectItem value="telefonia">Telefonia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs per categorie */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="da-lavorare" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Da Lavorare ({stats.daLavorare})
              </TabsTrigger>
              <TabsTrigger value="in-lavorazione" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                In Lavorazione ({stats.inLavorazione})
              </TabsTrigger>
              <TabsTrigger value="richiedono-integrazione" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Richiedono Integrazione ({stats.richiedonoIntegrazione})
              </TabsTrigger>
              <TabsTrigger value="completati" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completati ({contractsCompletati.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="da-lavorare">
              <ContractTable 
                contracts={applyFilters(contractsDaLavorare)}
                onLock={handleLockContract}
                onStartWork={handleStartWork}
                lockingContract={lockingContract}
                currentUser={currentUser}
                isContractLocked={isContractLocked}
                isLockedByCurrentUser={isLockedByCurrentUser}
                getStatusBadge={getStatusBadge}
                showActions={true}
                actionType="take"
              />
            </TabsContent>

            <TabsContent value="in-lavorazione">
              <ContractTable 
                contracts={applyFilters(contractsInLavorazione)}
                onUnlock={handleUnlockContract}
                onStartWork={handleStartWork}
                lockingContract={lockingContract}
                currentUser={currentUser}
                isContractLocked={isContractLocked}
                isLockedByCurrentUser={isLockedByCurrentUser}
                getStatusBadge={getStatusBadge}
                showActions={true}
                actionType="work"
              />
            </TabsContent>

            <TabsContent value="richiedono-integrazione">
              <ContractTable 
                contracts={applyFilters(contractsRichiedonoIntegrazione)}
                currentUser={currentUser}
                isContractLocked={isContractLocked}
                isLockedByCurrentUser={isLockedByCurrentUser}
                getStatusBadge={getStatusBadge}
                showActions={false}
                actionType="view"
              />
            </TabsContent>

            <TabsContent value="completati">
              <ContractTable 
                contracts={applyFilters(contractsCompletati)}
                onStartWork={handleStartWork}
                currentUser={currentUser}
                isContractLocked={isContractLocked}
                isLockedByCurrentUser={isLockedByCurrentUser}
                getStatusBadge={getStatusBadge}
                showActions={true}
                actionType="rework"
              />
            </TabsContent>
          </Tabs>

          {/* Modal per lavorazione */}
          <Dialog open={isWorkModalOpen} onOpenChange={setIsWorkModalOpen}>
            <DialogContent className="sm:max-w-lg font-roboto">
              <DialogHeader>
                <DialogTitle>Lavorazione Contratto</DialogTitle>
                <DialogDescription>
                  Contratto: {selectedContract?.codiceUnivocoOfferta}
                  <br />
                  Cliente: {selectedContract?.contatto.nome} {selectedContract?.contatto.cognome}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="workStatus">Esito Lavorazione</Label>
                  <Select value={newStatus} onValueChange={(value: ContractStatus) => setNewStatus(value)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Documenti OK">Documenti OK</SelectItem>
                      <SelectItem value="Documenti KO">Documenti KO (richiede integrazione)</SelectItem>
                      {userRole === 'admin' && (
                        <>
                          <SelectItem value="Inserimento OK">Inserimento OK</SelectItem>
                          <SelectItem value="Inserimento KO">Inserimento KO</SelectItem>
                          <SelectItem value="Pagato">Pagato</SelectItem>
                          <SelectItem value="Stornato">Stornato</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="workNote">Note di Lavorazione</Label>
                  <textarea
                    id="workNote"
                    value={workNote}
                    onChange={(e) => setWorkNote(e.target.value)}
                    placeholder={newStatus === 'Documenti KO' ? 
                      "Specifica cosa deve essere integrato..." : 
                      "Aggiungi note sulla lavorazione..."
                    }
                    className="w-full p-3 border rounded-2xl resize-none"
                    rows={4}
                    required={newStatus === 'Documenti KO'}
                  />
                </div>

                {newStatus === 'Documenti KO' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Il contratto verrà inviato al consulente per integrazione
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWorkModalOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={handleCompleteWork}
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                  disabled={newStatus === 'Documenti KO' && !workNote.trim()}
                >
                  Completa Lavorazione
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal per documenti */}
          <Dialog open={isDocumentsModalOpen} onOpenChange={setIsDocumentsModalOpen}>
            <DialogContent className="sm:max-w-4xl font-roboto">
              <DialogHeader>
                <DialogTitle>Gestione Documenti</DialogTitle>
                <DialogDescription>
                  Visualizza e gestisci i documenti del contratto in lavorazione
                </DialogDescription>
              </DialogHeader>

              {selectedContract && (
                <DocumentManager
                  contract={selectedContract}
                  userRole={userRole || 'back office'}
                  onDocumentUploaded={handleDocumentUploaded}
                  allowUpload={false} // Back office non carica, solo visualizza
                />
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDocumentsModalOpen(false)}>
                  Chiudi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </AppLayout>
  );
}

// Component per tabella contratti riutilizzabile
interface ContractTableProps {
  contracts: Contract[];
  onLock?: (contract: Contract) => void;
  onUnlock?: (contract: Contract) => void;
  onStartWork?: (contract: Contract) => void;
  lockingContract?: string | null;
  currentUser: any;
  isContractLocked: (contract: Contract) => boolean;
  isLockedByCurrentUser: (contract: Contract) => boolean;
  getStatusBadge: (status: ContractStatus, contract?: Contract) => JSX.Element;
  showActions: boolean;
  actionType: 'take' | 'work' | 'view' | 'rework';
}

function ContractTable({
  contracts,
  onLock,
  onUnlock,
  onStartWork,
  lockingContract,
  currentUser,
  isContractLocked,
  isLockedByCurrentUser,
  getStatusBadge,
  showActions,
  actionType
}: ContractTableProps) {
  if (contracts.length === 0) {
    return (
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun contratto trovato</h3>
            <p className="text-gray-600">Non ci sono contratti in questa categoria al momento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Codice Offerta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Creato da</TableHead>
                <TableHead>Gestore</TableHead>
                <TableHead>Stato</TableHead>
                {showActions && <TableHead>Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow 
                  key={contract.id} 
                  className={contract.nuoviPodAggiunti ? "bg-purple-50" : ""}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {new Date(contract.dataCreazione).toLocaleDateString('it-IT')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(contract.dataCreazione).toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    <div>
                      {contract.codiceUnivocoOfferta}
                      {contract.pod && contract.pod.length > 1 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {contract.pod.length} POD
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {contract.tipologiaContratto}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {contract.contatto.cognome} {contract.contatto.nome}
                      </div>
                      <div className="text-xs text-gray-500">
                        {contract.contatto.codiceFiscale}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {contract.creatoDa.nome} {contract.creatoDa.cognome}
                      </div>
                      <div className="text-xs text-gray-500">
                        {contract.creatoDa.ruolo}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm font-medium">
                      {contract.gestore || '—'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(contract.statoOfferta, contract)}
                    {contract.lock && (
                      <div className="text-xs text-gray-500 mt-1">
                        Da: {contract.lock.lockedBy.nome} {contract.lock.lockedBy.cognome}
                      </div>
                    )}
                  </TableCell>
                  
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {actionType === 'take' && !isContractLocked(contract) && onLock && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onLock(contract)}
                            disabled={lockingContract === contract.id}
                            title="Prendi in carico"
                          >
                            {lockingContract === contract.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        {actionType === 'work' && isLockedByCurrentUser(contract) && (
                          <>
                            {onStartWork && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onStartWork(contract)}
                                title="Lavora contratto"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {onUnlock && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onUnlock(contract)}
                                title="Rilascia contratto"
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        
                        {actionType === 'work' && !isLockedByCurrentUser(contract) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled
                            title={`In lavorazione da ${contract.lock?.lockedBy.nome} ${contract.lock?.lockedBy.cognome}`}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {actionType === 'rework' && onStartWork && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onStartWork(contract)}
                            title="Rilavora contratto"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Visualizza documenti sempre disponibile */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDocuments(contract)}
                          title="Visualizza documenti"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
