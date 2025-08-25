import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { AVAILABLE_GESTORI } from "../constants";
import { db } from "../firebase";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc
} from "firebase/firestore";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Power,
  PowerOff,
  Zap,
  Flame,
  Phone,
  Sun,
  Building,
  Home,
  User,
  Calendar,
  Euro,
  Upload,
  Save,
  X,
  FileText,
  Settings,
  Trash2
} from "lucide-react";

interface AdminOffer {
  id: string;
  name: string;
  brand: string;
  brandLogo?: string;
  serviceType: 'energia' | 'telefonia';
  customerType: 'privato' | 'business' | 'condominio';
  supplyType: 'luce' | 'gas' | 'ftth' | 'fttc' | 'fwa';
  priceType: 'fisso' | 'variabile' | 'indicizzato';
  price: string;
  expiryDate: string;
  description: string;
  terms: string;
  bonuses: string;
  duration: string;
  contacts: string;
  notes: string;
  pdfUrl?: string;
  isActive: boolean;
  activationType?: string[];
  billingFrequency: 'mensile' | 'bimestrale' | 'trimestrale';
  paymentMethods: string[];
  ccv?: string;
  technology?: 'ftth' | 'fttc' | 'fwa';
  migrationType?: 'migrazione' | 'nuova_utenza';
  commission: {
    privato: number;
    business: number;
    condominio: number;
  };
}

