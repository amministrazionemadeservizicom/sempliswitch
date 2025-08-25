import { useEffect, useState } from "react";
import { query, where, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import {
  Users as UsersIcon,
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  UserPlus,
  AlertCircle
} from "lucide-react";
import { createAndSaveUser } from "../lib/createAndSaveUser";
import { AVAILABLE_PLANET_NAMES, AVAILABLE_GESTORI } from "../constants";

interface User {
  id: string;
  nome: string;
  email: string;
  ruolo: "admin" | "back office" | "consulente" | "master";
  stato: 'attivo' | 'non attivo';
  pianoCompensi?: string;
  gestoriAssegnati?: string[];
  master?: string;
  createdAt: string;
  lastLogin?: string;
}

export default function Users() {
  const { user: currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form states
  const [formData, setFormData] = useState<{
    nome: string;
    email: string;
    password: string;
    ruolo: 'admin' | 'back office' | 'consulente' | 'master';
    stato: boolean;
    pianoCompensi: string;
    gestoriAssegnati: string[];
    master: string;
  }>({
    nome: '',
    email: '',
    password: '',
    ruolo: 'consulente',
    stato: true,
    pianoCompensi: '',
    gestoriAssegnati: [],
    master: '',
  });

  const handleViewUser = (user: any) => {
    console.log("Visualizza utente:", user);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    // Pre-fill form with user data
    setFormData({
      nome: user.nome,
      email: user.email,
      password: '', // Don't pre-fill password for security
      ruolo: user.ruolo,
      stato: user.stato === 'attivo',
      pianoCompensi: user.pianoCompensi || '',
      gestoriAssegnati: user.gestoriAssegnati || [],
      master: user.master || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // For now, just remove from local state
      // In production, this would call an API to delete from Firebase
      setUsers(users.filter(u => u.id !== selectedUser.id));

      toast({
        title: "Utente eliminato",
        description: `L'utente ${selectedUser.nome} è stato rimosso dal sistema`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare l'utente"
      });
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      if (!db) {
        // Fallback to mock data if Firebase not configured
        const mockUsers: User[] = [
          {
            id: '1',
            nome: 'Marco Amministratore',
            email: 'marco.admin@sempliswitch.com',
            ruolo: 'admin',
            stato: 'attivo',
            createdAt: '2024-01-15',
            lastLogin: '2024-03-15'
          },
          {
            id: '2',
            nome: 'Giulia Supporto',
            email: 'giulia.supporto@sempliswitch.com',
            ruolo: 'back office',
            stato: 'attivo',
            createdAt: '2024-01-20',
            lastLogin: '2024-03-14'
          }
        ];
        setUsers(mockUsers);
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(collection(db, "utenti"));
      const usersFromFirebase: User[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: `${data.nome || ''} ${data.cognome || ''}`.trim(),
          email: data.email || '',
          ruolo: data.ruolo || 'consulente',
          stato: data.attivo ? "attivo" : "non attivo",
          pianoCompensi: data.pianoCompensi || "",
          gestoriAssegnati: data.gestoriAssegnati || [],
          master: data.master || '',
          createdAt: data.createdAt || "",
          lastLogin: data.lastLogin || ""
        };
      });

      const cleanedUsers = usersFromFirebase.filter(user =>
        user.email && !user.email.includes('"') && !user.email.includes('*')
      );
      setUsers(cleanedUsers);
    } catch (error) {
      console.error("Errore nel recupero utenti da Firebase:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare gli utenti da Firebase"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      if (!db) {
        setMasters([]);
        return;
      }

      const q = query(collection(db, "utenti"), where("ruolo", "==", "master"));
      const querySnapshot = await getDocs(q);
      const mastersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        cognome: doc.data().cognome || '',
      }));
      setMasters(mastersData);
    } catch (error) {
      console.error("Errore nel recupero dei master:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMasters();
  }, []);

  // Show loading while auth is being determined
  if (userRole === null) {
    return (
      <div className="min-h-screen bg-white font-roboto flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifica autorizzazioni...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (userRole !== "admin") {
    return (
      <div className="min-h-screen bg-white font-roboto flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Accesso Negato</h2>
            <p className="text-red-600">Questa pagina è riservata agli amministratori.</p>
            <p className="text-sm text-red-500 mt-2">Ruolo attuale: {userRole || 'Non definito'}</p>
          </div>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      password: '',
      ruolo: 'consulente',
      stato: true,
      pianoCompensi: '',
      gestoriAssegnati: [],
      master: ''
    });
  };

  const utentiVisibili = Array.isArray(users) ? users : [];
  const filteredUsers = utentiVisibili;
  const handleCreateUser = async () => {
    if (!formData.nome || !formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Compila tutti i campi obbligatori"
      });
      return;
    }

    try {
      const uid = await createAndSaveUser(formData);
      toast({
        title: "✅ Utente creato con successo!",
        description: `Il sistema invierà una mail automatica a ${formData.nome} con i dati di accesso`,
      });
      setIsCreateModalOpen(false);
      resetForm();
      // Refresh the user list to show the newly created user
      await fetchUsers();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Creazione utente fallita",
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    toast({
      title: "Utente eliminato",
      description: "L'utente è stato rimosso dal sistema",
    });
  };

  const getRoleBadge = (ruolo: User['ruolo']) => {
    const variants = {
      'admin': 'destructive',
      'back office': 'secondary',
      'consulente': 'default',
      'master': 'outline'
    } as const;
    
    return <Badge variant={variants[ruolo] || 'default'}>{ruolo}</Badge>;
  };

  const getStatusBadge = (stato: User['stato']) => {
    return stato === 'attivo' ? 
      <Badge className="bg-green-100 text-green-800">Attivo</Badge> : 
      <Badge variant="secondary">Non Attivo</Badge>;
  };

  const handleGestoreToggle = (gestore: string) => {
    const newGestori = formData.gestoriAssegnati.includes(gestore)
      ? formData.gestoriAssegnati.filter(g => g !== gestore)
      : [...formData.gestoriAssegnati, gestore];
    
    setFormData({ ...formData, gestoriAssegnati: newGestori });
  };

  return (
    <AppLayout userRole="admin">
      <div className="min-h-screen bg-white font-roboto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <UsersIcon className="h-8 w-8" style={{ color: '#F2C927' }} />
                Gestione Utenti
              </h1>
              <p className="text-gray-600 mt-1">Crea, modifica e controlla gli utenti del sistema</p>
            </div>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm}
                  className="shadow-md"
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea nuovo utente
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-lg font-roboto max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Crea Nuovo Utente
                  </DialogTitle>
                  <DialogDescription>
                    Inserisci i dati per creare un nuovo utente nel sistema
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        placeholder="Mario Rossi"
                        className="rounded-2xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="mario@sempliswitch.com"
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Password temporanea"
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ruolo">Ruolo</Label>
                      <Select value={formData.ruolo} onValueChange={(value: 'admin' | 'back office' | 'consulente' | 'master') => setFormData({...formData, ruolo: value})}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="back office">Back Office</SelectItem>
                          <SelectItem value="consulente">Consulente</SelectItem>
                          <SelectItem value="master">Master</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="stato"
                        checked={formData.stato}
                        onCheckedChange={(checked) => setFormData({...formData, stato: checked})}
                      />
                      <Label htmlFor="stato">Utente attivo</Label>
                    </div>
                  </div>

                  {/* Sezione Master per Consulenti */}
                  {formData.ruolo === 'consulente' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-2xl">
                      <h4 className="font-semibold text-gray-900">Seleziona Master di Riferimento</h4>
                      <div>
                        <Label htmlFor="master">Master</Label>
                        <Select
                          value={formData.master}
                          onValueChange={(value) => setFormData({ ...formData, master: value })}
                        >
                          <SelectTrigger className="rounded-2xl">
                            <SelectValue placeholder="Seleziona Master" />
                          </SelectTrigger>
                          <SelectContent>
                            {masters.map((master) => (
                              <SelectItem key={master.id} value={master.id}>
                                {master.nome} {master.cognome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Configurazione per Consulenti e Master */}
                  {(formData.ruolo === 'consulente' || formData.ruolo === 'master') && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-2xl">
                      <h4 className="font-semibold text-gray-900">
                        Configurazione {formData.ruolo === 'consulente' ? 'Consulente' : 'Master'}
                      </h4>
                      
                      <div>
                        <Label htmlFor="pianoCompensi">Piano Compensi</Label>
                        <Select
                          value={formData.pianoCompensi}
                          onValueChange={(value) => setFormData({ ...formData, pianoCompensi: value })}
                        >
                          <SelectTrigger className="rounded-2xl">
                            <SelectValue placeholder="Seleziona piano" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_PLANET_NAMES.map(name => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Gestori Assegnati</Label>
                        <div className="grid grid-cols-3 gap-3 mt-2 max-h-64 overflow-y-auto p-2 border rounded-lg bg-white">
                          {AVAILABLE_GESTORI.map((gestore) => (
                            <div key={gestore} className="flex items-center space-x-2">
                              <Checkbox
                                id={gestore}
                                checked={formData.gestoriAssegnati.includes(gestore)}
                                onCheckedChange={() => handleGestoreToggle(gestore)}
                              />
                              <Label htmlFor={gestore} className="text-sm leading-tight">{gestore}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleCreateUser}
                    style={{ backgroundColor: '#F2C927', color: '#333333' }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crea Utente
                  </Button> 
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filtri */}
          <Card className="mb-8 rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtri di Ricerca
              </CardTitle>
            </CardHeader>
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
                      placeholder="Cerca per nome o email..."
                      className="pl-10 rounded-2xl"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="filterRole">Ruolo</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i ruoli</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="back office">Back Office</SelectItem>
                      <SelectItem value="consulente">Consulente</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="filterStatus">Stato</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="attivo">Attivo</SelectItem>
                      <SelectItem value="non attivo">Non Attivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabella Utenti */}
          <Card className="rounded-2xl shadow-md mb-8">
            <CardHeader>
              <CardTitle>Elenco Utenti</CardTitle>
              <CardDescription>
                {filteredUsers.length} utent{filteredUsers.length !== 1 ? 'i' : 'e'} trovat{filteredUsers.length !== 1 ? 'i' : 'o'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Caricamento utenti...</h3>
                  <p className="text-gray-600">Recupero dati da Firebase</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun utente trovato</h3>
                  <p className="text-gray-600">Prova a modificare i filtri di ricerca o crea un nuovo utente</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Nome e Cognome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Ruolo</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.nome}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{getRoleBadge(user.ruolo)}</TableCell>
                            <TableCell>
                              {user.stato === 'attivo' ? (
                                <Badge className="bg-green-100 text-green-800">Attivo</Badge>
                              ) : (
                                <Badge variant="secondary">Non Attivo</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4 p-4 max-h-[500px] overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} className="rounded-2xl">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{user.nome}</h3>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                            {user.stato === 'attivo' ? (
                              <Badge className="bg-green-100 text-green-800">Attivo</Badge>
                            ) : (
                              <Badge variant="secondary">Non Attivo</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 mb-3 text-sm">
                            <div>
                              <span className="text-gray-500">Ruolo:</span>
                              <div className="mt-1">{getRoleBadge(user.ruolo)}</div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="flex-1"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>



        </div>
      </div>
    </AppLayout>
  );
}
