import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import {
  FileText,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  Calendar,
  Lock,
  Unlock,
  FileDown,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  UserCheck,
  AlertTriangle,
  Workflow
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { testFirebaseConnection } from "../utils/firebase-test";
import { adminApi } from "../utils/admin-api";
import { Contract, ContractStatus, UserRole, RolePermissions, StatusColors, AllowedTransitions } from "../types/contracts";
import DocumentManager from "../components/DocumentManager";

export default function Contracts() {
  const { user: currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State management
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCognome, setFilterCognome] = useState('');
  const [filterCodiceFiscale, setFilterCodiceFiscale] = useState('');
  const [filterCodiceContratto, setFilterCodiceContratto] = useState('');
  const [filterStatoOfferta, setFilterStatoOfferta] = useState<string>('all');
  const [filterSoloMiei, setFilterSoloMiei] = useState(false);
  const [filterSoloInLavorazione, setFilterSoloInLavorazione] = useState(false);
  
  // Modal states
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  
  // Form states
  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState<ContractStatus>('Caricato');
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Lock management
  const [lockingContract, setLockingContract] = useState<string | null>(null);

  useEffect(() => {
    const runFirebaseTest = async () => {
      const testResult = await testFirebaseConnection();
      console.log("🧪 Firebase test result:", testResult);

      if (!testResult.success) {
        toast({
          variant: "destructive",
          title: "Problema Firebase",
          description: testResult.error || "Errore nella connessione Firebase"
        });
      }
    };

    const fetchContracts = async () => {
      try {
        setLoading(true);
        console.log("🔄 Caricamento contratti da Firebase...");

        if (!db) {
          console.warn("⚠️ Database Firebase non configurato");
          toast({
            variant: "destructive",
            title: "Errore di configurazione",
            description: "Database Firebase non configurato correttamente"
          });
          setContracts([]);
          setLoading(false);
          return;
        }

        // Fetch via Admin API
        try {
          console.log("📡 Attempting to fetch contracts via Admin API...");
          const contractsFromAdmin = await adminApi.getAllContracts();
          console.log("📊 Contratti trovati via Admin API:", contractsFromAdmin.length);

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
          console.log("✅ CONTRATTI CARICATI CON SUCCESSO VIA ADMIN API:", formattedContracts);
        } catch (adminError: any) {
          console.warn("⚠️ Admin API failed, falling back to direct Firebase access:", adminError);
          
          // Fallback to direct Firebase access
          const querySnapshot = await getDocs(collection(db, "contracts"));
          const contractsFromFirebase: Contract[] = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              codiceUnivocoOfferta: data.codiceUnivocoOfferta || '',
              dataCreazione: data.dataCreazione || '',
              creatoDa: {
                id: data.creatoDa?.id || '',
                nome: data.creatoDa?.nome || '',
                cognome: data.creatoDa?.cognome || '',
                ruolo: data.creatoDa?.ruolo || 'consulente'
              },
              contatto: data.contatto || { nome: '', cognome: '', codiceFiscale: '' },
              ragioneSociale: data.ragioneSociale || '',
              isBusiness: data.isBusiness || false,
              statoOfferta: data.statoOfferta || 'Caricato',
              noteStatoOfferta: data.noteStatoOfferta || '',
              cronologiaStati: data.cronologiaStati || [],
              lock: data.lock || undefined,
              documenti: data.documenti || [],
              pod: data.pod || [],
              pdr: data.pdr || [],
              gestore: data.gestore || '',
              filePath: data.filePath || '',
              masterReference: data.masterReference || '',
              tipologiaContratto: data.tipologiaContratto || 'energia',
              nuoviPodAggiunti: data.nuoviPodAggiunti || false,
              dataUltimaIntegrazione: data.dataUltimaIntegrazione || ''
            };
          });

          setContracts(contractsFromFirebase);
          console.log("✅ CONTRATTI CARICATI CON SUCCESSO:", contractsFromFirebase);
        }
      } catch (error) {
        console.error("❌ Errore nel recupero contratti da Firebase:", error);
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Impossibile caricare i contratti da Firebase"
        });
      } finally {
        setLoading(false);
      }
    };

    runFirebaseTest();
    fetchContracts();
  }, []);

  // Helper functions
  const hasPermission = (action: keyof typeof RolePermissions.admin): boolean => {
    if (!userRole) return false;
    return RolePermissions[userRole as UserRole]?.[action] || false;
  };

  const canTransitionTo = (currentStatus: ContractStatus, targetStatus: ContractStatus): boolean => {
    return AllowedTransitions[currentStatus]?.includes(targetStatus) || false;
  };

  const getAvailableTransitions = (currentStatus: ContractStatus): ContractStatus[] => {
    const base = AllowedTransitions[currentStatus] || [];
    
    // Filtra in base ai permessi del ruolo
    return base.filter(status => {
      if (status === 'Pagato' || status === 'Stornato') {
        return hasPermission('canChangeToPagato');
      }
      return true;
    });
  };

  const isContractLocked = (contract: Contract): boolean => {
    if (!contract.lock) return false;
    
    // Verifica se il lock è scaduto (dopo 30 minuti)
    const lockTime = new Date(contract.lock.dataLock).getTime();
    const now = new Date().getTime();
    const lockDuration = 30 * 60 * 1000; // 30 minuti
    
    return (now - lockTime) < lockDuration;
  };

  const canEditContract = (contract: Contract): boolean => {
    if (!hasPermission('canEdit')) return false;
    
    // Se il contratto è bloccato da un altro utente, non si può modificare
    if (isContractLocked(contract) && contract.lock?.lockedBy.id !== currentUser?.uid) {
      return false;
    }
    
    return true;
  };

  // Filter contracts based on user role and filters
  const visibleContracts = currentUser && Array.isArray(contracts) 
    ? contracts.filter((contract) => {
        // Role-based filtering
        if (userRole === 'admin' || userRole === 'back office') {
          // Admin e Back Office vedono tutti i contratti
        } else if (userRole === 'master') {
          // Master vede i suoi contratti e quelli dei suoi sub-agenti
          if (!(contract.creatoDa.id === currentUser.uid || contract.masterReference === currentUser.uid)) {
            return false;
          }
        } else if (userRole === 'consulente') {
          // Consulente vede solo i propri contratti
          if (contract.creatoDa.id !== currentUser.uid) {
            return false;
          }
        } else {
          return false;
        }

        // Apply search filters
        const matchesSearch = 
          !searchTerm || 
          contract.contatto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.contatto.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.contatto.codiceFiscale.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.codiceUnivocoOfferta.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCognome = 
          !filterCognome || 
          contract.contatto.cognome.toLowerCase().includes(filterCognome.toLowerCase());

        const matchesCodiceFiscale = 
          !filterCodiceFiscale || 
          contract.contatto.codiceFiscale.toLowerCase().includes(filterCodiceFiscale.toLowerCase());

        const matchesCodiceContratto = 
          !filterCodiceContratto || 
          contract.codiceUnivocoOfferta.toLowerCase().includes(filterCodiceContratto.toLowerCase());

        const matchesStato = 
          filterStatoOfferta === 'all' || 
          contract.statoOfferta === filterStatoOfferta;

        const matchesSoloMiei = 
          !filterSoloMiei || 
          contract.creatoDa.id === currentUser.uid;

        const matchesSoloInLavorazione = 
          !filterSoloInLavorazione || 
          contract.statoOfferta === 'In Lavorazione' ||
          isContractLocked(contract);

        return matchesSearch && matchesCognome && matchesCodiceFiscale && 
               matchesCodiceContratto && matchesStato && matchesSoloMiei && 
               matchesSoloInLavorazione;
      })
    : [];

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
            In lavorazione
          </Badge>
        )}
        {contract?.nuoviPodAggiunti && (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 border flex items-center gap-1">
            <Plus className="h-3 w-3" />
            Nuovi POD
          </Badge>
        )}
      </div>
    );
  };

  // Action handlers
  const handleLockContract = async (contract: Contract) => {
    if (!currentUser || !hasPermission('canLock')) return;

    try {
      setLockingContract(contract.id);
      
      // Simula chiamata API per bloccare il contratto
      const lockData = {
        lockedBy: {
          id: currentUser.uid,
          nome: currentUser.displayName?.split(' ')[0] || 'Nome',
          cognome: currentUser.displayName?.split(' ')[1] || 'Cognome',
          ruolo: userRole as UserRole
        },
        dataLock: new Date().toISOString(),
        inScadenza: false
      };

      // Update contract with lock
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
        title: "Contratto bloccato",
        description: "Hai preso in carico questo contratto per la lavorazione",
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
        lock: null
      } as any);

      setContracts(contracts.map(c =>
        c.id === contract.id
          ? { ...c, lock: undefined }
          : c
      ));

      toast({
        title: "Contratto sbloccato",
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

  const handleChangeStatus = async () => {
    if (!selectedContract) return;

    try {
      await adminApi.updateContract(selectedContract.id, {
        statoOfferta: newStatus,
        noteStatoOfferta: noteText
      });

      setContracts(contracts.map(c =>
        c.id === selectedContract.id
          ? { 
              ...c, 
              statoOfferta: newStatus, 
              noteStatoOfferta: noteText,
              cronologiaStati: [
                ...c.cronologiaStati,
                {
                  stato: newStatus,
                  dataModifica: new Date().toISOString(),
                  modificatoDa: {
                    id: currentUser?.uid || '',
                    nome: currentUser?.displayName?.split(' ')[0] || 'Nome',
                    cognome: currentUser?.displayName?.split(' ')[1] || 'Cognome',
                    ruolo: userRole as UserRole
                  },
                  note: noteText
                }
              ]
            }
          : c
      ));

      toast({
        title: "Stato aggiornato",
        description: `Contratto aggiornato a: ${newStatus}`,
      });

      setIsStatusModalOpen(false);
      setSelectedContract(null);
      setNoteText('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
      });
    }
  };

  const handleDownloadDocuments = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDocumentsModalOpen(true);
  };

  const handleDocumentUploaded = async () => {
    // Refresh contracts after document upload
    try {
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
      console.error('Error refreshing contracts:', error);
    }
  };

  const handleAddPodToExistingContract = (contract: Contract) => {
    // Naviga alla pagina di compilazione contratto pre-compilata con i dati esistenti
    navigate(`/compile-contract?baseContract=${contract.id}`);
  };

  if (loading) {
    return (
      <AppLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento contratti...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const workQueueStats = {
    daLavorare: contracts.filter(c => c.statoOfferta === 'Caricato' || c.statoOfferta === 'Integrazione').length,
    inLavorazione: contracts.filter(c => c.statoOfferta === 'In Lavorazione' || isContractLocked(c)).length,
    completati: contracts.filter(c => c.statoOfferta === 'Pagato').length,
    richiedonoIntegrazione: contracts.filter(c => c.statoOfferta === 'Documenti KO').length,
  };

  return (
    <AppLayout userRole={userRole}>
      <div className="font-roboto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header con statistiche per back office/admin */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="h-8 w-8" style={{ color: '#F2C927' }} />
                {userRole === 'admin' || userRole === 'back office' ? 'Gestione Contratti' : 'I Miei Contratti'}
              </h1>
              <p className="text-gray-600 mt-1">
                {userRole === 'admin' || userRole === 'back office'
                  ? 'Visualizza e gestisci tutti i contratti del sistema'
                  : 'Visualizza e gestisci i tuoi contratti'
                }
              </p>
            </div>
            
            <div className="flex gap-4">
              <Link to="/compile-contract">
                <Button
                  className="shadow-md"
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Contratto
                </Button>
              </Link>

              {(userRole === 'admin' || userRole === 'back office') && (
                <Link to="/work-queue">
                  <Button variant="outline" className="shadow-md">
                    <Workflow className="h-4 w-4 mr-2" />
                    Coda Lavorazione
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Statistiche per back office/admin */}
          {(userRole === 'admin' || userRole === 'back office') && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="rounded-2xl shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Da Lavorare</p>
                      <p className="text-2xl font-bold text-blue-600">{workQueueStats.daLavorare}</p>
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
                      <p className="text-2xl font-bold text-yellow-600">{workQueueStats.inLavorazione}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completati</p>
                      <p className="text-2xl font-bold text-green-600">{workQueueStats.completati}</p>
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
                      <p className="text-2xl font-bold text-red-600">{workQueueStats.richiedonoIntegrazione}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Barra di ricerca principale */}
          <Card className="mb-6 rounded-2xl shadow-md">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca per nome, cognome, codice fiscale o codice offerta..."
                  className="pl-10 rounded-2xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Filtri avanzati */}
          <Card className="mb-8 rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtri Avanzati
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="filterCognome">Cognome</Label>
                  <Input
                    id="filterCognome"
                    value={filterCognome}
                    onChange={(e) => setFilterCognome(e.target.value)}
                    placeholder="Filtra per cognome..."
                    className="rounded-2xl"
                  />
                </div>
                
                <div>
                  <Label htmlFor="filterCodiceFiscale">Codice Fiscale</Label>
                  <Input
                    id="filterCodiceFiscale"
                    value={filterCodiceFiscale}
                    onChange={(e) => setFilterCodiceFiscale(e.target.value)}
                    placeholder="Filtra per CF..."
                    className="rounded-2xl"
                  />
                </div>
                
                <div>
                  <Label htmlFor="filterCodiceContratto">Codice Contratto</Label>
                  <Input
                    id="filterCodiceContratto"
                    value={filterCodiceContratto}
                    onChange={(e) => setFilterCodiceContratto(e.target.value)}
                    placeholder="Filtra per codice..."
                    className="rounded-2xl"
                  />
                </div>
                
                <div>
                  <Label htmlFor="filterStato">Stato Contratto</Label>
                  <Select value={filterStatoOfferta} onValueChange={setFilterStatoOfferta}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="Caricato">Caricato</SelectItem>
                      <SelectItem value="In Lavorazione">In Lavorazione</SelectItem>
                      <SelectItem value="Documenti OK">Documenti OK</SelectItem>
                      <SelectItem value="Documenti KO">Documenti KO</SelectItem>
                      <SelectItem value="Integrazione">Integrazione</SelectItem>
                      <SelectItem value="Inserimento OK">Inserimento OK</SelectItem>
                      <SelectItem value="Inserimento KO">Inserimento KO</SelectItem>
                      <SelectItem value="Pagato">Pagato</SelectItem>
                      <SelectItem value="Stornato">Stornato</SelectItem>
                      <SelectItem value="Annullato">Annullato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filtri rapidi */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterSoloMiei ? "default" : "outline"}
                  onClick={() => setFilterSoloMiei(!filterSoloMiei)}
                  size="sm"
                >
                  Solo i miei contratti
                </Button>
                
                {(userRole === 'admin' || userRole === 'back office') && (
                  <Button
                    variant={filterSoloInLavorazione ? "default" : "outline"}
                    onClick={() => setFilterSoloInLavorazione(!filterSoloInLavorazione)}
                    size="sm"
                  >
                    Solo in lavorazione
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabella Contratti */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle>Elenco Contratti</CardTitle>
              <CardDescription>
                {visibleContracts.length} contratt{visibleContracts.length !== 1 ? 'i' : 'o'} trovat{visibleContracts.length !== 1 ? 'i' : 'o'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {visibleContracts.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun contratto trovato</h3>
                  <p className="text-gray-600">Prova a modificare i filtri di ricerca o aggiungi un nuovo contratto</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Creato il</TableHead>
                        <TableHead>Codice Offerta</TableHead>
                        {(userRole === 'admin' || userRole === 'back office') && <TableHead>Creato da</TableHead>}
                        <TableHead>Contatto</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleContracts.map((contract) => (
                        <TableRow key={contract.id} className={contract.nuoviPodAggiunti ? "bg-purple-50" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {new Date(contract.dataCreazione).toLocaleDateString('it-IT')}
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
                          </TableCell>
                          {(userRole === 'admin' || userRole === 'back office') && (
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {contract.creatoDa.nome} {contract.creatoDa.cognome}
                                </div>
                                <div className="text-xs text-gray-500">{contract.creatoDa.ruolo}</div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <div className="font-medium">{contract.contatto.cognome} {contract.contatto.nome}</div>
                              <div className="text-xs text-gray-500">{contract.contatto.codiceFiscale}</div>
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
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Documenti */}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadDocuments(contract)}
                                title="Visualizza documenti"
                              >
                                <FileDown className="h-4 w-4" />
                              </Button>

                              {/* Blocca/Sblocca contratto */}
                              {hasPermission('canLock') && (
                                <>
                                  {!isContractLocked(contract) ? (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleLockContract(contract)}
                                      disabled={lockingContract === contract.id}
                                      title="Prendi in carico"
                                    >
                                      {lockingContract === contract.id ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Lock className="h-4 w-4" />
                                      )}
                                    </Button>
                                  ) : contract.lock?.lockedBy.id === currentUser?.uid ? (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleUnlockContract(contract)}
                                      title="Rilascia contratto"
                                    >
                                      <Unlock className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      disabled
                                      title={`In lavorazione da ${contract.lock?.lockedBy.nome} ${contract.lock?.lockedBy.cognome}`}
                                    >
                                      <Lock className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Cambia stato */}
                              {canEditContract(contract) && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setNewStatus(contract.statoOfferta);
                                    setNoteText(contract.noteStatoOfferta);
                                    setIsStatusModalOpen(true);
                                  }}
                                  title="Cambia stato"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Aggiungi POD (solo per consulenti/master sui propri contratti) */}
                              {(userRole === 'consulente' || userRole === 'master') && 
                               contract.creatoDa.id === currentUser?.uid && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleAddPodToExistingContract(contract)}
                                  title="Aggiungi POD alla stessa anagrafica"
                                  className="text-purple-600 hover:text-purple-700"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Elimina (solo admin) */}
                              {hasPermission('canDelete') && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-red-600 hover:text-red-700"
                                      title="Elimina contratto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Sei sicuro di voler eliminare il contratto {contract.codiceUnivocoOfferta}? 
                                        Questa azione non può essere annullata.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={async () => {
                                          try {
                                            await adminApi.deleteContract(contract.id);
                                            setContracts(contracts.filter(c => c.id !== contract.id));
                                            toast({
                                              title: "Contratto eliminato",
                                              description: "Il contratto è stato rimosso dal sistema",
                                            });
                                          } catch (error) {
                                            toast({
                                              variant: "destructive",
                                              title: "Errore",
                                              description: "Impossibile eliminare il contratto",
                                            });
                                          }
                                        }}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Elimina
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal per cambio stato */}
          <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
            <DialogContent className="sm:max-w-md font-roboto">
              <DialogHeader>
                <DialogTitle>Cambia Stato Contratto</DialogTitle>
                <DialogDescription>
                  Contratto: {selectedContract?.codiceUnivocoOfferta}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="newStatus">Nuovo Stato</Label>
                  <Select value={newStatus} onValueChange={(value: ContractStatus) => setNewStatus(value)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedContract && getAvailableTransitions(selectedContract.statoOfferta).map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="noteText">Note</Label>
                  <Textarea
                    id="noteText"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Aggiungi note per questo cambio di stato..."
                    className="rounded-2xl"
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={handleChangeStatus}
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                >
                  Salva Stato
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
                  Visualizza, scarica e gestisci i documenti del contratto
                </DialogDescription>
              </DialogHeader>

              {selectedContract && (
                <DocumentManager
                  contract={selectedContract}
                  userRole={userRole || 'consulente'}
                  onDocumentUploaded={handleDocumentUploaded}
                  allowUpload={true}
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
