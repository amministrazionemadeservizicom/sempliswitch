import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import {
  Zap,
  Flame,
  Phone,
  Sun,
  Eye,
  EyeOff,
  ShoppingCart,
  FileText,
  Euro,
  Download,
  X,
  Plus,
  Building,
  Home,
  User,
  CreditCard,
  Clock,
  AlertCircle
} from "lucide-react";
import * as pricing from "../utils/pricing";

interface Offer {
  id: string;
  name: string;
  brand: string;
  brandLogo?: string;
  serviceType: 'luce' | 'gas' | 'telefonia' | 'fotovoltaico';
  customerType: 'residenziale' | 'business' | 'condominio';
  priceType: 'fisso' | 'variabile';
  price: string;
  expiryDate: string;
  description: string;
  terms: string;
  bonuses: string;
  duration: string;
  contacts: string;
  notes: string;
  pdfUrl?: string;
  activationType?: string[];
  billingFrequency: 'mensile' | 'bimestrale' | 'trimestrale';
  paymentMethods: string[];
  isActive: boolean;
  ccv?: string;
  spread?: number;
  commission: {
    residenziale: number;
    business: number;
    condominio: number;
  };
}


type EnergySupply = "luce" | "gas";

function getBillSimulation(supply: EnergySupply):
  | {
      supplyType: EnergySupply;
      spesaMateriaEnergia: number;
      consumoPeriodo: number;
      periodoDal: string;
      periodoAl: string;
    }
  | null {
  try {
    const raw = localStorage.getItem(`billSimulation_${supply}`);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem("billSimulation"); // compatibilità
    if (legacy) {
      const obj = JSON.parse(legacy);
      if (obj && obj.supplyType === supply) return obj;
    }
    return null;
  } catch {
    return null;
  }
}

const hasAnySimulation = () =>
  !!(localStorage.getItem("billSimulation_luce") ||
     localStorage.getItem("billSimulation_gas")  ||
     localStorage.getItem("billSimulation")); // legacy

const resetSimulations = () => {
  localStorage.removeItem("billSimulation_luce");
  localStorage.removeItem("billSimulation_gas");
  localStorage.removeItem("billSimulation"); // legacy
};

function simulateForOffer(offer: Offer) {
  if (offer.serviceType !== "luce" && offer.serviceType !== "gas") return null;
  const sim = getBillSimulation(offer.serviceType as EnergySupply);
  if (!sim) return null;

  const mesiPeriodo = pricing.monthsBetween(sim.periodoDal, sim.periodoAl);
  const ccvNum = pricing.parseUnitPrice(offer.ccv || 0) || 0;

  const result = pricing.simulateOffer({
    priceType: offer.priceType as "fisso" | "variabile",
    priceString: offer.price,
    spread: offer.spread || 0,
    ccv: ccvNum,
    consumoPeriodo: sim.consumoPeriodo,
    spesaMateriaEnergia: sim.spesaMateriaEnergia,
    mesiPeriodo,
    supplyType: sim.supplyType,
  });

  return { ...result, mesiPeriodo };
}