// —— Helpers date: accetta 'DD/MM/YYYY' e 'YYYY-MM-DD' ——
function parseToDate(value?: string): Date | null {
  if (!value) return null;
  const v = value.trim();
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // ITA: DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split('/');
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Ritorna stringa ISO 'YYYY-MM-DD' utile per <input type="date">
function toISODateString(value?: string): string {
  const d = parseToDate(value);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Confronto range chiuso [from, to]
function isWithin(dateStr: string, fromISO?: string, toISO?: string): boolean {
  const d = parseToDate(dateStr);
  if (!d) return false;
  const t = d.getTime();
  if (fromISO) {
    const f = new Date(fromISO + 'T00:00:00').getTime();
    if (t < f) return false;
  }
  if (toISO) {
    const to = new Date(toISO + 'T23:59:59').getTime();
    if (t > to) return false;
  }
  return true;
}

const MOCK_ADMIN_OFFERS: AdminOffer[] = [
  {
    id: "1",
    name: "Acea Next48 Luce",
    brand: "Acea",
    serviceType: "energia",
    customerType: "privato",
    supplyType: "luce",
    priceType: "fisso",
    price: "0.08 €/kWh",
    expiryDate: "31/03/2024",
    description: "Offerta luce a prezzo fisso per 24 mesi con energia 100% verde",
    terms: "Prezzo bloccato per 24 mesi. Contributo fisso 8€/mese. Attivazione gratuita.",
    bonuses: "Sconto 50€ sulla prima bolletta. Energia verde certificata.",
    duration: "24 mesi",
    contacts: "800-123-456 - info@acea.it",
    notes: "Offerta valida solo per nuovi clienti",
    pdfUrl: "/offers/acea-next48.pdf",
    isActive: true,
    activationType: ["switch", "subentro", "prima_attivazione"],
    billingFrequency: "bimestrale",
    paymentMethods: ["RID/SEPA", "Bollettino", "Carta di credito"],
    ccv: "8.50 €/mese",
    commission: { privato: 45, business: 65, condominio: 85 }
  },
  {
    id: "2",
    name: "TIM Super Fibra",
    brand: "TIM",
    serviceType: "telefonia",
    customerType: "privato",
    supplyType: "ftth",
    priceType: "fisso",
    price: "29.90 €/mese",
    expiryDate: "28/02/2024",
    description: "Fibra ultraveloce fino a 1 Gbit/s con chiamate illimitate",
    terms: "Velocità fino a 1000 Mb/s. Chiamate nazionali incluse. Modem TIM HUB+.",
    bonuses: "Attivazione gratuita. 3 mesi gratis. Disney+ 6 mesi inclusi.",
    duration: "24 mesi",
    contacts: "187 - vendite@tim.it",
    notes: "Verifica copertura fibra FTTH",
    isActive: true,
    billingFrequency: "mensile",
    paymentMethods: ["RID/SEPA", "Carta di credito", "Bollettino"],
    technology: "ftth",
    migrationType: "migrazione",
    commission: { privato: 80, business: 120, condominio: 150 }
  },
  {
    id: "3",
    name: "Edison Easy Gas",
    brand: "Edison",
    serviceType: "energia",
    customerType: "business",
    supplyType: "gas",
    priceType: "variabile",
    price: "0.75 €/Smc",
    expiryDate: "20/03/2024",
    description: "Offerta gas variabile per aziende",
    terms: "Prezzo variabile collegato al PSV. Quote fisse competitive.",
    bonuses: "Assistenza dedicata 24/7.",
    duration: "12 mesi",
    contacts: "800-031-141 - business@edison.it",
    notes: "Riservata ad aziende con P.IVA",
    isActive: false,
    activationType: ["switch", "prima_attivazione"],
    billingFrequency: "mensile",
    paymentMethods: ["RID/SEPA", "Bonifico"],
    ccv: "12.00 €/mese",
    commission: { privato: 35, business: 55, condominio: 75 }
  }
];

export default function AdminOffers() {
  const { userRole } = useAuth();
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredOffers, setFilteredOffers] = useState<AdminOffer[]>([]);
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null);
  const [isNewOfferModalOpen, setIsNewOfferModalOpen] = useState(false);
  const [detailsOffer, setDetailsOffer] = useState<AdminOffer | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    serviceType: 'all',
    brand: '',
    customerType: '',
    supplyType: '',
    isActive: '',
    searchTerm: '',
    expiryFrom: '', // ISO YYYY-MM-DD
    expiryTo: ''    // ISO YYYY-MM-DD
  });

  // Get offers from Firestore
  const getOffers = async () => {
    try {
      const offersCollection = collection(db, "offers");
      const offersSnapshot = await getDocs(offersCollection);
      const offersData = offersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminOffer[];
      return offersData;
    } catch (error: any) {
      console.error('Error fetching offers from Firestore:', error?.code, error?.message, error);
      throw error;
    }
  };

  // Load offers
  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const offersData = await getOffers();
        setOffers(offersData);
        setFilteredOffers(offersData);
      } catch (error: any) {
        console.error('Error loading offers:', error?.code, error?.message, error);
        // Use MOCK_ADMIN_OFFERS as fallback
        setOffers(MOCK_ADMIN_OFFERS);
        setFilteredOffers(MOCK_ADMIN_OFFERS);
        toast({
          title: "Errore",
          description: `Errore nel caricamento: ${error?.code || ''} ${error?.message || ''}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadOffers();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = offers;

    if (filters.serviceType && filters.serviceType !== 'all') {
      filtered = filtered.filter(offer => offer.serviceType === filters.serviceType);
    }
    if (filters.brand && filters.brand !== 'all') {
      filtered = filtered.filter(offer => offer.brand === filters.brand);
    }
    if (filters.customerType && filters.customerType !== 'all') {
      filtered = filtered.filter(offer => offer.customerType === filters.customerType);
    }
    if (filters.supplyType && filters.supplyType !== 'all') {
      filtered = filtered.filter(offer => offer.supplyType === filters.supplyType);
    }
    if (filters.isActive !== '' && filters.isActive !== 'all') {
      filtered = filtered.filter(offer => offer.isActive === (filters.isActive === 'true'));
    }
    if (filters.searchTerm) {
      filtered = filtered.filter(offer =>
        offer.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        offer.brand.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Filtro per data di scadenza (range)
    if (filters.expiryFrom || filters.expiryTo) {
      filtered = filtered.filter(offer =>
        isWithin(offer.expiryDate, filters.expiryFrom || undefined, filters.expiryTo || undefined)
      );
    }

    setFilteredOffers(filtered);
  }, [filters, offers]);

  const handleSaveOffer = async (offer: AdminOffer) => {
    try {
      if (offer.id && offers.find(o => o.id === offer.id)) {
        // Update existing offer
        const ref = doc(db, "offers", offer.id);
        const offerData = { ...offer };
        delete offerData.id; // Remove id from the data to update
        await updateDoc(ref, offerData);
        setOffers(prev => prev.map(o => o.id === offer.id ? offer : o));
        console.log('Offer updated successfully:', offer.id);
      } else {
        // Create new offer - let Firestore generate the ID
        const colRef = collection(db, "offers");
        const offerData = { ...offer };
        delete offerData.id; // Remove empty id
        offerData.isActive = !!offerData.isActive; // Ensure boolean

        const docRef = await addDoc(colRef, offerData);
        const created: AdminOffer = { ...offerData, id: docRef.id };
        setOffers(prev => [...prev, created]);
        setFilteredOffers(prev => [...prev, created]);
        console.log('New offer created successfully:', docRef.id);
      }

      setEditingOffer(null);
      setIsNewOfferModalOpen(false);
      toast({
        title: "Successo",
        description: "Offerta salvata con successo.",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error saving offer:', error?.code, error?.message, error);
      toast({
        title: "Errore",
        description: `Salvataggio fallito: ${error?.code || ''} ${error?.message || 'Errore sconosciuto'}`,
        variant: "destructive",
      });
    }
  };

  const handleToggleOfferStatus = async (offerId: string) => {
    try {
      const current = offers.find(o => o.id === offerId);
      if (!current) return;
      const next = { ...current, isActive: !current.isActive };
      await updateDoc(doc(db, "offers", offerId), { isActive: next.isActive });
      setOffers(prev => prev.map(o => o.id === offerId ? next : o));
      toast({ title: "Successo", description: "Stato offerta aggiornato." });
    } catch (error: any) {
      console.error('Error toggling status:', error?.code, error?.message, error);
      toast({
        title: "Errore",
        description: `Aggiornamento stato fallito: ${error?.code || ''} ${error?.message || ''}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Sei sicuro di voler cancellare questa offerta?")) return;
    try {
      await deleteDoc(doc(db, "offers", offerId));
      setOffers(prev => prev.filter(o => o.id !== offerId));
      setFilteredOffers(prev => prev.filter(o => o.id !== offerId));
      toast({ title: "Successo", description: "Offerta cancellata." });
    } catch (error: any) {
      console.error('Error deleting offer:', error?.code, error?.message, error);
      toast({
        title: "Errore",
        description: `Cancellazione fallita: ${error?.code || ''} ${error?.message || ''}`,
        variant: "destructive",
      });
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'energia': return <Zap className="h-5 w-5 text-blue-600" />;
      case 'telefonia': return <Phone className="h-5 w-5 text-green-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCustomerIcon = (type: string) => {
    switch (type) {
      case 'privato': return <User className="h-4 w-4" />;
      case 'business': return <Building className="h-4 w-4" />;
      case 'condominio': return <Home className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getSupplyTypeColor = (type: string) => {
    switch (type) {
      case 'luce': return 'bg-blue-100 text-blue-800';
      case 'gas': return 'bg-orange-100 text-orange-800';
      case 'ftth': return 'bg-green-100 text-green-800';
      case 'fttc': return 'bg-yellow-100 text-yellow-800';
      case 'fwa': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppLayout userRole={userRole}>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento offerte...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole={userRole}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestione Offerte</h1>
              <p className="text-gray-600 mt-1">Amministra tutte le offerte energia e telefonia</p>
            </div>
            <Button
              onClick={() => setIsNewOfferModalOpen(true)}
              className="flex items-center gap-2"
              style={{ backgroundColor: '#E6007E', color: 'white' }}
            >
              <Plus className="h-4 w-4" />
              Nuova Offerta
            </Button>
          </div>

          {/* Filters Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtri di Ricerca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div>
                  <Label>Tipo Offerta</Label>
                  <Select value={filters.serviceType} onValueChange={(value) => setFilters({...filters, serviceType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                     <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="energia">Energia</SelectItem>
                      <SelectItem value="telefonia">Telefonia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Gestore</Label>
                  <Select value={filters.brand} onValueChange={(value) => setFilters({...filters, brand: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                     <SelectItem value="all">Tutti</SelectItem>
                      {AVAILABLE_GESTORI.map(gestore => (
                        <SelectItem key={gestore} value={gestore}>{gestore}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo Cliente</Label>
                  <Select value={filters.customerType} onValueChange={(value) => setFilters({...filters, customerType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="privato">Privato</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="condominio">Condominio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo Fornitura</Label>
                  <Select value={filters.supplyType} onValueChange={(value) => setFilters({...filters, supplyType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="luce">Luce</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="ftth">FTTH</SelectItem>
                      <SelectItem value="fttc">FTTC</SelectItem>
                      <SelectItem value="fwa">FWA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Disponibilità</Label>
                  <Select value={filters.isActive} onValueChange={(value) => setFilters({...filters, isActive: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="true">Attiva</SelectItem>
                      <SelectItem value="false">Non Attiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Scadenza da</Label>
                  <Input
                    type="date"
                    value={filters.expiryFrom}
                    onChange={(e) => setFilters({ ...filters, expiryFrom: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Scadenza a</Label>
                  <Input
                    type="date"
                    value={filters.expiryTo}
                    onChange={(e) => setFilters({ ...filters, expiryTo: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Ricerca Nome</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca offerta..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    serviceType: 'all',
                    brand: 'all',
                    customerType: 'all',
                    supplyType: 'all',
                    isActive: 'all',
                    searchTerm: '',
                    expiryFrom: '',
                    expiryTo: ''
                  })}
                >
                  Cancella Filtri
                </Button>
                <div className="text-sm text-gray-500 flex items-center">
                  Trovate {filteredOffers.length} offerte
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Offers List */}
          <div className="space-y-4">
            {filteredOffers.length === 0 ? (
              <Card className="text-center p-12">
                <div className="text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nessuna offerta trovata</h3>
                  <p>Non ci sono offerte che corrispondono ai criteri di ricerca.</p>
                </div>
              </Card>
            ) : (
              filteredOffers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        {/* Service Icon & Basic Info */}
                        <div className="flex items-center gap-3">
                          {getServiceIcon(offer.serviceType)}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{offer.name}</h3>
                            <p className="text-gray-600">{offer.brand}</p>
                          </div>
                        </div>

                        {/* Customer Type */}
                        <div className="flex items-center gap-2">
                          {getCustomerIcon(offer.customerType)}
                          <div>
                            <div className="text-sm text-gray-500">Cliente</div>
                            <div className="font-medium capitalize">{offer.customerType}</div>
                          </div>
                        </div>

                        {/* Supply Type */}
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Fornitura</div>
                          <Badge className={`text-xs ${getSupplyTypeColor(offer.supplyType)}`}>
                            {offer.supplyType.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Price */}
                        <div>
                          <div className="text-sm text-gray-500">Prezzo</div>
                          <div className="font-bold" style={{ color: '#E6007E' }}>
                            {offer.price}
                          </div>
                        </div>

                        {/* CCV */}
                        <div>
                          <div className="text-sm text-gray-500">CCV</div>
                          <div className="font-medium">{offer.ccv || '—'}</div>
                        </div>

                        {/* Expiry */}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">Scadenza</div>
                            <div className="font-medium">
                              {(() => {
                                const d = parseToDate(offer.expiryDate);
                                if (!d) return offer.expiryDate || '—';
                                const dd = String(d.getDate()).padStart(2, '0');
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const yyyy = d.getFullYear();
                                return `${dd}/${mm}/${yyyy}`;
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Stato</div>
                          <Badge variant={offer.isActive ? "default" : "secondary"}>
                            {offer.isActive ? "Attiva" : "Non Attiva"}
                          </Badge>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailsOffer(offer)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Dettagli
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOffer(offer)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Modifica
                        </Button>
                        
                        <Button
                          variant={offer.isActive ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleOfferStatus(offer.id)}
                          className="flex items-center gap-2"
                        >
                          {offer.isActive ? (
                            <>
                              <PowerOff className="h-4 w-4" />
                              Disattiva
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4" />
                              Riattiva
                            </>
                          )}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Cancella
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Details Modal */}
          <Dialog open={!!detailsOffer} onOpenChange={() => setDetailsOffer(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {detailsOffer && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      {getServiceIcon(detailsOffer.serviceType)}
                      {detailsOffer.name}
                    </DialogTitle>
                    <DialogDescription>
                      {detailsOffer.brand} - {detailsOffer.description}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Tipo Servizio</Label>
                        <p className="capitalize">{detailsOffer.serviceType}</p>
                      </div>
                      <div>
                        <Label>Tipo Cliente</Label>
                        <p className="capitalize">{detailsOffer.customerType}</p>
                      </div>
                      <div>
                        <Label>Tipo Fornitura</Label>
                        <p className="uppercase">{detailsOffer.supplyType}</p>
                      </div>
                      <div>
                        <Label>Prezzo</Label>
                        <p className="font-bold text-lg" style={{ color: '#E6007E' }}>{detailsOffer.price}</p>
                      </div>
                      <div>
                        <Label>Fatturazione</Label>
                        <p className="capitalize">{detailsOffer.billingFrequency}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Data Scadenza</Label>
                        <p>{detailsOffer.expiryDate}</p>
                      </div>
                      <div>
                        <Label>Durata</Label>
                        <p>{detailsOffer.duration}</p>
                      </div>
                      <div>
                        <Label>Modalità Pagamento</Label>
                        <p>{detailsOffer.paymentMethods.join(', ')}</p>
                      </div>
                      <div>
                        <Label>Stato</Label>
                        <Badge variant={detailsOffer.isActive ? "default" : "secondary"}>
                          {detailsOffer.isActive ? "Attiva" : "Non Attiva"}
                        </Badge>
                      </div>
                      <div>
                        <Label>CCV</Label>
                        <p>{detailsOffer.ccv || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    <div>
                      <Label>Descrizione</Label>
                      <p className="text-sm text-gray-600">{detailsOffer.description}</p>
                    </div>
                    <div>
                      <Label>Condizioni</Label>
                      <p className="text-sm text-gray-600">{detailsOffer.terms}</p>
                    </div>
                    <div>
                      <Label>Bonus</Label>
                      <p className="text-sm text-gray-600">{detailsOffer.bonuses}</p>
                    </div>
                    {detailsOffer.notes && (
                      <div>
                        <Label>Note</Label>
                        <p className="text-sm text-gray-600">{detailsOffer.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <Label>Compensi</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold" style={{ color: '#E6007E' }}>
                          €{detailsOffer.commission.privato}
                        </div>
                        <div className="text-xs text-gray-600">Privato</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold" style={{ color: '#E6007E' }}>
                          €{detailsOffer.commission.business}
                        </div>
                        <div className="text-xs text-gray-600">Business</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold" style={{ color: '#E6007E' }}>
                          €{detailsOffer.commission.condominio}
                        </div>
                        <div className="text-xs text-gray-600">Condominio</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit/New Offer Modal */}
          <Dialog open={!!editingOffer || isNewOfferModalOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingOffer(null);
              setIsNewOfferModalOpen(false);
            }
          }}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOffer ? 'Modifica Offerta' : 'Nuova Offerta'}
                </DialogTitle>
                <DialogDescription>
                  {editingOffer ? 
                    `Modifica i dettagli dell'offerta ${editingOffer.name}` :
                    'Crea una nuova offerta nel sistema'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <OfferForm 
                offer={editingOffer} 
                onSave={handleSaveOffer}
                onCancel={() => {
                  setEditingOffer(null);
                  setIsNewOfferModalOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}

// Offer Form Component
function OfferForm({ 
  offer, 
  onSave, 
  onCancel 
}: { 
  offer: AdminOffer | null; 
  onSave: (offer: AdminOffer) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState<AdminOffer>(
    offer || {
      id: '',
      name: '',
      brand: '',
      serviceType: 'energia',
      customerType: 'privato',
      supplyType: 'luce',
      priceType: 'fisso',
      price: '',
      expiryDate: '',
      description: '',
      terms: '',
      bonuses: '',
      duration: '',
      contacts: '',
      notes: '',
      isActive: true,
      activationType: [],
      billingFrequency: 'mensile',
      paymentMethods: [],
      commission: { privato: 0, business: 0, condominio: 0 }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = { ...formData };
    if (normalized.customerType === 'privato') {
      normalized.commission.business = 0;
      normalized.commission.condominio = 0;
    } else if (normalized.customerType === 'business') {
      normalized.commission.privato = 0;
      normalized.commission.condominio = 0;
    } else {
      normalized.commission.privato = 0;
      normalized.commission.business = 0;
    }
    onSave(normalized);
  };

  const updateField = (field: keyof AdminOffer, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateCommission = (type: keyof AdminOffer['commission'], value: number) => {
    setFormData(prev => ({
      ...prev,
      commission: { ...prev.commission, [type]: value }
    }));
  };

  const handleActivationTypeChange = (type: string, checked: boolean) => {
    const currentTypes = formData.activationType || [];
    if (checked) {
      updateField('activationType', [...currentTypes, type]);
    } else {
      updateField('activationType', currentTypes.filter(t => t !== type));
    }
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    const currentMethods = formData.paymentMethods || [];
    if (checked) {
      updateField('paymentMethods', [...currentMethods, method]);
    } else {
      updateField('paymentMethods', currentMethods.filter(m => m !== method));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service Type Selection */}
      <div className="border-b pb-6">
        <Label>Tipo Servizio</Label>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="energia"
              name="serviceType"
              value="energia"
              checked={formData.serviceType === 'energia'}
              onChange={(e) => updateField('serviceType', e.target.value)}
            />
            <Label htmlFor="energia">Energia</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="telefonia"
              name="serviceType"
              value="telefonia"
              checked={formData.serviceType === 'telefonia'}
              onChange={(e) => updateField('serviceType', e.target.value)}
            />
            <Label htmlFor="telefonia">Telefonia</Label>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="brand">Gestore/Brand *</Label>
          <Select value={formData.brand} onValueChange={(value) => updateField('brand', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona gestore" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_GESTORI.map(gestore => (
                <SelectItem key={gestore} value={gestore}>{gestore}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="name">Nome Offerta *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="customerType">Tipo Cliente *</Label>
          <Select value={formData.customerType} onValueChange={(value) => updateField('customerType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="privato">Privato</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="condominio">Condominio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Service-specific fields */}
      {formData.serviceType === 'energia' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Label>Tipo Fornitura *</Label>
              <Select value={formData.supplyType} onValueChange={(value) => updateField('supplyType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="luce">Luce</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo Offerta *</Label>
              <Select value={formData.priceType} onValueChange={(value) => updateField('priceType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisso">Prezzo Fisso</SelectItem>
                  <SelectItem value="variabile">Variabile</SelectItem>
                  <SelectItem value="indicizzato">Indicizzato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Prezzo *</Label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder="es. 0.08 €/kWh"
                required
              />
            </div>

            <div>
              <Label htmlFor="ccv">CCV</Label>
              <Input
                id="ccv"
                value={formData.ccv || ''}
                onChange={(e) => updateField('ccv', e.target.value)}
                placeholder="es. 8.50 €/mese"
              />
            </div>
          </div>

          {/* Activation Types for Energy */}
          <div>
            <Label>Tipologia Attivazione</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {['switch', 'switch_con_voltura', 'subentro', 'prima_attivazione'].map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={(formData.activationType || []).includes(type)}
                    onCheckedChange={(checked) => handleActivationTypeChange(type, checked === true)}
                  />
                  <Label htmlFor={type} className="text-sm">
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label>Tipo Fornitura *</Label>
              <Select value={formData.migrationType} onValueChange={(value) => updateField('migrationType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="migrazione">Migrazione</SelectItem>
                  <SelectItem value="nuova_utenza">Nuova Utenza</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tecnologia *</Label>
              <Select value={formData.technology} onValueChange={(value) => updateField('technology', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ftth">FTTH</SelectItem>
                  <SelectItem value="fttc">FTTC</SelectItem>
                  <SelectItem value="fwa">FWA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Prezzo *</Label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder="es. 29.90 €/mese"
                required
              />
            </div>
          </div>
        </>
      )}

      {/* Common Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="expiryDate">Data Scadenza *</Label>
          <Input
            id="expiryDate"
            type="date"
            value={toISODateString(formData.expiryDate)}
            onChange={(e) => updateField('expiryDate', e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Frequenza Fatturazione</Label>
          <Select value={formData.billingFrequency} onValueChange={(value) => updateField('billingFrequency', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensile">Mensile</SelectItem>
              <SelectItem value="bimestrale">Bimestrale</SelectItem>
              <SelectItem value="trimestrale">Trimestrale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration">Durata</Label>
          <Input
            id="duration"
            value={formData.duration}
            onChange={(e) => updateField('duration', e.target.value)}
            placeholder="es. 24 mesi"
          />
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <Label>Modalità di Pagamento</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
          {['RID/SEPA', 'Carta di credito', 'Bollettino', 'Bonifico', 'Contanti'].map(method => (
            <div key={method} className="flex items-center space-x-2">
              <Checkbox
                id={method}
                checked={(formData.paymentMethods || []).includes(method)}
                onCheckedChange={(checked) => handlePaymentMethodChange(method, checked === true)}
              />
              <Label htmlFor={method} className="text-sm">{method}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Description Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="description">Descrizione *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            required
          />
        </div>

        <div>
          <Label htmlFor="terms">Condizioni</Label>
          <Textarea
            id="terms"
            value={formData.terms}
            onChange={(e) => updateField('terms', e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="bonuses">Bonus e Vantaggi</Label>
          <Textarea
            id="bonuses"
            value={formData.bonuses}
            onChange={(e) => updateField('bonuses', e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="notes">Note</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Commissione singola in base al customerType */}
      <div>
        <Label>Compenso (€) — {formData.customerType.charAt(0).toUpperCase() + formData.customerType.slice(1)}</Label>
        <Input
          type="number"
          value={
            formData.customerType === 'privato'
              ? formData.commission.privato
              : formData.customerType === 'business'
              ? formData.commission.business
              : formData.commission.condominio
          }
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            if (formData.customerType === 'privato') {
              updateCommission('privato', val);
            } else if (formData.customerType === 'business') {
              updateCommission('business', val);
            } else {
              updateCommission('condominio', val);
            }
          }}
        />
        <p className="text-xs text-gray-500 mt-1">
          Questa offerta è per <strong>{formData.customerType}</strong>: viene richiesto solo questo compenso.
        </p>
      </div>

      {/* Additional Settings */}
      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => updateField('isActive', checked)}
          />
          <Label htmlFor="isActive">Offerta Attiva</Label>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" style={{ backgroundColor: '#E6007E', color: 'white' }}>
            <Save className="h-4 w-4 mr-2" />
            Salva Offerta
          </Button>
        </div>
      </div>
    </form>
  );
}
