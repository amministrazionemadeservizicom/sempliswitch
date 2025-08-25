import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";

// Type definitions for proper TypeScript support
type TipoLinea = 'Nuova linea' | 'Linea esistente';
type Tecnologia = 'FTTH' | 'FTTC' | 'FWA';
type TipoOfferta = 'Luce' | 'Gas' | 'Telefonia' | 'Fotovoltaico';
type TipoCliente = 'Residenziale' | 'Business';
type TipoUtenza = 'Luce' | 'Gas' | 'Dual';
type MetodoPagamentoTipo = 'Bollettino' | 'IBAN';
type CustomerType = 'privato' | 'business' | 'condominio';
type ActivationType = 'switch' | 'subentro' | 'prima_attivazione' | 'switch_con_voltura' | 'migrazione' | 'nuova_utenza';

import {
  ArrowLeft,
  ArrowRight,
  Send,
  X,
  Zap,
  Fuel,
  Phone,
  Upload,
  FileText,
  User,
  MapPin,
  CreditCard,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Building,
  Home,
  RotateCcw,
  Plug,
  Users,
  Sun
} from "lucide-react";

// Import offers data (in real app, this would be an API call)
interface OfferData {
  id: string;
  name: string;
  brand: string;
  serviceType: 'luce' | 'gas' | 'telefonia' | 'fotovoltaico';
  customerType: 'residenziale' | 'business' | 'condominio';
  priceType: 'fisso' | 'variabile';
  price: string;
  expiryDate: string;
  description: string;
  activationType?: string[];
  commission: {
    residenziale: number;
    business: number;
    condominio: number;
  };
}

const AVAILABLE_OFFERS: OfferData[] = [
  {
    id: "1",
    name: "Acea Next48 Luce",
    brand: "Acea Energia",
    serviceType: "luce",
    customerType: "residenziale",
    priceType: "fisso",
    price: "0.08 €/kWh",
    expiryDate: "31/03/2024",
    description: "Offerta luce a prezzo fisso per 24 mesi con energia 100% verde",
    activationType: ["switch", "subentro", "prima_attivazione"],
    commission: { residenziale: 45, business: 65, condominio: 85 }
  },
  {
    id: "2",
    name: "Eni Gas Premium",
    brand: "Eni",
    serviceType: "gas",
    customerType: "residenziale",
    priceType: "variabile",
    price: "0.75 €/Smc",
    expiryDate: "15/04/2024",
    description: "Offerta gas variabile con app mobile inclusa",
    activationType: ["switch", "subentro"],
    commission: { residenziale: 35, business: 55, condominio: 75 }
  },
  {
    id: "3",
    name: "TIM Super Fibra",
    brand: "TIM",
    serviceType: "telefonia",
    customerType: "residenziale",
    priceType: "fisso",
    price: "29.90 €/mese",
    expiryDate: "28/02/2024",
    description: "Fibra ultraveloce fino a 1 Gbit/s con chiamate illimitate",
    activationType: ["migrazione", "nuova_utenza"],
    commission: { residenziale: 80, business: 120, condominio: 150 }
  },
  {
    id: "4",
    name: "Edison Easy Luce Business",
    brand: "Edison",
    serviceType: "luce",
    customerType: "business",
    priceType: "fisso",
    price: "0.085 €/kWh",
    expiryDate: "20/03/2024",
    description: "Offerta dedicata alle aziende con gestione online",
    activationType: ["switch", "prima_attivazione"],
    commission: { residenziale: 40, business: 60, condominio: 90 }
  },
  {
    id: "5",
    name: "Fastweb Casa Business",
    brand: "Fastweb",
    serviceType: "telefonia",
    customerType: "business",
    priceType: "fisso",
    price: "35.95 €/mese",
    expiryDate: "31/05/2024",
    description: "Internet ultraveloce per piccole aziende",
    activationType: ["migrazione", "nuova_utenza"],
    commission: { residenziale: 70, business: 110, condominio: 140 }
  },
  {
    id: "6",
    name: "Enel Energia Verde Plus",
    brand: "Enel",
    serviceType: "luce",
    customerType: "residenziale",
    priceType: "fisso",
    price: "0.075 €/kWh",
    expiryDate: "30/04/2024",
    description: "100% energia rinnovabile a prezzo bloccato",
    activationType: ["switch", "subentro", "prima_attivazione", "switch_con_voltura"],
    commission: { residenziale: 50, business: 70, condominio: 90 }
  },
  {
    id: "7",
    name: "Sorgenia Gas Casa",
    brand: "Sorgenia",
    serviceType: "gas",
    customerType: "residenziale",
    priceType: "fisso",
    price: "0.72 €/Smc",
    expiryDate: "25/03/2024",
    description: "Gas naturale con app di gestione inclusa",
    activationType: ["switch", "subentro"],
    commission: { residenziale: 40, business: 60, condominio: 80 }
  },
  {
    id: "8",
    name: "Vodafone Fibra Business",
    brand: "Vodafone",
    serviceType: "telefonia",
    customerType: "business",
    priceType: "fisso",
    price: "45.90 €/mese",
    expiryDate: "15/05/2024",
    description: "Connettività business con SLA garantito",
    activationType: ["migrazione", "nuova_utenza"],
    commission: { residenziale: 90, business: 130, condominio: 160 }
  }
];

interface SelectedOffer {
  id: string;
  nome: string;
  tipo: TipoOfferta;
  prezzo: string;
  gestore: string;
  tipoCliente: TipoCliente;
}

interface ClienteData {
  cognome: string;
  nome: string;
  codiceFiscale: string;
  ragioneSociale?: string;
  partitaIva?: string;
  cellulare: string;
  email: string;
  indirizzoResidenza: {
    via: string;
    citta: string;
    provincia: string;
  };
  indirizzoFornitura?: {
    via: string;
    citta: string;
    provincia: string;
  };
  isBusiness: boolean;
}

interface DocumentoIdentita {
  file?: File;
  numeroDocumento: string;
  luogoRilascio: string;
  dataRilascio: string;
  dataScadenza: string;
}

interface AllegatoOfferta {
  offertaId: string;
  tipo: TipoOfferta;

  // Per Luce/Gas
  fatturaFile?: File;
  pod?: string;
  pdr?: string;
  tipoUtenza?: TipoUtenza;
  consumoAnnuo?: string;

