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
  Calendar
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { testFirebaseConnection } from "../utils/firebase-test";
import { adminApi } from "../utils/admin-api";

interface Contract {
  id: string;
  codiceUnivocoOfferta: string;
  dataCreazione: string;
  creatoDa: {
    id: string;
    nome: string;
    cognome: string;
  };
  contatto: {
    nome: string;
    cognome: string;
    codiceFiscale: string;
  };
  ragioneSociale?: string; // Solo per contratti business
  isBusiness: boolean;
  statoOfferta: 'Caricato' | 'Inserito' | 'Inserimento OK' | 'Pagato' | 'Annullato';
  noteStatoOfferta: string;
  gestore: string; // Per organizzare i file nel server
  filePath?: string; // Path del PDF nel server
  masterReference?: string; // ID del master di riferimento per i consulenti
  tipologiaContratto: 'energia' | 'telefonia';
}

export default function Contracts() {
  const { user: currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCognome, setFilterCognome] = useState('');
  const [filterCodiceFiscale, setFilterCodiceFiscale] = useState('');
  const [filterCodiceContratto, setFilterCodiceContratto] = useState('');
  const [filterStatoOfferta, setFilterStatoOfferta] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editContractData, setEditContractData] = useState({
    statoOfferta: '' as Contract['statoOfferta'],
    noteStatoOfferta: '',
    contatto: { nome: '', cognome: '', codiceFiscale: '' },
    ragioneSociale: ''
  });

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
      console.log("🔥 Firebase DB object:", db);
      console.log("👤 Current user:", currentUser);
      console.log("🔑 User role:", userRole);

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

      console.log("📡 Attempting to fetch from 'contratti' collection...");
      const querySnapshot = await getDocs(collection(db, "contratti"));
      console.log("📊 Contratti trovati:", querySnapshot.size);
      console.log("📋 Query snapshot:", querySnapshot);
        
        const contractsFromFirebase: Contract[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            codiceUnivocoOfferta: data.codiceUnivocoOfferta || '',
            dataCreazione: data.dataCreazione || '',
            creatoDa: data.creatoDa || { id: '', nome: '', cognome: '' },
            contatto: data.contatto || { nome: '', cognome: '', codiceFiscale: '' },
            ragioneSociale: data.ragioneSociale || '',
            isBusiness: data.isBusiness || false,
            statoOfferta: data.statoOfferta || 'Caricato',
            noteStatoOfferta: data.noteStatoOfferta || '',
            gestore: data.gestore || '',
            filePath: data.filePath || '',
            masterReference: data.masterReference || '',
            tipologiaContratto: data.tipologiaContratto || 'energia'
          };
        });
        
        setContracts(contractsFromFirebase);
        console.log("✅ CONTRATTI CARICATI CON SUCCESSO:", contractsFromFirebase);
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

    // Run Firebase test first, then fetch contracts
    runFirebaseTest();
    fetchContracts();
  }, []);

  // Filter contracts based on user role
  const visibleContracts = currentUser && Array.isArray(contracts) 
    ? contracts.filter((contract) => {
        if (userRole === 'admin' || userRole === 'back office') {
          return true; // Admin e Back Office vedono tutti i contratti
        }
        if (userRole === 'master') {
          // Master vede i suoi contratti e quelli dei suoi sub-agenti
          return contract.creatoDa.id === currentUser.id || contract.masterReference === currentUser.id;
        }
        if (userRole === 'consulente') {
          // Consulente vede solo i propri contratti
          return contract.creatoDa.id === currentUser.id;
        }
        return false;
      })
    : [];

  // Apply search and filters
  const filteredContracts = visibleContracts.filter(contract => {
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

    return matchesSearch && matchesCognome && matchesCodiceFiscale && matchesCodiceContratto && matchesStato;
  });

  const getStatusBadge = (stato: Contract['statoOfferta']) => {
    const statusConfig = {
      'Caricato': { color: 'bg-blue-100 text-blue-800', label: 'Caricato' },
      'Inserito': { color: 'bg-yellow-100 text-yellow-800', label: 'Inserito' },
      'Inserimento OK': { color: 'bg-green-100 text-green-800', label: 'Inserimento OK' },
      'Pagato': { color: 'bg-emerald-100 text-emerald-800', label: 'Pagato' },
      'Annullato': { color: 'bg-red-100 text-red-800', label: 'Annullato' }
    };
    
    const config = statusConfig[stato] || statusConfig['Caricato'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleDownloadPDF = (contract: Contract) => {
    if (contract.filePath) {
      // In un'implementazione reale, questo farebbe una chiamata API per scaricare il file
      console.log(`Scaricando contratto: ${contract.filePath}`);
      toast({
        title: "Download in corso",
        description: `Scaricando ${contract.codiceUnivocoOfferta}.pdf`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "File PDF non disponibile per questo contratto",
      });
    }
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setEditContractData({
      statoOfferta: contract.statoOfferta,
      noteStatoOfferta: contract.noteStatoOfferta,
      contatto: contract.contatto,
      ragioneSociale: contract.ragioneSociale || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteContract = async (contractId: string) => {
    try {
      await adminApi.deleteContract(contractId);
      setContracts(contracts.filter(c => c.id !== contractId));
      toast({
        title: "Contratto eliminato",
        description: "Il contratto è stato rimosso dal sistema",
      });
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare il contratto",
      });
    }
  };

  const handleUpdateNote = async () => {
    if (selectedContract) {
      try {
        await adminApi.updateContractStatus(
          selectedContract.id,
          selectedContract.statoOfferta,
          noteText
        );
        setContracts(contracts.map(c =>
          c.id === selectedContract.id
            ? { ...c, noteStatoOfferta: noteText }
            : c
        ));
        toast({
          title: "Note aggiornate",
          description: "Le note del contratto sono state salvate",
        });
        setIsNoteModalOpen(false);
        setSelectedContract(null);
        setNoteText('');
      } catch (error: any) {
        console.error('Error updating notes:', error);
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Impossibile aggiornare le note",
        });
      }
    }
  };

  const handleUpdateContract = async () => {
    if (editingContract) {
      try {
        await adminApi.updateContract(editingContract.id, {
          statoOfferta: editContractData.statoOfferta,
          noteStatoOfferta: editContractData.noteStatoOfferta,
          contatto: editContractData.contatto,
          ragioneSociale: editContractData.ragioneSociale
        });

        setContracts(contracts.map(c =>
          c.id === editingContract.id
            ? {
                ...c,
                statoOfferta: editContractData.statoOfferta,
                noteStatoOfferta: editContractData.noteStatoOfferta,
                contatto: editContractData.contatto,
                ragioneSociale: editContractData.ragioneSociale
              }
            : c
        ));

        toast({
          title: "Contratto aggiornato",
          description: "Le modifiche sono state salvate con successo",
        });

        setIsEditModalOpen(false);
        setEditingContract(null);
      } catch (error: any) {
        console.error('Error updating contract:', error);
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Impossibile aggiornare il contratto",
        });
      }
    }
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

  return (
    <AppLayout userRole={userRole}>
      <div className="font-roboto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="h-8 w-8" style={{ color: '#F2C927' }} />
                {userRole === 'admin' ? 'Gestione Contratti' : 'I Miei Contratti'}
              </h1>
              <p className="text-gray-600 mt-1">
                {userRole === 'admin'
                  ? 'Visualizza e gestisci tutti i contratti del sistema'
                  : 'Visualizza e gestisci i tuoi contratti'
                }
              </p>
            </div>
            
            <Link to="/compile-contract">
              <Button
                className="shadow-md"
                style={{ backgroundColor: '#F2C927', color: '#333333' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Contratto
              </Button>
            </Link>

            {/* Firebase Test Buttons (only for admin) */}
            {userRole === 'admin' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const result = await testFirebaseConnection();
                    if (result.success) {
                      toast({
                        title: "✅ Firebase Client OK",
                        description: `Connessione riuscita. ${result.documentsCount} contratti trovati.`
                      });
                    } else {
                      toast({
                        variant: "destructive",
                        title: "❌ Firebase Error",
                        description: result.error
                      });
                    }
                  }}
                >
                  🔥 Test Client
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetch('/.netlify/functions/test-firebase-admin');
                      const result = await response.json();

                      if (result.success) {
                        toast({
                          title: "✅ Firebase Admin OK",
                          description: `Admin SDK funzionante. ${result.tests.firestore.contractsInDatabase} contratti.`
                        });
                      } else {
                        toast({
                          variant: "destructive",
                          title: "❌ Firebase Admin Error",
                          description: result.error
                        });
                      }
                    } catch (error: any) {
                      toast({
                        variant: "destructive",
                        title: "❌ Admin Test Failed",
                        description: error.message
                      });
                    }
                  }}
                >
                  🔧 Test Admin
                </Button>
              </div>
            )}
          </div>

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

          {/* Filtri */}
          <Card className="mb-8 rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtri Avanzati
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Label htmlFor="filterStato">Stato Offerta</Label>
                  <Select value={filterStatoOfferta} onValueChange={setFilterStatoOfferta}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="Caricato">Caricato</SelectItem>
                      <SelectItem value="Inserito">Inserito</SelectItem>
                      <SelectItem value="Inserimento OK">Inserimento OK</SelectItem>
                      <SelectItem value="Pagato">Pagato</SelectItem>
                      <SelectItem value="Annullato">Annullato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debug Info */}
          <Card className="mb-4 rounded-2xl shadow-md bg-blue-50">
            <CardContent className="p-4">
              <div className="text-sm space-y-1">
                <p><strong>🔧 Debug Info:</strong></p>
                <p>📊 Contratti totali: {contracts.length} | Visibili: {visibleContracts.length} | Filtrati: {filteredContracts.length}</p>
                <p>👤 Current User: {currentUser?.nome || 'Non definito'} ({currentUser?.ruolo || 'ruolo non definito'})</p>
                <p>🔥 Firebase DB: {db ? '✅ Configurato' : '❌ Non configurato (usando dati mock)'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tabella Contratti */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle>Elenco Contratti</CardTitle>
              <CardDescription>
                {filteredContracts.length} contratt{filteredContracts.length !== 1 ? 'i' : 'o'} trovat{filteredContracts.length !== 1 ? 'i' : 'o'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredContracts.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun contratto trovato</h3>
                  <p className="text-gray-600">Prova a modificare i filtri di ricerca o aggiungi un nuovo contratto</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Creato il</TableHead>
                          <TableHead>Codice Univoco Offerta</TableHead>
                          {userRole === 'admin' && <TableHead>Creato da</TableHead>}
                          <TableHead>Contatto</TableHead>
                          {userRole === 'admin' && <TableHead>Ragione Sociale</TableHead>}
                          <TableHead>Stato Offerta</TableHead>
                          {userRole === 'admin' && <TableHead>Note Stato</TableHead>}
                          <TableHead>Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {new Date(contract.dataCreazione).toLocaleDateString('it-IT')}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{contract.codiceUnivocoOfferta}</TableCell>
                            {userRole === 'admin' && (
                              <TableCell>
                                {contract.creatoDa.nome} {contract.creatoDa.cognome}
                              </TableCell>
                            )}
                            <TableCell>
                              <div>
                                <div className="font-medium">{contract.contatto.cognome} {contract.contatto.nome}</div>
                                <div className="text-xs text-gray-500">{contract.contatto.codiceFiscale}</div>
                              </div>
                            </TableCell>
                            {userRole === 'admin' && (
                              <TableCell>
                                {contract.isBusiness && contract.ragioneSociale ? contract.ragioneSociale : '—'}
                              </TableCell>
                            )}
                            <TableCell>{getStatusBadge(contract.statoOfferta)}</TableCell>
                            {userRole === 'admin' && (
                              <TableCell>
                                <div className="max-w-32">
                                  <p className="text-sm text-gray-600 truncate" title={contract.noteStatoOfferta}>
                                    {contract.noteStatoOfferta || '—'}
                                  </p>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadPDF(contract)}
                                  title="Scarica PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditContract(contract)}
                                  title="Modifica contratto"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {(userRole === 'admin' || userRole === 'back office') && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedContract(contract);
                                        setNoteText(contract.noteStatoOfferta);
                                        setIsNoteModalOpen(true);
                                      }}
                                      title="Modifica note"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleDeleteContract(contract.id)}
                                      className="text-red-600 hover:text-red-700"
                                      title="Elimina contratto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-4 p-4 max-h-[600px] overflow-y-auto">
                    {filteredContracts.map((contract) => (
                      <Card key={contract.id} className="rounded-2xl">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900">{contract.codiceUnivocoOfferta}</h3>
                                <p className="text-sm text-gray-600">
                                  {contract.contatto.cognome} {contract.contatto.nome}
                                </p>
                                <p className="text-xs text-gray-500">{contract.contatto.codiceFiscale}</p>
                              </div>
                              {getStatusBadge(contract.statoOfferta)}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Creato il:</span>
                                <p>{new Date(contract.dataCreazione).toLocaleDateString('it-IT')}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Creato da:</span>
                                <p>{contract.creatoDa.nome} {contract.creatoDa.cognome}</p>
                              </div>
                              {contract.isBusiness && contract.ragioneSociale && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Ragione Sociale:</span>
                                  <p>{contract.ragioneSociale}</p>
                                </div>
                              )}
                              {contract.noteStatoOfferta && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Note:</span>
                                  <p className="text-xs">{contract.noteStatoOfferta}</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadPDF(contract)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditContract(contract)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Modifica
                              </Button>
                              {(userRole === 'admin' || userRole === 'back office') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteContract(contract.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Elimina
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Modal per modifica note */}
          <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
            <DialogContent className="sm:max-w-md font-roboto">
              <DialogHeader>
                <DialogTitle>Modifica Note Stato Offerta</DialogTitle>
                <DialogDescription>
                  Contratto: {selectedContract?.codiceUnivocoOfferta}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="noteText">Note Stato Offerta</Label>
                  <Textarea
                    id="noteText"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Inserisci note di annullamento o lavorazione..."
                    className="rounded-2xl"
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNoteModalOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={handleUpdateNote}
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                >
                  Salva Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal per modifica contratto */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-2xl font-roboto">
              <DialogHeader>
                <DialogTitle>Modifica Contratto</DialogTitle>
                <DialogDescription>
                  Contratto: {editingContract?.codiceUnivocoOfferta}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editNome">Nome</Label>
                    <Input
                      id="editNome"
                      value={editContractData.contatto.nome}
                      onChange={(e) => setEditContractData({
                        ...editContractData,
                        contatto: { ...editContractData.contatto, nome: e.target.value }
                      })}
                      className="rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="editCognome">Cognome</Label>
                    <Input
                      id="editCognome"
                      value={editContractData.contatto.cognome}
                      onChange={(e) => setEditContractData({
                        ...editContractData,
                        contatto: { ...editContractData.contatto, cognome: e.target.value }
                      })}
                      className="rounded-2xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editCodiceFiscale">Codice Fiscale</Label>
                  <Input
                    id="editCodiceFiscale"
                    value={editContractData.contatto.codiceFiscale}
                    onChange={(e) => setEditContractData({
                      ...editContractData,
                      contatto: { ...editContractData.contatto, codiceFiscale: e.target.value }
                    })}
                    className="rounded-2xl"
                  />
                </div>

                {editingContract?.isBusiness && (
                  <div>
                    <Label htmlFor="editRagioneSociale">Ragione Sociale</Label>
                    <Input
                      id="editRagioneSociale"
                      value={editContractData.ragioneSociale}
                      onChange={(e) => setEditContractData({
                        ...editContractData,
                        ragioneSociale: e.target.value
                      })}
                      className="rounded-2xl"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="editStato">Stato Offerta</Label>
                  <Select
                    value={editContractData.statoOfferta}
                    onValueChange={(value: Contract['statoOfferta']) =>
                      setEditContractData({ ...editContractData, statoOfferta: value })
                    }
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Caricato">Caricato</SelectItem>
                      <SelectItem value="Inserito">Inserito</SelectItem>
                      <SelectItem value="Inserimento OK">Inserimento OK</SelectItem>
                      <SelectItem value="Pagato">Pagato</SelectItem>
                      <SelectItem value="Annullato">Annullato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editNote">Note Stato Offerta</Label>
                  <Textarea
                    id="editNote"
                    value={editContractData.noteStatoOfferta}
                    onChange={(e) => setEditContractData({
                      ...editContractData,
                      noteStatoOfferta: e.target.value
                    })}
                    placeholder="Inserisci note..."
                    className="rounded-2xl"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Annulla
                </Button>
                <Button
                  onClick={handleUpdateContract}
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                >
                  Salva Modifiche
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </AppLayout>
  );
}