export default function Offers() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([]);
  const [visibleCommissions, setVisibleCommissions] = useState<Set<string>>(new Set());
  const [detailsOffer, setDetailsOffer] = useState<Offer | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedCompenso, setSelectedCompenso] = useState<number | null>(null);

  // Parse URL parameters from practice form
  const [practiceParams, setPracticeParams] = useState<{
    customerType?: string;
    supplyTypes?: string[];
    activationTypes?: Record<string, string>;
  }>({});

  // Check if user has access (has parameters or is admin)
  const hasParameters = () => {
    return practiceParams.customerType || (practiceParams.supplyTypes && practiceParams.supplyTypes.length > 0);
  };

  // Get offers from Firestore (same structure as AdminOffers)
  const getOffers = async () => {
    try {
      const offersCollection = collection(db, "offers");
      const offersSnapshot = await getDocs(offersCollection);
      const offersData = offersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Map AdminOffer structure to Offer structure
        return {
          id: doc.id,
          name: data.name,
          brand: data.brand,
          brandLogo: data.brandLogo,
          serviceType: data.supplyType || data.serviceType, // Map supplyType to serviceType
          customerType: data.customerType === 'privato' ? 'residenziale' : data.customerType, // Map privato to residenziale
          priceType: data.priceType,
          price: data.price,
          expiryDate: data.expiryDate,
          description: data.description,
          terms: data.terms,
          bonuses: data.bonuses,
          duration: data.duration,
          contacts: data.contacts,
          notes: data.notes,
          pdfUrl: data.pdfUrl,
          ccv: data.ccv,
          spread: data.spread,
          activationType: data.activationType,
          billingFrequency: data.billingFrequency,
          paymentMethods: data.paymentMethods,
          isActive: data.isActive,
          commission: {
            residenziale: data.commission?.privato || 0,
            business: data.commission?.business || 0,
            condominio: data.commission?.condominio || 0
          }
        };
      }) as Offer[];
      return offersData.filter(offer => offer.isActive);
    } catch (error: any) {
      console.error('Error fetching offers from Firestore:', error?.code, error?.message, error);
      throw error;
    }
  };

  // Load offers from Firestore (with mock fallback)
  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const offersData = await getOffers();
        setOffers(offersData);
      } catch (error: any) {
        console.error('Error loading offers:', error?.code, error?.message, error);
        setOffers([]);
        toast({
          title: "Errore",
          description: `Errore nel caricamento: ${error?.code || ''} ${error?.message || ''}. Utilizzando dati locali.`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

  // Parse URL parameters
  useEffect(() => {
    const customerType = searchParams.get('customerType');
    const supplyTypesStr = searchParams.get('supplyTypes');
    const activationTypesStr = searchParams.get('activationTypes');
    
    const supplyTypes = supplyTypesStr ? supplyTypesStr.split(',').filter(Boolean) : [];
    
    let activationTypes: Record<string, string> = {};
    if (activationTypesStr) {
      activationTypesStr.split(',').forEach(pair => {
        const [key, value] = pair.split(':');
        if (key && value) {
          activationTypes[key] = value;
        }
      });
    }

    setPracticeParams({
      customerType: customerType || undefined,
      supplyTypes,
      activationTypes
    });
  }, [searchParams]);

  // Update URL when parameters change
  const updateUrlParams = (newParams: {
    customerType?: string;
    supplyTypes?: string[];
    activationTypes?: Record<string, string>;
  }) => {
    const params = new URLSearchParams();
    
    if (newParams.customerType) {
      params.set('customerType', newParams.customerType);
    }
    
    if (newParams.supplyTypes && newParams.supplyTypes.length > 0) {
      params.set('supplyTypes', newParams.supplyTypes.join(','));
    }
    
    if (newParams.activationTypes && Object.keys(newParams.activationTypes).length > 0) {
      const activationPairs = Object.entries(newParams.activationTypes).map(([key, value]) => `${key}:${value}`);
      params.set('activationTypes', activationPairs.join(','));
    }
    
    setSearchParams(params);
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'luce': return <Zap className="h-6 w-6 text-blue-600" />;
      case 'gas': return <Flame className="h-6 w-6 text-orange-600" />;
      case 'telefonia': return <Phone className="h-6 w-6 text-green-600" />;
      case 'fotovoltaico': return <Sun className="h-6 w-6 text-yellow-600" />;
      default: return <FileText className="h-6 w-6 text-gray-600" />;
    }
  };

  const getCustomerIcon = (type: string) => {
    switch (type) {
      case 'residenziale': return <User className="h-4 w-4" />;
      case 'business': return <Building className="h-4 w-4" />;
      case 'condominio': return <Home className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getServiceBadgeColor = (type: string) => {
    switch (type) {
      case 'luce': return 'bg-blue-100 text-blue-800';
      case 'gas': return 'bg-orange-100 text-orange-800';
      case 'telefonia': return 'bg-green-100 text-green-800';
      case 'fotovoltaico': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const addToCart = (offer: Offer) => {
    if (!selectedOffers.find(o => o.id === offer.id)) {
      setSelectedOffers([...selectedOffers, offer]);
    }
  };

  const removeFromCart = (offerId: string) => {
    setSelectedOffers(selectedOffers.filter(o => o.id !== offerId));
  };

  const toggleCommissionVisibility = (offerId: string) => {
    const newVisible = new Set(visibleCommissions);
    if (newVisible.has(offerId)) {
      newVisible.delete(offerId);
    } else {
      newVisible.add(offerId);
    }
    setVisibleCommissions(newVisible);
  };

  // Remove supply type from filters
  const removeSupplyType = (typeToRemove: string) => {
    const newSupplyTypes = practiceParams.supplyTypes?.filter(type => type !== typeToRemove) || [];
    const newActivationTypes = { ...practiceParams.activationTypes };
    delete newActivationTypes[typeToRemove];
    
    const newParams = {
      customerType: practiceParams.customerType,
      supplyTypes: newSupplyTypes,
      activationTypes: newActivationTypes
    };
    
    setPracticeParams(newParams);
    updateUrlParams(newParams);
  };

  // Filter offers based on practice parameters
  const filteredOffers = offers.filter(offer => {
    // Se non ci sono parametri pratica, mostra tutte le offerte a QUALSIASI ruolo
    if (!hasParameters()) {
      return true;
    }

    // Filter by customer type
    if (practiceParams.customerType) {
      const customerTypeMapping: Record<string, string> = {
        'privato': 'residenziale',
        'business': 'business',
        'condominio': 'condominio'
      };
      const mappedCustomerType = customerTypeMapping[practiceParams.customerType];
      if (offer.customerType !== mappedCustomerType) {
        return false;
      }
    }

    // Filter by supply types
    if (practiceParams.supplyTypes && practiceParams.supplyTypes.length > 0) {
      if (!practiceParams.supplyTypes.includes(offer.serviceType)) {
        return false;
      }
    }

    // Filter by activation types
    if (practiceParams.activationTypes && Object.keys(practiceParams.activationTypes).length > 0) {
      const supplyActivationType = practiceParams.activationTypes[offer.serviceType];
      if (supplyActivationType && (!offer.activationType || !offer.activationType.includes(supplyActivationType))) {
        return false;
      }
    }

    return true;
  });

  const handleEditOffer = async (updatedOffer: Offer) => {
    try {
      // Convert Offer structure to AdminOffer structure for Firestore
      const adminOfferData = {
        name: updatedOffer.name,
        brand: updatedOffer.brand,
        brandLogo: updatedOffer.brandLogo,
        serviceType: updatedOffer.serviceType === 'luce' || updatedOffer.serviceType === 'gas' ? 'energia' : 'telefonia',
        customerType: updatedOffer.customerType === 'residenziale' ? 'privato' : updatedOffer.customerType,
        supplyType: updatedOffer.serviceType,
        priceType: updatedOffer.priceType,
        price: updatedOffer.price,
        expiryDate: updatedOffer.expiryDate,
        description: updatedOffer.description,
        terms: updatedOffer.terms,
        bonuses: updatedOffer.bonuses,
        duration: updatedOffer.duration,
        contacts: updatedOffer.contacts,
        notes: updatedOffer.notes,
        pdfUrl: updatedOffer.pdfUrl,
        activationType: updatedOffer.activationType,
        billingFrequency: updatedOffer.billingFrequency,
        paymentMethods: updatedOffer.paymentMethods,
        isActive: updatedOffer.isActive,
        commission: {
          privato: updatedOffer.commission.residenziale,
          business: updatedOffer.commission.business,
          condominio: updatedOffer.commission.condominio
        }
      };

      const ref = doc(db, "offers", updatedOffer.id);
      await updateDoc(ref, adminOfferData);

      setOffers(offers.map(offer =>
        offer.id === updatedOffer.id ? updatedOffer : offer
      ));
      setEditingOffer(null);
      toast({
        title: "Successo",
        description: "Offerta aggiornata con successo.",
      });
    } catch (error: any) {
      console.error('Error updating offer:', error?.code, error?.message, error);
      toast({
        title: "Errore",
        description: `Errore nell'aggiornamento: ${error?.code || ''} ${error?.message || ''}`,
        variant: "destructive",
      });
    }
  };

  const hasCommissionPlan = (consulentId?: string) => {
    // TODO: Replace with actual check for custom commission plan
    // For now, always return true for demo
    return true;
  };

  const getCustomCommission = (offer: Offer) => {
    // TODO: Replace with actual commission calculation from consultant's plan
    // For now, return the base commission + 10€ for custom plan
    return offer.commission[offer.customerType] + 10;
  };

  // Product dialog handlers
  const handleAddProduct = (newSupplyTypes: string[], newActivationTypes: Record<string, string>) => {
    const updatedParams = {
      customerType: practiceParams.customerType,
      supplyTypes: [...(practiceParams.supplyTypes || []), ...newSupplyTypes],
      activationTypes: { ...practiceParams.activationTypes, ...newActivationTypes }
    };
    
    setPracticeParams(updatedParams);
    updateUrlParams(updatedParams);
    setIsProductDialogOpen(false);
    
    toast({
      title: "Prodotti Aggiunti",
      description: `Aggiunti ${newSupplyTypes.join(', ')} alla selezione`,
    });
  };

  const handleReplaceProduct = (newSupplyTypes: string[], newActivationTypes: Record<string, string>) => {
    const updatedParams = {
      customerType: practiceParams.customerType,
      supplyTypes: newSupplyTypes,
      activationTypes: newActivationTypes
    };
    
    setPracticeParams(updatedParams);
    updateUrlParams(updatedParams);
    setIsProductDialogOpen(false);
    
    toast({
      title: "Prodotti Sostituiti",
      description: `Sostituiti con ${newSupplyTypes.join(', ')}`,
    });
  };

  const CustomCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div
      className={`bg-gray-50 rounded-2xl shadow-sm border border-gray-100 ${className}`}
      style={{
        backgroundColor: '#FAFAFA',
        boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
        borderRadius: '16px'
      }}
    >
      {children}
    </div>
  );

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Offerte Disponibili</h1>
                {hasParameters() ? (
                  <div className="mt-2">
                    <p className="text-gray-600">Filtrate per la tua pratica:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {practiceParams.customerType && (
                        <Badge variant="outline" className="text-sm">
                          Cliente: {practiceParams.customerType === 'privato' ? 'Residenziale' :
                                   practiceParams.customerType === 'business' ? 'Business' : 'Condominio'}
                        </Badge>
                      )}
                      {practiceParams.supplyTypes?.map(type => (
                        <Badge key={type} variant="outline" className="text-sm group cursor-pointer">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                          <X
                            className="h-3 w-3 ml-1 hover:text-red-600"
                            onClick={() => removeSupplyType(type)}
                          />
                        </Badge>
                      ))}
                      {hasAnySimulation() && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                            📊 Simulazione attiva
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => { resetSimulations(); window.location.reload(); }}
                          >
                            Reset
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-gray-600">Tutte le offerte disponibili (Modalità Admin)</p>
                    {hasAnySimulation() && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                          📊 Simulazione attiva
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => { resetSimulations(); window.location.reload(); }}
                        >
                          Reset
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {hasParameters() && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => setIsProductDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi/Sostituisci Prodotto
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Cart Summary */}
          {selectedOffers.length > 0 && (
            <CustomCard className="mb-8">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingCart className="h-5 w-5" style={{ color: '#E6007E' }} />
                  <h3 className="font-semibold">Carrello Contratti ({selectedOffers.length})</h3>
                </div>
                <div className="space-y-2 mb-4">
                  {selectedOffers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between text-sm bg-white p-3 rounded-lg">
                      <div>
                        <span className="font-medium">{offer.name}</span>
                        <span className="text-gray-500 ml-2">- {offer.brand}</span>
                      </div>
                      <button
                        onClick={() => removeFromCart(offer.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  style={{ backgroundColor: '#E6007E', color: 'white' }}
                  onClick={() => {
                    localStorage.setItem("selectedOffers", JSON.stringify(selectedOffers));
                    navigate('/compile-contract');
                  }}
                >
                  Compila Contratto
                </Button>
              </div>
            </CustomCard>
          )}

          {/* Offers List - Vertical Layout */}
          <div className="space-y-6">
            {filteredOffers.length === 0 ? (
              <CustomCard className="text-center p-12">
                <div className="text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nessuna offerta trovata</h3>
                  <p>Non ci sono offerte disponibili per i criteri selezionati.</p>
                  {hasParameters() && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsProductDialogOpen(true)}
                        className="mr-2"
                      >
                        Modifica Criteri
                      </Button>
                      <Button
                        onClick={() => navigate('/new-practice')}
                        style={{ backgroundColor: '#F2C927', color: '#333333' }}
                      >
                        Torna a Nuova Pratica
                      </Button>
                    </div>
                  )}
                </div>
              </CustomCard>
            ) : (
              filteredOffers.map((offer) => (
                <CustomCard key={offer.id}>
                  <div className="p-6">
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        {getServiceIcon(offer.serviceType)}
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{offer.name}</h3>
                          <p className="text-gray-600 font-medium">{offer.brand}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-sm ${getServiceBadgeColor(offer.serviceType)}`}>
                          {offer.serviceType.charAt(0).toUpperCase() + offer.serviceType.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {/* Customer Type */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          {getCustomerIcon(offer.customerType)}
                          <div className="text-sm text-gray-500">Tipo Cliente</div>
                        </div>
                        <div className="font-medium capitalize">{offer.customerType}</div>
                      </div>

                      {/* Price */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="text-sm text-gray-500 mb-2">Prezzo</div>
                        <div className="text-lg font-bold" style={{ color: '#E6007E' }}>
                          {offer.price}
                        </div>
                        <div className="text-xs text-gray-500">({offer.priceType})</div>
                      </div>

                      {/* Billing */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-gray-500">Fatturazione</div>
                        </div>
                        <div className="font-medium capitalize">{offer.billingFrequency}</div>
                      </div>

                      {/* Payment Methods */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-gray-500">Pagamento</div>
                        </div>
                        <div className="text-sm">
                          {offer.paymentMethods.slice(0, 2).join(', ')}
                          {offer.paymentMethods.length > 2 && '...'}
                        </div>
                      </div>

                      {/* CCV */}
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="text-sm text-gray-500 mb-2">CCV</div>
                        <div className="font-medium">{offer.ccv || '—'}</div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <p className="text-gray-700">{offer.description}</p>
                    </div>

                    {/* Simulazione Risparmio */}
                    {(offer.serviceType === "luce" || offer.serviceType === "gas") &&
                      (() => {
                        const sim = simulateForOffer(offer);
                        if (!sim) return null;
                        const diffPositiva = sim.risparmioPeriodo >= 0;
                        const ccvNum = pricing.parseUnitPrice(offer.ccv || 0) || 0;
                        return (
                          <div className="mb-6 bg-white p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold">📊 Simulazione Risparmio</div>
                              <div className="text-right">
                                <div className="text-xs font-semibold mb-1">
                                  {diffPositiva ? "Risparmio annuo di" : "Spesa superiore di"}
                                </div>
                                <div className="inline-block relative">
                                  <div
                                    className="inline-block transform -skew-x-6 px-4 py-2 shadow-md"
                                    style={{ backgroundColor: diffPositiva ? "#F2C927" : "#DC2626" }}
                                  >
                                    <span className="text-white font-extrabold text-2xl skew-x-6 inline-block">
                                      € {pricing.fmt(Math.abs(sim.risparmioAnnuo))}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="h-8 px-3 rounded-xl">
                                        Scopri come
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="max-w-md text-sm">
                                      <div className="space-y-2">
                                        <div className="font-semibold">Come calcoliamo questa stima</div>
                                        <div>
                                          <div>1) <span className="font-medium">Prezzo energia considerato</span>:</div>
                                          <div>
                                            {pricing.fmt(sim.prezzoEnergia)} €/{offer.serviceType === "luce" ? "kWh" : "Smc"}
                                          </div>
                                        </div>
                                        <div>
                                          <div>2) <span className="font-medium">Costo energia nel periodo</span>:</div>
                                          <div>
                                            {pricing.fmt(sim.prezzoEnergia)} × {pricing.fmt(getBillSimulation(offer.serviceType as EnergySupply)?.consumoPeriodo || 0)} {offer.serviceType === "luce" ? "kWh" : "Smc"}
                                            {" = "}
                                            € {pricing.fmt(sim.prezzoEnergia * (getBillSimulation(offer.serviceType as EnergySupply)?.consumoPeriodo || 0))}
                                          </div>
                                        </div>
                                        <div>
                                          <div>3) <span className="font-medium">Costi fissi</span> (CCV):</div>
                                          <div>
                                            € {pricing.fmt(ccvNum)} × {sim.mesiPeriodo} mesi {" = "} € {pricing.fmt(ccvNum * sim.mesiPeriodo)}
                                          </div>
                                        </div>
                                        <div>
                                          <div>4) <span className="font-medium">Spesa offerta nel periodo</span>:</div>
                                          <div>
                                            € {pricing.fmt(sim.spesaOffertaPeriodo)}
                                          </div>
                                        </div>
                                        <div>
                                          <div>5) <span className="font-medium">Confronto con la tua bolletta</span>:</div>
                                          <div>
                                            € {pricing.fmt(getBillSimulation(offer.serviceType as EnergySupply)?.spesaMateriaEnergia || 0)} − € {pricing.fmt(sim.spesaOffertaPeriodo)} {" = "}
                                            {" "}
                                            {sim.risparmioPeriodo >= 0 ? (
                                              <span>risparmio di �� {pricing.fmt(sim.risparmioPeriodo)}</span>
                                            ) : (
                                              <span>spesa superiore di € {pricing.fmt(Math.abs(sim.risparmioPeriodo))}</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          La <span className="font-medium">proiezione annua</span> applica IVA 10% al risparmio medio mensile e moltiplica × 12:
                                          {" "}
                                          {sim.risparmioAnnuo >= 0 ? (
                                            <span>€ {pricing.fmt(sim.risparmioAnnuo)}</span>
                                          ) : (
                                            <span>spesa superiore annua € {pricing.fmt(Math.abs(sim.risparmioAnnuo))}</span>
                                          )}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                              <div>
                                <div className="text-gray-500">Prezzo energia</div>
                                <div className="font-medium">
                                  {pricing.fmt(sim.prezzoEnergia)} €/{offer.serviceType === "luce" ? "kWh" : "Smc"}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Spesa stimata periodo</div>
                                <div className="font-medium">€ {pricing.fmt(sim.spesaOffertaPeriodo)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Differenza periodo</div>
                                <div className={`font-bold ${diffPositiva ? "text-green-700" : "text-red-700"}`}>
                                  {diffPositiva ? "Risparmio" : "Spesa superiore"} € {pricing.fmt(Math.abs(sim.risparmioPeriodo))}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Proiezione annua</div>
                                <div className={`font-bold ${sim.risparmioAnnuo >= 0 ? "text-green-700" : "text-red-700"}`}>
                                  {sim.risparmioAnnuo >= 0
                                    ? `€ ${pricing.fmt(sim.risparmioAnnuo)}`
                                    : `Spesa superiore annua € ${pricing.fmt(Math.abs(sim.risparmioAnnuo))}`
                                  }
                                </div>
                              </div>
                            </div>
                            {/* Nota calcolo */}
                            <div className="mt-3 text-xs text-gray-500">
                              * Stima basata sui dati della tua bolletta
                            </div>
                          </div>
                        );
                      })()
                    }

                    {/* Commission Quick View (Consultant/Master only) - Keep existing for backwards compatibility */}
                    {hasCommissionPlan() && (
                      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-lg border">
                        <span className="text-sm font-medium">💰 Compenso base:</span>
                        <div className="flex items-center gap-2 text-sm">
                          {visibleCommissions.has(offer.id) ? (
                            <>
                              <div className="flex items-center space-x-2">
                                <span className="text-xl font-bold" style={{ color: '#E6007E' }}>
                                  €{offer.commission[offer.customerType]}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCompenso(offer.commission[offer.customerType]);
                                  }}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Vedi dettaglio compenso"
                                >
                                  👁
                                </button>
                              </div>
                              <button
                                onClick={() => toggleCommissionVisibility(offer.id)}
                                className="flex items-center gap-1 hover:text-gray-900"
                                title="Nascondi compenso"
                              >
                                <EyeOff className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="blur-sm text-lg font-bold">€•••</span>
                              <button
                                onClick={() => toggleCommissionVisibility(offer.id)}
                                className="flex items-center gap-1 hover:text-gray-900"
                                title="Mostra compenso"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={`grid gap-3 ${
                      (userRole === "consulente" || userRole === "master") && hasCommissionPlan()
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                        : "grid-cols-1 sm:grid-cols-3"
                    }`}>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 justify-center"
                        onClick={() => setDetailsOffer(offer)}
                      >
                        <Eye className="h-4 w-4" />
                        👁️ Dettagli Offerta
                      </Button>

                      {offer.pdfUrl && (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 justify-center"
                          onClick={() => {
                            // TODO: Implement PDF download
                            toast({
                              title: "PDF Offerta",
                              description: "Download del PDF dell'offerta.",
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                          📄 PDF Offerta
                        </Button>
                      )}

                      {/* Visualizza Compenso Button (Consultant/Master only) */}
                      {hasCommissionPlan() && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex items-center gap-2 justify-center"
                              style={{ borderColor: '#E6007E', color: '#E6007E' }}
                            >
                              <Eye className="h-4 w-4" />
                              👁️ Visualizza Compenso
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Euro className="h-5 w-5" style={{ color: '#E6007E' }} />
                                <span className="font-semibold text-lg" style={{ color: '#E6007E' }}>
                                  💰 Compenso previsto: {getCustomCommission(offer).toFixed(2)} €
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FileText className="h-4 w-4" />
                                <span>🔗 Offerta: {offer.name} - {offer.brand}</span>
                              </div>
                              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                ✅ Compenso personalizzato del piano {userRole}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      <Button
                        className="flex items-center gap-2 justify-center"
                        style={{ backgroundColor: '#F2C927', color: '#333333' }}
                        onClick={() => addToCart(offer)}
                        disabled={selectedOffers.some(o => o.id === offer.id)}
                      >
                        {selectedOffers.some(o => o.id === offer.id) ? (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            Aggiunta
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            📥 Scegli questa
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CustomCard>
              ))
            )}
          </div>

          {/* Add/Replace Product Dialog */}
          <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Aggiungi/Sostituisci Prodotto</DialogTitle>
                <DialogDescription>
                  Modifica le tipologie di fornitura per questa selezione
                </DialogDescription>
              </DialogHeader>
              
              <ProductSelectionDialog
                currentSupplyTypes={practiceParams.supplyTypes || []}
                currentActivationTypes={practiceParams.activationTypes || {}}
                onAddProduct={handleAddProduct}
                onReplaceProduct={handleReplaceProduct}
                onCancel={() => setIsProductDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Details Modal */}
          <Dialog open={!!detailsOffer} onOpenChange={() => setDetailsOffer(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                  
                  <div className="space-y-6">
                    {/* Price */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold" style={{ color: '#E6007E' }}>
                        {detailsOffer.price}
                      </div>
                      <div className="text-sm text-gray-600">
                        Prezzo {detailsOffer.priceType} - {detailsOffer.customerType}
                      </div>
                      <div className="text-sm text-gray-600">
                        CCV: <span className="font-medium">{detailsOffer.ccv || '—'}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Condizioni</h4>
                        <p className="text-sm text-gray-600">{detailsOffer.terms}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Bonus e Vantaggi</h4>
                        <p className="text-sm text-gray-600">{detailsOffer.bonuses}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Durata</h4>
                        <p className="text-sm text-gray-600">{detailsOffer.duration}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Contatti</h4>
                        <p className="text-sm text-gray-600">{detailsOffer.contacts}</p>
                      </div>
                    </div>

                    {/* Notes */}
                    {detailsOffer.notes && (
                      <div>
                        <h4 className="font-semibold mb-2">Note Importanti</h4>
                        <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          {detailsOffer.notes}
                        </p>
                      </div>
                    )}

                    {/* Commission for all roles */}
                    {true && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Compenso per questa offerta</h4>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="mt-2 flex items-center justify-center space-x-2">
                            <span className="text-lg font-bold" style={{ color: '#E6007E' }}>
                              €{detailsOffer.commission[detailsOffer.customerType]}
                            </span>
                            <button
                              onClick={() => setSelectedCompenso(detailsOffer.commission[detailsOffer.customerType])}
                              className="text-gray-500 hover:text-gray-700"
                              title="Vedi dettaglio compenso"
                            >
                              👁
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 capitalize">
                            Tipo cliente: {detailsOffer.customerType}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDetailsOffer(null)}
                      >
                        Chiudi
                      </Button>
                      <Button
                        className="flex-1"
                        style={{ backgroundColor: '#F2C927', color: '#333333' }}
                        onClick={() => {
                          addToCart(detailsOffer);
                          setDetailsOffer(null);
                        }}
                        disabled={selectedOffers.some(o => o.id === detailsOffer.id)}
                      >
                        {selectedOffers.some(o => o.id === detailsOffer.id) ? (
                          "Già nel Carrello"
                        ) : (
                          "Aggiungi al Carrello"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {selectedCompenso !== null && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Dettaglio Compenso</h2>
                <p className="text-lg">
                  Il compenso previsto per questa offerta è di:
                  <span className="font-semibold"> € {pricing.fmt(selectedCompenso)}</span>
                </p>
                <div className="mt-6 text-right">
                  <button
                    onClick={() => setSelectedCompenso(null)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}

// Product Selection Dialog Component
function ProductSelectionDialog({
  currentSupplyTypes,
  currentActivationTypes,
  onAddProduct,
  onReplaceProduct,
  onCancel
}: {
  currentSupplyTypes: string[];
  currentActivationTypes: Record<string, string>;
  onAddProduct: (supplyTypes: string[], activationTypes: Record<string, string>) => void;
  onReplaceProduct: (supplyTypes: string[], activationTypes: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [selectedTab, setSelectedTab] = useState<'add' | 'replace'>('add');
  const [selectedSupplyTypes, setSelectedSupplyTypes] = useState<string[]>([]);
  const [selectedActivationTypes, setSelectedActivationTypes] = useState<Record<string, string>>({});

  const availableSupplyTypes = ['luce', 'gas', 'telefonia', 'fotovoltaico'];
  const availableActivationTypes = {
    luce: ['switch', 'subentro', 'prima_attivazione', 'switch_con_voltura'],
    gas: ['switch', 'subentro', 'prima_attivazione', 'switch_con_voltura'],
    telefonia: ['migrazione', 'nuova_utenza'],
    fotovoltaico: ['prima_attivazione']
  };

  const availableForAdd = availableSupplyTypes.filter(type => !currentSupplyTypes.includes(type));

  const handleSupplyTypeToggle = (type: string) => {
    if (selectedSupplyTypes.includes(type)) {
      setSelectedSupplyTypes(prev => prev.filter(t => t !== type));
      setSelectedActivationTypes(prev => {
        const newTypes = { ...prev };
        delete newTypes[type];
        return newTypes;
      });
    } else {
      setSelectedSupplyTypes(prev => [...prev, type]);
    }
  };

  const handleActivationTypeSelect = (supplyType: string, activationType: string) => {
    setSelectedActivationTypes(prev => ({
      ...prev,
      [supplyType]: activationType
    }));
  };

  const canProceed = selectedSupplyTypes.length > 0 && 
    selectedSupplyTypes.every(type => selectedActivationTypes[type]);

  return (
    <div className="space-y-6">
      <Tabs value={selectedTab} onValueChange={(value: string) => setSelectedTab(value as 'add' | 'replace')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Aggiungi</TabsTrigger>
          <TabsTrigger value="replace">Sostituisci</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add" className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Aggiungi Nuove Forniture</h4>
            <p className="text-sm text-gray-600 mb-4">
              Seleziona le forniture da aggiungere a quelle già presenti ({currentSupplyTypes.join(', ')})
            </p>
            
            {availableForAdd.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Tutte le forniture sono già selezionate</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableForAdd.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`add-${type}`}
                      checked={selectedSupplyTypes.includes(type)}
                      onCheckedChange={() => handleSupplyTypeToggle(type)}
                    />
                    <Label htmlFor={`add-${type}`} className="capitalize">{type}</Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="replace" className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Sostituisci Forniture</h4>
            <p className="text-sm text-gray-600 mb-4">
              Seleziona le nuove forniture che sostituiranno quelle attuali
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {availableSupplyTypes.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`replace-${type}`}
                    checked={selectedSupplyTypes.includes(type)}
                    onCheckedChange={() => handleSupplyTypeToggle(type)}
                  />
                  <Label htmlFor={`replace-${type}`} className="capitalize">{type}</Label>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Activation Types Selection */}
      {selectedSupplyTypes.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">Seleziona Tipologie di Attivazione</h4>
          <div className="space-y-4">
            {selectedSupplyTypes.map(supplyType => (
              <div key={supplyType} className="border rounded-lg p-4">
                <h5 className="font-medium mb-2 capitalize">{supplyType}</h5>
                <div className="grid grid-cols-2 gap-2">
                  {availableActivationTypes[supplyType as keyof typeof availableActivationTypes]?.map(activationType => (
                    <div key={activationType} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${supplyType}-${activationType}`}
                        name={`activation-${supplyType}`}
                        checked={selectedActivationTypes[supplyType] === activationType}
                        onChange={() => handleActivationTypeSelect(supplyType, activationType)}
                      />
                      <Label htmlFor={`${supplyType}-${activationType}`} className="text-sm">
                        {activationType.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        
        <Button
          onClick={() => {
            if (selectedTab === 'add') {
              onAddProduct(selectedSupplyTypes, selectedActivationTypes);
            } else {
              onReplaceProduct(selectedSupplyTypes, selectedActivationTypes);
            }
          }}
          disabled={!canProceed}
          style={{ backgroundColor: '#F2C927', color: '#333333' }}
        >
          {selectedTab === 'add' ? 'Aggiungi Prodotti' : 'Sostituisci Prodotti'}
        </Button>
      </div>
    </div>
  );
}

// Edit Offer Form Component (unchanged from original)
function EditOfferForm({
  offer,
  onSave,
  onCancel
}: {
  offer: Offer;
  onSave: (offer: Offer) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Offer>(offer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: keyof Offer, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateCommission = (type: keyof Offer['commission'], value: number) => {
    setFormData(prev => ({
      ...prev,
      commission: { ...prev.commission, [type]: value }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome Offerta</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="brand">Gestore</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => updateField('brand', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="price">Prezzo</Label>
            <Input
              id="price"
              value={formData.price}
              onChange={(e) => updateField('price', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="serviceType">Tipologia</Label>
            <Select value={formData.serviceType} onValueChange={(value) => updateField('serviceType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="luce">Luce</SelectItem>
                <SelectItem value="gas">Gas</SelectItem>
                <SelectItem value="telefonia">Telefonia</SelectItem>
                <SelectItem value="fotovoltaico">Fotovoltaico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="customerType">Tipo Cliente</Label>
            <Select value={formData.customerType} onValueChange={(value) => updateField('customerType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residenziale">Residenziale</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="condominio">Condominio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priceType">Tipo Prezzo</Label>
            <Select value={formData.priceType} onValueChange={(value) => updateField('priceType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisso">Fisso</SelectItem>
                <SelectItem value="variabile">Variabile</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="expiryDate">Data Scadenza</Label>
            <Input
              id="expiryDate"
              value={formData.expiryDate}
              onChange={(e) => updateField('expiryDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              required
            />
          </div>

          <div>
            <Label htmlFor="billingFrequency">Frequenza Fatturazione</Label>
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
            />
          </div>

          <div>
            <Label htmlFor="pdfUrl">URL PDF Allegato</Label>
            <Input
              id="pdfUrl"
              value={formData.pdfUrl || ''}
              onChange={(e) => updateField('pdfUrl', e.target.value)}
              placeholder="/path/to/offer.pdf"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isActive">Offerta Attiva</Label>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Descrizione</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Payment Methods */}
      <div>
        <Label htmlFor="paymentMethods">Modalità di Pagamento (separati da virgola)</Label>
        <Input
          id="paymentMethods"
          value={formData.paymentMethods.join(', ')}
          onChange={(e) => updateField('paymentMethods', e.target.value.split(',').map(m => m.trim()).filter(Boolean))}
          placeholder="RID/SEPA, Carta di credito, Bollettino"
        />
      </div>

      {/* Commission */}
      <div>
        <Label>Compensi per Tipologia Cliente</Label>
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div>
            <Label htmlFor="commissionRes">Residenziale (€)</Label>
            <Input
              id="commissionRes"
              type="number"
              value={formData.commission.residenziale}
              onChange={(e) => updateCommission('residenziale', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="commissionBus">Business (€)</Label>
            <Input
              id="commissionBus"
              type="number"
              value={formData.commission.business}
              onChange={(e) => updateCommission('business', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="commissionCond">Condominio (€)</Label>
            <Input
              id="commissionCond"
              type="number"
              value={formData.commission.condominio}
              onChange={(e) => updateCommission('condominio', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Additional Fields */}
      <div className="space-y-4">
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

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annulla
        </Button>
        <Button type="submit" className="flex-1" style={{ backgroundColor: '#E6007E', color: 'white' }}>
          Salva Modifiche
        </Button>
      </div>
    </form>
  );
}