  // Per Telefonia
  tipoLinea?: TipoLinea;
  tecnologia?: Tecnologia;
  modemIncluso?: boolean;
  nomeOfferta?: string;
  numeriDaPortare?: string[];
  codiceMigrazione?: string;
}

interface MetodoPagamento {
  tipo: MetodoPagamentoTipo;
  iban?: string;
}

interface WizardData {
  customerType: CustomerType | null;
  supplyTypes: TipoOfferta[];
  activationTypes: { [key in TipoOfferta]?: ActivationType };
}

const CUSTOMER_TYPES = [
  { id: 'privato' as const, label: 'Privato', icon: User, description: 'Cliente privato/domestico' },
  { id: 'business' as const, label: 'Business', icon: Building, description: 'Azienda o partita IVA' },
  { id: 'condominio' as const, label: 'Condominio', icon: Home, description: 'Amministrazione condominiale' }
];

const SUPPLY_TYPES = [
  { id: 'Luce' as const, label: 'Luce', icon: Zap, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'Gas' as const, label: 'Gas', icon: Fuel, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { id: 'Telefonia' as const, label: 'Telefonia', icon: Phone, color: 'text-green-600', bgColor: 'bg-green-100' },
  { id: 'Fotovoltaico' as const, label: 'Fotovoltaico', icon: Sun, color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
];

const ACTIVATION_TYPES = {
  standard: [
    { id: 'switch', label: 'Switch', icon: RotateCcw, description: 'Cambio fornitore' },
    { id: 'subentro', label: 'Subentro', icon: Plug, description: 'Subentro in utenza esistente' },
    { id: 'prima_attivazione', label: 'Prima Attivazione', icon: Plus, description: 'Nuova attivazione' },
    { id: 'switch_con_voltura', label: 'Switch con Voltura', icon: Users, description: 'Cambio fornitore e intestatario' }
  ],
  telefonia: [
    { id: 'migrazione', label: 'Migrazione', icon: RotateCcw, description: 'Portabilità numero' },
    { id: 'nuova_utenza', label: 'Nuova Utenza', icon: Plus, description: 'Nuovo numero' }
  ]
};

export default function NewPractice() {
  const navigate = useNavigate();
  const { user: currentUser, userRole } = useAuth();
  const { toast } = useToast();
  
  // File upload refs
  const documentoRef = useRef<HTMLInputElement>(null);
  const fatturaRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    customerType: null,
    supplyTypes: [],
    activationTypes: {}
  });

  // Form state management
  const [selectedOffers, setSelectedOffers] = useState<SelectedOffer[]>([]);
  const [availableOffers, setAvailableOffers] = useState<SelectedOffer[]>([]);
  
  const [clienteData, setClienteData] = useState<ClienteData>({
    cognome: '',
    nome: '',
    codiceFiscale: '',
    ragioneSociale: '',
    partitaIva: '',
    cellulare: '',
    email: '',
    indirizzoResidenza: {
      via: '',
      citta: '',
      provincia: ''
    },
    indirizzoFornitura: undefined,
    isBusiness: false
  });

  const [documentoIdentita, setDocumentoIdentita] = useState<DocumentoIdentita>({
    numeroDocumento: '',
    luogoRilascio: '',
    dataRilascio: '',
    dataScadenza: ''
  });

  const [allegatiOfferte, setAllegatiOfferte] = useState<AllegatoOfferta[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>({
    tipo: 'IBAN'
  });

  const [indirizzoFornituraDiverso, setIndirizzoFornituraDiverso] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize allegati when offers are selected
  useEffect(() => {
    if (selectedOffers.length > 0 && allegatiOfferte.length === 0) {
      const newAllegati = selectedOffers.map(offer => ({
        offertaId: offer.id,
        tipo: offer.tipo,
        ...(offer.tipo === 'Telefonia' ? {
          tipoLinea: 'Nuova linea' as TipoLinea,
          tecnologia: 'FTTH' as Tecnologia,
          modemIncluso: false,
          nomeOfferta: offer.nome,
          numeriDaPortare: []
        } : {})
      }));
      setAllegatiOfferte(newAllegati);
    }
  }, [selectedOffers]);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;
  const isWizardComplete = currentStep > totalSteps;

  // Reload offers when wizard selections change after completion
  useEffect(() => {
    if (isWizardComplete && canCompleteWizard && selectedOffers.length === 0) {
      loadFilteredOffers();
    }
  }, [wizardData, isWizardComplete]);

  // Wizard handlers
  const handleCustomerTypeSelect = (type: CustomerType) => {
    setWizardData(prev => ({ ...prev, customerType: type }));
    // Auto-set business flag in client data
    setClienteData(prev => ({ ...prev, isBusiness: type === 'business' }));
  };

  const handleSupplyTypeToggle = (type: TipoOfferta) => {
    setWizardData(prev => {
      const newSupplyTypes = prev.supplyTypes.includes(type)
        ? prev.supplyTypes.filter(t => t !== type)
        : [...prev.supplyTypes, type];
      
      // Reset activation types when supply types change
      const newActivationTypes = { ...prev.activationTypes };
      if (!newSupplyTypes.includes(type)) {
        delete newActivationTypes[type];
      }
      
      return {
        ...prev,
        supplyTypes: newSupplyTypes,
        activationTypes: newActivationTypes
      };
    });
  };

  const handleActivationTypeSelect = (supplyType: TipoOfferta, activationType: ActivationType) => {
    setWizardData(prev => ({
      ...prev,
      activationTypes: {
        ...prev.activationTypes,
        [supplyType]: activationType
      }
    }));
  };

  const canProceedToStep2 = wizardData.customerType !== null;
  const canProceedToStep3 = wizardData.supplyTypes.length > 0;
  const canCompleteWizard = wizardData.supplyTypes.every(type =>
    wizardData.activationTypes[type] !== undefined
  );

  // Function to load and filter offers based on wizard selections
  const loadFilteredOffers = () => {
    const customerTypeMapping = {
      'privato': 'residenziale',
      'business': 'business',
      'condominio': 'condominio'
    } as const;

    const filteredOffers: SelectedOffer[] = [];

    // Filter offers for each selected supply type
    wizardData.supplyTypes.forEach(supplyType => {
      const activationType = wizardData.activationTypes[supplyType];
      const customerType = customerTypeMapping[wizardData.customerType as keyof typeof customerTypeMapping];

      // Find matching offers from available offers
      const matchingOffers = AVAILABLE_OFFERS.filter(offer => {
        // Match service type (convert to lowercase for comparison)
        const serviceTypeMatch = offer.serviceType.toLowerCase() === supplyType.toLowerCase();

        // Match customer type
        const customerTypeMatch = offer.customerType === customerType;

        // Match activation type
        const activationTypeMatch = activationType && offer.activationType?.includes(activationType);

        return serviceTypeMatch && customerTypeMatch && activationTypeMatch;
      });

      // Convert to SelectedOffer format
      matchingOffers.forEach(offer => {
        filteredOffers.push({
          id: offer.id,
          nome: offer.name,
          tipo: supplyType,
          prezzo: offer.price,
          gestore: offer.brand,
          tipoCliente: customerType === 'residenziale' ? 'Residenziale' : customerType === 'business' ? 'Business' : 'Residenziale'
        });
      });
    });

    setAvailableOffers(filteredOffers);
    console.log('🎯 Offerte filtrate caricate:', filteredOffers);

    toast({
      title: "Offerte Caricate",
      description: `Trovate ${filteredOffers.length} offerte corrispondenti ai tuoi criteri`,
    });
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === totalSteps && canCompleteWizard) {
      // Navigate to offers page with parameters
      const params = new URLSearchParams();

      if (wizardData.customerType) {
        params.set('customerType', wizardData.customerType);
      }

      if (wizardData.supplyTypes && wizardData.supplyTypes.length > 0) {
        params.set('supplyTypes', wizardData.supplyTypes.map(type => type.toLowerCase()).join(','));
      }

      if (wizardData.activationTypes && Object.keys(wizardData.activationTypes).length > 0) {
        const activationPairs = Object.entries(wizardData.activationTypes).map(([supplyType, activationType]) =>
          `${supplyType.toLowerCase()}:${activationType}`
        );
        params.set('activationTypes', activationPairs.join(','));
      }

      navigate(`/wizard/bill-check?${params.toString()}`);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getOfferIcon = (tipo: string) => {
    switch (tipo) {
      case 'Luce': return <Zap className="h-5 w-5 text-blue-600" />;
      case 'Gas': return <Fuel className="h-5 w-5 text-orange-600" />;
      case 'Telefonia': return <Phone className="h-5 w-5 text-green-600" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const removeOffer = (offerId: string) => {
    setSelectedOffers(offers => offers.filter(o => o.id !== offerId));
    setAllegatiOfferte(allegati => allegati.filter(a => a.offertaId !== offerId));
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocumentoIdentita(prev => ({ ...prev, file }));
      
      // Simulate OCR processing
      setTimeout(() => {
        setDocumentoIdentita(prev => ({
          ...prev,
          numeroDocumento: 'AB1234567',
          luogoRilascio: 'Milano',
          dataRilascio: '2020-01-15',
          dataScadenza: '2030-01-15'
        }));
        
        toast({
          title: "OCR Completato",
          description: "I dati del documento sono stati estratti automaticamente",
        });
      }, 1500);
    }
  };

  const handleFatturaUpload = (event: React.ChangeEvent<HTMLInputElement>, offertaId: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setAllegatiOfferte(prev => prev.map(allegato => 
        allegato.offertaId === offertaId 
          ? { ...allegato, fatturaFile: file }
          : allegato
      ));
      
      // Simulate OCR processing for energy bills
      setTimeout(() => {
        const offer = selectedOffers.find(o => o.id === offertaId);
        if (offer?.tipo === 'Luce' || offer?.tipo === 'Gas') {
          setAllegatiOfferte(prev => prev.map(allegato => 
            allegato.offertaId === offertaId 
              ? { 
                  ...allegato,
                  pod: offer.tipo === 'Luce' ? 'IT001E12345678' : undefined,
                  pdr: offer.tipo === 'Gas' ? 'IT001G87654321' : undefined,
                  tipoUtenza: offer.tipo as TipoUtenza,
                  consumoAnnuo: '2500'
                }
              : allegato
          ));
          
          toast({
            title: "OCR Fattura Completato",
            description: `Dati ${offer.tipo} estratti automaticamente dalla fattura`,
          });
        }
      }, 1500);
    }
  };

  const updateAllegatoOfferta = (offertaId: string, updates: Partial<AllegatoOfferta>) => {
    setAllegatiOfferte(prev => prev.map(allegato => 
      allegato.offertaId === offertaId 
        ? { ...allegato, ...updates }
        : allegato
    ));
  };

  const addNumeroTelefono = (offertaId: string, numero: string) => {
    if (numero.trim()) {
      updateAllegatoOfferta(offertaId, {
        numeriDaPortare: [
          ...(allegatiOfferte.find(a => a.offertaId === offertaId)?.numeriDaPortare || []),
          numero.trim()
        ]
      });
    }
  };

  const removeNumeroTelefono = (offertaId: string, index: number) => {
    const allegato = allegatiOfferte.find(a => a.offertaId === offertaId);
    if (allegato?.numeriDaPortare) {
      updateAllegatoOfferta(offertaId, {
        numeriDaPortare: allegato.numeriDaPortare.filter((_, i) => i !== index)
      });
    }
  };

  const validateForm = () => {
    if (selectedOffers.length === 0) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Seleziona almeno un'offerta per continuare"
      });
      return false;
    }

    if (!clienteData.cognome || !clienteData.nome || !clienteData.codiceFiscale || !clienteData.cellulare || !clienteData.email) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Compila tutti i campi obbligatori del cliente"
      });
      return false;
    }

    if (clienteData.isBusiness && (!clienteData.ragioneSociale || !clienteData.partitaIva)) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Compila ragione sociale e partita IVA per clienti business"
      });
      return false;
    }

    if (!documentoIdentita.numeroDocumento || !documentoIdentita.luogoRilascio) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Carica e completa i dati del documento d'identità"
      });
      return false;
    }

    // Validate allegati for each offer
    for (const offer of selectedOffers) {
      const allegato = allegatiOfferte.find(a => a.offertaId === offer.id);
      if (offer.tipo === 'Luce' || offer.tipo === 'Gas') {
        if (!allegato?.fatturaFile) {
          toast({
            variant: "destructive",
            title: "Errore",
            description: `Carica la fattura per l'offerta ${offer.nome}`
          });
          return false;
        }
      }
      if (offer.tipo === 'Telefonia' && allegato?.tipoLinea === 'Linea esistente' && !allegato?.codiceMigrazione) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: `Inserisci il codice di migrazione per l'offerta ${offer.nome}`
        });
        return false;
      }
    }

    if (metodoPagamento.tipo === 'IBAN' && !metodoPagamento.iban) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Inserisci l'IBAN per il metodo di pagamento selezionato"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate contract creation and save
      const contractData = {
        codiceUnivocoOfferta: `CONTR-${Date.now()}`,
        dataCreazione: new Date().toISOString(),
        creatoDa: {
          id: currentUser?.id || 'demo-user',
          nome: currentUser?.nome || 'Demo',
          cognome: 'User'
        },
        cliente: clienteData,
        offerte: selectedOffers,
        allegati: allegatiOfferte,
        documento: documentoIdentita,
        metodoPagamento,
        statoOfferta: 'Caricato' as const,
        noteStatoOfferta: 'Contratto appena caricato dal sistema',
        tipologiaContratto: selectedOffers.some(o => o.tipo === 'Telefonia') ? 'telefonia' : 'energia',
        wizardData // Save wizard selections too
      };

      console.log('Saving contract:', contractData);
      
      // Save to localStorage (in real app, this would be Firebase/Hetzner)
      const existingContracts = JSON.parse(localStorage.getItem('contracts') || '[]');
      localStorage.setItem('contracts', JSON.stringify([...existingContracts, contractData]));
      
      toast({
        title: "✅ Contratto Inviato con Successo!",
        description: `Contratto ${contractData.codiceUnivocoOfferta} salvato correttamente. Il contratto è ora visibile nella pagina Contratti con stato "Caricato".`,
      });
      
      // Redirect to contracts page
      setTimeout(() => {
        navigate('/contracts');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving contract:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile salvare il contratto. Riprova."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout userRole={userRole || "consulente"}>
      <div className="min-h-screen bg-white font-roboto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="rounded-2xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Indietro
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Nuovo Contratto</h1>
                <p className="text-gray-600">
                  {isWizardComplete 
                    ? "Compila tutti i dati per creare il contratto" 
                    : "Configurazione guidata in 3 semplici passaggi"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar (only during wizard) */}
          {!isWizardComplete && (
            <Card className="mb-8 rounded-2xl shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">Passaggio {currentStep} di {totalSteps}</span>
                  <span className="text-sm font-medium" style={{ color: '#E6007E' }}>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 mb-4" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span className={currentStep >= 1 ? 'font-medium text-gray-900' : ''}>Tipo Cliente</span>
                  <span className={currentStep >= 2 ? 'font-medium text-gray-900' : ''}>Tipo Fornitura</span>
                  <span className={currentStep >= 3 ? 'font-medium text-gray-900' : ''}>Tipologia Attivazione</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wizard Steps */}
          {currentStep === 1 && (
            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Tipo Cliente</h2>
                <p className="text-gray-600 mb-8">Seleziona la tipologia di cliente per questa pratica</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {CUSTOMER_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = wizardData.customerType === type.id;
                    
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleCustomerTypeSelect(type.id)}
                        className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                          isSelected 
                            ? 'border-yellow-400 bg-yellow-50 shadow-lg' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                        style={isSelected ? { borderColor: '#F2C927' } : {}}
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div 
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-yellow-200' : 'bg-gray-100'
                            }`}
                          >
                            <Icon 
                              className="h-6 w-6" 
                              style={{ color: isSelected ? '#E6007E' : '#6B7280' }}
                            />
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5" style={{ color: '#E6007E' }} />
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Tipo Fornitura</h2>
                <p className="text-gray-600 mb-8">Seleziona una o più tipologie di fornitura (selezione multipla)</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {SUPPLY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = wizardData.supplyTypes.includes(type.id);
                    
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleSupplyTypeToggle(type.id)}
                        className={`p-6 rounded-xl border-2 transition-all duration-200 text-center ${
                          isSelected 
                            ? 'border-yellow-400 bg-yellow-50 shadow-lg' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                        style={isSelected ? { borderColor: '#F2C927' } : {}}
                      >
                        <div 
                          className={`w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-3 ${type.bgColor}`}
                        >
                          <Icon className={`h-8 w-8 ${type.color}`} />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{type.label}</h3>
                        {isSelected && (
                          <Badge 
                            className="text-xs"
                            style={{ backgroundColor: '#E6007E', color: 'white' }}
                          >
                            Selezionato
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                {wizardData.supplyTypes.length > 0 && (
                  <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">Forniture selezionate:</h4>
                    <div className="flex flex-wrap gap-2">
                      {wizardData.supplyTypes.map(type => (
                        <Badge key={type} variant="secondary" className="text-sm">
                          {SUPPLY_TYPES.find(st => st.id === type)?.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 3: Tipologia Attivazione</h2>
                <p className="text-gray-600 mb-8">Seleziona la tipologia di attivazione per ogni fornitura scelta</p>
                
                <div className="space-y-8">
                  {wizardData.supplyTypes.map((supplyType) => {
                    const supplyInfo = SUPPLY_TYPES.find(st => st.id === supplyType);
                    const activationOptions = supplyType === 'Telefonia' 
                      ? ACTIVATION_TYPES.telefonia 
                      : ACTIVATION_TYPES.standard;
                    
                    return (
                      <div key={supplyType} className="border rounded-lg p-6 bg-white">
                        <div className="flex items-center gap-3 mb-6">
                          {supplyInfo && (
                            <>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${supplyInfo.bgColor}`}>
                                <supplyInfo.icon className={`h-5 w-5 ${supplyInfo.color}`} />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Tipo Fornitura: {supplyInfo.label.toUpperCase()}
                              </h3>
                            </>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activationOptions.map((activation) => {
                            const Icon = activation.icon;
                            const isSelected = wizardData.activationTypes[supplyType] === activation.id;
                            
                            return (
                              <button
                                key={activation.id}
                                onClick={() => handleActivationTypeSelect(supplyType, activation.id as ActivationType)}
                                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                                  isSelected 
                                    ? 'border-yellow-400 bg-yellow-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                style={isSelected ? { borderColor: '#F2C927' } : {}}
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <Icon 
                                    className="h-5 w-5" 
                                    style={{ color: isSelected ? '#E6007E' : '#6B7280' }}
                                  />
                                  <h4 className="font-medium text-gray-900">{activation.label}</h4>
                                  {isSelected && (
                                    <Check className="h-4 w-4 ml-auto" style={{ color: '#E6007E' }} />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{activation.description}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons for Wizard */}
          {!isWizardComplete && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 rounded-2xl"
              >
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </Button>
              
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && !canProceedToStep2) ||
                  (currentStep === 2 && !canProceedToStep3) ||
                  (currentStep === 3 && !canCompleteWizard)
                }
                className="flex items-center gap-2 rounded-2xl"
                style={{ backgroundColor: '#F2C927', color: '#333333' }}
              >
                {currentStep === 3 ? 'Continua alla Simulazione' : 'Avanti'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Summary of wizard selections */}
          {!isWizardComplete && wizardData.customerType && (
            <Card className="mt-8 rounded-2xl shadow-md">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Riepilogo Selezioni</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{CUSTOMER_TYPES.find(ct => ct.id === wizardData.customerType)?.label}</span>
                  </div>
                  {wizardData.supplyTypes.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Forniture:</span>
                      <span className="font-medium">
                        {wizardData.supplyTypes.map(st => 
                          SUPPLY_TYPES.find(supply => supply.id === st)?.label
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                  {Object.keys(wizardData.activationTypes).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attivazioni:</span>
                      <div className="text-right">
                        {Object.entries(wizardData.activationTypes).map(([supply, activation]) => (
                          <div key={supply} className="font-medium text-xs">
                            {SUPPLY_TYPES.find(st => st.id === supply)?.label}: {
                              [...ACTIVATION_TYPES.standard, ...ACTIVATION_TYPES.telefonia]
                                .find(at => at.id === activation)?.label
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offers Selection - shown after wizard completion */}
          {isWizardComplete && availableOffers.length > 0 && selectedOffers.length === 0 && (
            <Card className="rounded-2xl shadow-md border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎯 Seleziona le Offerte
                </CardTitle>
                <CardDescription>
                  Seleziona una o più offerte dalle {availableOffers.length} disponibili in base ai tuoi criteri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">

                  {/* Current filters display */}
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold text-gray-900 mb-2">🔍 Filtri Applicati</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        Cliente: {CUSTOMER_TYPES.find(ct => ct.id === wizardData.customerType)?.label}
                      </Badge>
                      {wizardData.supplyTypes.map(type => (
                        <Badge key={type} variant="outline">
                          {type}: {wizardData.activationTypes[type]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Available offers grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableOffers.map((offer) => (
                      <Card key={offer.id} className="rounded-xl border-2 border-gray-200 hover:border-green-300 transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getOfferIcon(offer.tipo)}
                              <div>
                                <h3 className="font-semibold text-gray-900 text-sm">{offer.nome}</h3>
                                <p className="text-xs text-gray-600">{offer.gestore}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Tipo:</span>
                              <Badge variant="secondary" className="text-xs">{offer.tipo}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Prezzo:</span>
                              <span className="font-medium text-sm">{offer.prezzo}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Cliente:</span>
                              <Badge className={offer.tipoCliente === 'Business' ? 'bg-blue-100 text-blue-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                                {offer.tipoCliente}
                              </Badge>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOffers(prev => [...prev, offer]);
                              toast({
                                title: "Offerta Selezionata",
                                description: `${offer.nome} aggiunta al contratto`,
                              });
                            }}
                            className="w-full rounded-xl"
                            style={{ backgroundColor: '#F2C927', color: '#333333' }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Seleziona Offerta
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(3)}
                      className="rounded-2xl"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Modifica Selezioni
                    </Button>

                    <div className="text-sm text-gray-600">
                      Seleziona almeno un'offerta per continuare
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form sections - only shown after wizard completion and offer selection */}
          {isWizardComplete && selectedOffers.length > 0 && (
            <div className="space-y-8">
              
              {/* SEZIONE 1: Offerte Selezionate */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    1. Offerte Selezionate
                  </CardTitle>
                  <CardDescription>
                    Controlla le offerte che verranno incluse nel contratto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedOffers.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Nessuna offerta selezionata</p>
                      <div className="flex gap-4 justify-center mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                        >
                          Torna alla Configurazione
                        </Button>
                        {availableOffers.length > 0 && (
                          <Button
                            onClick={() => {
                              setSelectedOffers([]);
                              toast({
                                title: "Pronto per la Selezione",
                                description: `${availableOffers.length} offerte disponibili in base ai tuoi criteri`,
                              });
                            }}
                            style={{ backgroundColor: '#F2C927', color: '#333333' }}
                          >
                            Seleziona dalle Offerte Disponibili
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOffers.map((offer) => (
                        <Card key={offer.id} className="rounded-xl border-2 border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getOfferIcon(offer.tipo)}
                                <div>
                                  <h3 className="font-semibold text-gray-900">{offer.nome}</h3>
                                  <p className="text-sm text-gray-600">{offer.gestore}</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeOffer(offer.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Tipo:</span>
                                <Badge variant="secondary">{offer.tipo}</Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Prezzo:</span>
                                <span className="font-medium">{offer.prezzo}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Cliente:</span>
                                <Badge className={offer.tipoCliente === 'Business' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                  {offer.tipoCliente}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEZIONE 2: Dati Cliente */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    2. Dati Cliente
                  </CardTitle>
                  <CardDescription>
                    Inserisci le informazioni del cliente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Tipo Cliente Display */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Tipo Cliente:</strong> {CUSTOMER_TYPES.find(ct => ct.id === wizardData.customerType)?.label}
                      {wizardData.customerType === 'business' && ' (I campi business sono obbligatori)'}
                    </p>
                  </div>

                  {/* Ragione Sociale (solo per Business) */}
                  {clienteData.isBusiness && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ragioneSociale">Ragione Sociale *</Label>
                        <Input
                          id="ragioneSociale"
                          value={clienteData.ragioneSociale || ''}
                          onChange={(e) => setClienteData(prev => ({ 
                            ...prev, 
                            ragioneSociale: e.target.value 
                          }))}
                          className="rounded-2xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="partitaIva">Partita IVA *</Label>
                        <Input
                          id="partitaIva"
                          value={clienteData.partitaIva || ''}
                          onChange={(e) => setClienteData(prev => ({ 
                            ...prev, 
                            partitaIva: e.target.value 
                          }))}
                          className="rounded-2xl"
                          maxLength={11}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dati Personali */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cognome">Cognome *</Label>
                      <Input
                        id="cognome"
                        value={clienteData.cognome}
                        onChange={(e) => setClienteData(prev => ({ 
                          ...prev, 
                          cognome: e.target.value 
                        }))}
                        className="rounded-2xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={clienteData.nome}
                        onChange={(e) => setClienteData(prev => ({ 
                          ...prev, 
                          nome: e.target.value 
                        }))}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codiceFiscale">Codice Fiscale *</Label>
                      <Input
                        id="codiceFiscale"
                        value={clienteData.codiceFiscale}
                        onChange={(e) => setClienteData(prev => ({ 
                          ...prev, 
                          codiceFiscale: e.target.value.toUpperCase() 
                        }))}
                        className="rounded-2xl"
                        maxLength={16}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cellulare">Cellulare *</Label>
                      <Input
                        id="cellulare"
                        value={clienteData.cellulare}
                        onChange={(e) => setClienteData(prev => ({ 
                          ...prev, 
                          cellulare: e.target.value 
                        }))}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={clienteData.email}
                      onChange={(e) => setClienteData(prev => ({ 
                        ...prev, 
                        email: e.target.value 
                      }))}
                      className="rounded-2xl"
                    />
                  </div>

                  <Separator />

                  {/* Indirizzi */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Indirizzo di {clienteData.isBusiness ? 'Sede Legale' : 'Residenza'} *
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-3">
                        <Label htmlFor="viaResidenza">Via/Indirizzo</Label>
                        <Input
                          id="viaResidenza"
                          value={clienteData.indirizzoResidenza.via}
                          onChange={(e) => setClienteData(prev => ({ 
                            ...prev, 
                            indirizzoResidenza: { 
                              ...prev.indirizzoResidenza, 
                              via: e.target.value 
                            }
                          }))}
                          className="rounded-2xl"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="cittaResidenza">Città</Label>
                        <Input
                          id="cittaResidenza"
                          value={clienteData.indirizzoResidenza.citta}
                          onChange={(e) => setClienteData(prev => ({ 
                            ...prev, 
                            indirizzoResidenza: { 
                              ...prev.indirizzoResidenza, 
                              citta: e.target.value 
                            }
                          }))}
                          className="rounded-2xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="provinciaResidenza">Provincia</Label>
                        <Input
                          id="provinciaResidenza"
                          value={clienteData.indirizzoResidenza.provincia}
                          onChange={(e) => setClienteData(prev => ({ 
                            ...prev, 
                            indirizzoResidenza: { 
                              ...prev.indirizzoResidenza, 
                              provincia: e.target.value.toUpperCase() 
                            }
                          }))}
                          className="rounded-2xl"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="indirizzoFornituraDiverso"
                      checked={indirizzoFornituraDiverso}
                      onCheckedChange={(checked) => setIndirizzoFornituraDiverso(checked === true)}
                    />
                    <Label htmlFor="indirizzoFornituraDiverso">
                      Indirizzo di fornitura diverso da quello di {clienteData.isBusiness ? 'sede legale' : 'residenza'}
                    </Label>
                  </div>

                  {indirizzoFornituraDiverso && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Indirizzo di Fornitura</h4>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-3">
                          <Label htmlFor="viaFornitura">Via/Indirizzo</Label>
                          <Input
                            id="viaFornitura"
                            value={clienteData.indirizzoFornitura?.via || ''}
                            onChange={(e) => setClienteData(prev => ({ 
                              ...prev, 
                              indirizzoFornitura: { 
                                via: e.target.value,
                                citta: prev.indirizzoFornitura?.citta || '',
                                provincia: prev.indirizzoFornitura?.provincia || ''
                              }
                            }))}
                            className="rounded-2xl"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="cittaFornitura">Città</Label>
                          <Input
                            id="cittaFornitura"
                            value={clienteData.indirizzoFornitura?.citta || ''}
                            onChange={(e) => setClienteData(prev => ({ 
                              ...prev, 
                              indirizzoFornitura: { 
                                via: prev.indirizzoFornitura?.via || '',
                                citta: e.target.value,
                                provincia: prev.indirizzoFornitura?.provincia || ''
                              }
                            }))}
                            className="rounded-2xl"
                          />
                        </div>
                        <div>
                          <Label htmlFor="provinciaFornitura">Provincia</Label>
                          <Input
                            id="provinciaFornitura"
                            value={clienteData.indirizzoFornitura?.provincia || ''}
                            onChange={(e) => setClienteData(prev => ({ 
                              ...prev, 
                              indirizzoFornitura: { 
                                via: prev.indirizzoFornitura?.via || '',
                                citta: prev.indirizzoFornitura?.citta || '',
                                provincia: e.target.value.toUpperCase()
                              }
                            }))}
                            className="rounded-2xl"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEZIONE 3: Documento Identità */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    3. Documento Identità
                  </CardTitle>
                  <CardDescription>
                    Carica il documento d'identità per l'estrazione automatica dei dati
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Upload Documento */}
                  <div>
                    <Label>Upload Documento (immagine o PDF)</Label>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => documentoRef.current?.click()}
                        className="w-full h-20 border-dashed border-2 rounded-2xl"
                      >
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            {documentoIdentita.file ? documentoIdentita.file.name : 'Clicca per caricare documento'}
                          </p>
                        </div>
                      </Button>
                      <input
                        ref={documentoRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleDocumentUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Dati estratti da OCR */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="numeroDocumento">Numero Documento</Label>
                      <Input
                        id="numeroDocumento"
                        value={documentoIdentita.numeroDocumento}
                        onChange={(e) => setDocumentoIdentita(prev => ({ 
                          ...prev, 
                          numeroDocumento: e.target.value 
                        }))}
                        className="rounded-2xl"
                        placeholder="Verrà compilato automaticamente con OCR"
                      />
                    </div>
                    <div>
                      <Label htmlFor="luogoRilascio">Luogo Rilascio</Label>
                      <Input
                        id="luogoRilascio"
                        value={documentoIdentita.luogoRilascio}
                        onChange={(e) => setDocumentoIdentita(prev => ({ 
                          ...prev, 
                          luogoRilascio: e.target.value 
                        }))}
                        className="rounded-2xl"
                        placeholder="Verrà compilato automaticamente con OCR"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dataRilascio">Data Rilascio</Label>
                      <Input
                        id="dataRilascio"
                        type="date"
                        value={documentoIdentita.dataRilascio}
                        onChange={(e) => setDocumentoIdentita(prev => ({ 
                          ...prev, 
                          dataRilascio: e.target.value 
                        }))}
                        className="rounded-2xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dataScadenza">Data Scadenza</Label>
                      <Input
                        id="dataScadenza"
                        type="date"
                        value={documentoIdentita.dataScadenza}
                        onChange={(e) => setDocumentoIdentita(prev => ({ 
                          ...prev, 
                          dataScadenza: e.target.value 
                        }))}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEZIONE 4: Allegati per ogni Offerta */}
              {selectedOffers.length > 0 && (
                <Card className="rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      4. Allegati per ogni Offerta
                    </CardTitle>
                    <CardDescription>
                      Completa i dati specifici per ogni offerta selezionata
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {selectedOffers.map((offer) => {
                      const allegato = allegatiOfferte.find(a => a.offertaId === offer.id);
                      
                      return (
                        <div key={offer.id} className="border rounded-xl p-6 bg-gray-50">
                          <div className="flex items-center gap-3 mb-6">
                            {getOfferIcon(offer.tipo)}
                            <h3 className="text-lg font-semibold text-gray-900">
                              {offer.nome} ({offer.tipo})
                            </h3>
                          </div>

                          {/* Contenuto specifico per tipo offerta */}
                          {(offer.tipo === 'Luce' || offer.tipo === 'Gas') && (
                            <div className="space-y-4">
                              {/* Upload Fattura */}
                              <div>
                                <Label>Upload PDF Fattura {offer.tipo}</Label>
                                <div className="mt-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      const ref = fatturaRefs.current[offer.id];
                                      ref?.click();
                                    }}
                                    className="w-full h-16 border-dashed border-2 rounded-2xl"
                                  >
                                    <div className="text-center">
                                      <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                                      <p className="text-sm text-gray-600">
                                        {allegato?.fatturaFile ? allegato.fatturaFile.name : `Carica fattura ${offer.tipo}`}
                                      </p>
                                    </div>
                                  </Button>
                                  <input
                                    ref={(ref) => fatturaRefs.current[offer.id] = ref}
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => handleFatturaUpload(e, offer.id)}
                                    className="hidden"
                                  />
                                </div>
                              </div>

                              {/* Dati estratti da OCR fattura */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {offer.tipo === 'Luce' && (
                                  <div>
                                    <Label htmlFor={`pod-${offer.id}`}>POD (Punto di Prelievo)</Label>
                                    <Input
                                      id={`pod-${offer.id}`}
                                      value={allegato?.pod || ''}
                                      onChange={(e) => updateAllegatoOfferta(offer.id, { pod: e.target.value })}
                                      className="rounded-2xl"
                                      placeholder="Verrà compilato automaticamente"
                                    />
                                  </div>
                                )}
                                
                                {offer.tipo === 'Gas' && (
                                  <div>
                                    <Label htmlFor={`pdr-${offer.id}`}>PDR (Punto di Riconsegna)</Label>
                                    <Input
                                      id={`pdr-${offer.id}`}
                                      value={allegato?.pdr || ''}
                                      onChange={(e) => updateAllegatoOfferta(offer.id, { pdr: e.target.value })}
                                      className="rounded-2xl"
                                      placeholder="Verrà compilato automaticamente"
                                    />
                                  </div>
                                )}

                                <div>
                                  <Label htmlFor={`consumo-${offer.id}`}>Consumo Annuo</Label>
                                  <Input
                                    id={`consumo-${offer.id}`}
                                    value={allegato?.consumoAnnuo || ''}
                                    onChange={(e) => updateAllegatoOfferta(offer.id, { consumoAnnuo: e.target.value })}
                                    className="rounded-2xl"
                                    placeholder="kWh o Smc annui"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Contenuto per Telefonia */}
                          {offer.tipo === 'Telefonia' && (
                            <div className="space-y-4">
                              {/* Tipo Linea */}
                              <div>
                                <Label>Tipo Linea *</Label>
                                <RadioGroup 
                                  value={allegato?.tipoLinea || 'Nuova linea'} 
                                  onValueChange={(value: TipoLinea) => 
                                    updateAllegatoOfferta(offer.id, { tipoLinea: value })}
                                  className="flex gap-6 mt-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Nuova linea" id={`nuova-${offer.id}`} />
                                    <Label htmlFor={`nuova-${offer.id}`}>Nuova linea</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Linea esistente" id={`esistente-${offer.id}`} />
                                    <Label htmlFor={`esistente-${offer.id}`}>Linea esistente</Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              {/* Contenuto condizionale in base al tipo linea */}
                              {allegato?.tipoLinea === 'Nuova linea' ? (
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor={`tecnologia-${offer.id}`}>Tecnologia</Label>
                                    <Select 
                                      value={allegato?.tecnologia || 'FTTH'} 
                                      onValueChange={(value: Tecnologia) => 
                                        updateAllegatoOfferta(offer.id, { tecnologia: value })}
                                    >
                                      <SelectTrigger className="rounded-2xl">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="FTTH">FTTH (Fibra Ottica)</SelectItem>
                                        <SelectItem value="FTTC">FTTC (Fibra Mista)</SelectItem>
                                        <SelectItem value="FWA">FWA (Fixed Wireless Access)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`modem-${offer.id}`}
                                      checked={allegato?.modemIncluso || false}
                                      onCheckedChange={(checked) => 
                                        updateAllegatoOfferta(offer.id, { modemIncluso: !!checked })}
                                    />
                                    <Label htmlFor={`modem-${offer.id}`}>Modem incluso</Label>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* Numeri da portare */}
                                  <div>
                                    <Label>Numeri da Portare</Label>
                                    <div className="space-y-2 mt-2">
                                      {allegato?.numeriDaPortare?.map((numero, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                          <Input 
                                            value={numero} 
                                            disabled 
                                            className="rounded-2xl bg-gray-100" 
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeNumeroTelefono(offer.id, index)}
                                            className="text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                      
                                      <div className="flex items-center gap-2">
                                        <Input
                                          placeholder="Inserisci numero di telefono..."
                                          className="rounded-2xl"
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              addNumeroTelefono(offer.id, e.currentTarget.value);
                                              e.currentTarget.value = '';
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            addNumeroTelefono(offer.id, input.value);
                                            input.value = '';
                                          }}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <Label htmlFor={`codice-migrazione-${offer.id}`}>Codice di Migrazione *</Label>
                                    <Input
                                      id={`codice-migrazione-${offer.id}`}
                                      value={allegato?.codiceMigrazione || ''}
                                      onChange={(e) => updateAllegatoOfferta(offer.id, { codiceMigrazione: e.target.value })}
                                      className="rounded-2xl"
                                      placeholder="Codice necessario per la portabilità"
                                    />
                                  </div>
                                </div>
                              )}

                              <div>
                                <Label htmlFor={`nome-offerta-${offer.id}`}>Nome Offerta</Label>
                                <Input
                                  id={`nome-offerta-${offer.id}`}
                                  value={allegato?.nomeOfferta || offer.nome}
                                  onChange={(e) => updateAllegatoOfferta(offer.id, { nomeOfferta: e.target.value })}
                                  className="rounded-2xl"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* SEZIONE 5: Metodo di Pagamento */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    5. Metodo di Pagamento
                  </CardTitle>
                  <CardDescription>
                    Seleziona il metodo di pagamento preferito
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div>
                    <Label>Tipo Pagamento</Label>
                    <RadioGroup 
                      value={metodoPagamento.tipo} 
                      onValueChange={(value: MetodoPagamentoTipo) => 
                        setMetodoPagamento(prev => ({ ...prev, tipo: value }))}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Bollettino" id="bollettino" />
                        <Label htmlFor="bollettino">Bollettino Postale</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="IBAN" id="iban" />
                        <Label htmlFor="iban">Addebito su IBAN</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {metodoPagamento.tipo === 'IBAN' && (
                    <div>
                      <Label htmlFor="ibanField">IBAN *</Label>
                      <Input
                        id="ibanField"
                        value={metodoPagamento.iban || ''}
                        onChange={(e) => setMetodoPagamento(prev => ({ 
                          ...prev, 
                          iban: e.target.value.toUpperCase() 
                        }))}
                        className="rounded-2xl"
                        placeholder="IT60 X054 2811 1010 0000 0123 456"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEZIONE 6: Riepilogo Dati Contratto */}
              <Card className="rounded-2xl shadow-md border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📋 Riepilogo Dati Contratto
                  </CardTitle>
                  <CardDescription>
                    Controlla tutti i dati prima dell'invio del contratto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-semibold text-gray-900 mb-3">Informazioni Cliente</h4>
                        <div className="text-sm space-y-1">
                          <p><strong>Tipo Cliente:</strong> {CUSTOMER_TYPES.find(ct => ct.id === wizardData.customerType)?.label}</p>
                          <p><strong>Nome:</strong> {clienteData.cognome} {clienteData.nome}</p>
                          <p><strong>Codice Fiscale:</strong> {clienteData.codiceFiscale}</p>
                          {clienteData.isBusiness && (
                            <>
                              <p><strong>Ragione Sociale:</strong> {clienteData.ragioneSociale}</p>
                              <p><strong>P.IVA:</strong> {clienteData.partitaIva}</p>
                            </>
                          )}
                          <p><strong>Email:</strong> {clienteData.email}</p>
                          <p><strong>Cellulare:</strong> {clienteData.cellulare}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-semibold text-gray-900 mb-3">Documento Identità</h4>
                        <div className="text-sm space-y-1">
                          <p><strong>Numero:</strong> {documentoIdentita.numeroDocumento || '—'}</p>
                          <p><strong>Luogo Rilascio:</strong> {documentoIdentita.luogoRilascio || '—'}</p>
                          <p><strong>Scadenza:</strong> {documentoIdentita.dataScadenza || '—'}</p>
                          <p><strong>File:</strong> {documentoIdentita.file ? '✅ Caricato' : '❌ Non caricato'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-semibold text-gray-900 mb-3">Offerte Selezionate</h4>
                        <div className="text-sm space-y-2">
                          {selectedOffers.map((offer) => {
                            const allegato = allegatiOfferte.find(a => a.offertaId === offer.id);
                            return (
                              <div key={offer.id} className="border-l-4 border-blue-400 pl-3">
                                <p><strong>{offer.nome}</strong> ({offer.tipo})</p>
                                <p>Gestore: {offer.gestore} | {offer.prezzo}</p>
                                {allegato?.pod && <p>POD: {allegato.pod}</p>}
                                {allegato?.pdr && <p>PDR: {allegato.pdr}</p>}
                                {allegato?.fatturaFile && <p>Fattura: ✅ Caricata</p>}
                                {allegato?.tipoLinea && <p>Tipo Linea: {allegato.tipoLinea}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-semibold text-gray-900 mb-3">Altre Informazioni</h4>
                        <div className="text-sm space-y-1">
                          <p><strong>Metodo Pagamento:</strong> {metodoPagamento.tipo}</p>
                          {metodoPagamento.iban && <p><strong>IBAN:</strong> {metodoPagamento.iban}</p>}
                          <p><strong>Stato Contratto:</strong> <Badge className="bg-blue-100 text-blue-800">Caricato</Badge></p>
                          <p><strong>Autore:</strong> {currentUser?.nome || 'Demo User'}</p>
                          <p><strong>Data Creazione:</strong> {new Date().toLocaleDateString('it-IT')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEZIONE 7: Conferma e Invio */}
              <Card className="rounded-2xl shadow-md border-2 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    7. Conferma e Invio Contratto
                  </CardTitle>
                  <CardDescription>
                    Verifica tutti i dati e invia il contratto per la lavorazione
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-2">⚠️ Informazioni Importanti</h4>
                      <div className="text-sm space-y-1 text-gray-700">
                        <p>• Il contratto verrà salvato sul server Hetzner nella cartella /[gestore]/[anno]/[mese]/[giorno]/</p>
                        <p>• Lo stato iniziale sarà "Caricato"</p>
                        <p>• Il contratto sarà visibile solo al consulente che lo ha caricato</p>
                        <p>• Tutti i dati OCR estratti saranno inclusi nel contratto</p>
                        <p>• Una volta inviato, il contratto potrà essere modificato dalla pagina Contratti</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || selectedOffers.length === 0}
                      className="w-full h-12 rounded-2xl text-lg font-semibold"
                      style={{ backgroundColor: '#F2C927', color: '#333333' }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
                          Invio in corso...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Conferma e Invia Contratto
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
