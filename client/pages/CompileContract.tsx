import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  User,
  Camera,
  CheckCircle,
  AlertTriangle,
  Save,
  AlertCircle,
} from "lucide-react";
// Rimosso: ora usiamo Netlify OCR
import { detectDocType } from "@/utils/id-parsers";
import { processDocumentOCR, processBillOCR } from "@/utils/netlify-ocr";

// Regex patterns
const CF_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
const IBAN_IT_REGEX = /^IT\d{2}[A-Z]\d{3}\d{4}\d{12}$/;

// Types
interface Offer {
  id: string;
  name: string;
  brand: string;
  serviceType: string;
  customerType: string;
  price: string;
  commodity?: "electricity" | "gas";
  segment?: "residential" | "business";
  requiresIban?: boolean;
}

// Zod schema with conditional validations
const createValidationSchema = (selectedOffer?: Offer) => {
  return z.object({
    // Dati cliente
    nome: z.string().min(1, "Nome obbligatorio"),
    cognome: z.string().min(1, "Cognome obbligatorio"),
    codiceFiscale: z.string().regex(CF_REGEX, "Codice fiscale non valido"),
    cellulare: z.string().min(7, "Cellulare obbligatorio"),
    email: z.string().email("Email non valida"),
    iban: z.string().optional(),
    
    // Documento
    docTipo: z.enum(["CARTA_IDENTITA", "PATENTE", "PASSAPORTO"]),
    docRilasciatoDa: z.enum(["Comune", "MC", "MCTC", "MIT UCO", "Questura"]),
    docNumero: z.string().optional(),
    docRilascio: z.string().min(1, "Data di rilascio obbligatoria"),
    docScadenza: z.string().min(1, "Data di scadenza obbligatoria"),
    
    // Indirizzi
    resVia: z.string().min(1, "Via residenza obbligatoria"),
    resCivico: z.string().min(1, "Civico residenza obbligatorio"),
    resCitta: z.string().min(1, "Città residenza obbligatoria"),
    resCap: z.string().min(4, "CAP residenza obbligatorio"),
    
    fornUguale: z.boolean().optional(),
    fornVia: z.string().optional(),
    fornCivico: z.string().optional(),
    fornCitta: z.string().optional(),
    fornCap: z.string().optional(),
    
    // POD/PDR condizionale
    pod: z.string().optional(),
    pdr: z.string().optional(),

    // Dati tecnici
    potenzaImpegnataKw: z.number().optional(),
    usiGas: z.array(z.enum(["cottura", "riscaldamento", "acqua_calda"])).optional(),

    residenziale: z.enum(["si", "no"]).optional(),
  }).superRefine((data, ctx) => {
    // IBAN required se selectedOffer?.requiresIban === true
    if (selectedOffer?.requiresIban && !data.iban) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IBAN obbligatorio per questa offerta",
        path: ["iban"],
      });
    }
    
    // Validate IBAN format if provided
    if (data.iban && !IBAN_IT_REGEX.test(data.iban.replace(/\s+/g, ""))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Formato IBAN non valido",
        path: ["iban"],
      });
    }
    
    // POD required se commodity === "electricity"
    if (selectedOffer?.commodity === "electricity" && !data.pod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "POD obbligatorio per offerte luce",
        path: ["pod"],
      });
    }
    
    // PDR required se commodity === "gas"
    if (selectedOffer?.commodity === "gas" && !data.pdr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PDR obbligatorio per offerte gas",
        path: ["pdr"],
      });
    }
    
    // Fornitura fields required se fornUguale !== true
    if (!data.fornUguale) {
      if (!data.fornVia) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Via fornitura obbligatoria",
          path: ["fornVia"],
        });
      }
      if (!data.fornCivico) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Civico fornitura obbligatorio",
          path: ["fornCivico"],
        });
      }
      if (!data.fornCitta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Città fornitura obbligatoria",
          path: ["fornCitta"],
        });
      }
      if (!data.fornCap) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CAP fornitura obbligatorio",
          path: ["fornCap"],
        });
      }
    }
    
    // Residenziale required se segment === "residential"
    if (selectedOffer?.segment === "residential" && !data.residenziale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Campo residenziale obbligatorio",
        path: ["residenziale"],
      });
    }

    // Potenza impegnata required per luce
    if (selectedOffer?.commodity === "electricity") {
      if (!data.potenzaImpegnataKw || data.potenzaImpegnataKw <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Potenza impegnata obbligatoria e deve essere maggiore di 0",
          path: ["potenzaImpegnataKw"],
        });
      }
    }

    // Usi gas required per gas
    if (selectedOffer?.commodity === "gas") {
      if (!data.usiGas || data.usiGas.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seleziona almeno un uso del gas",
          path: ["usiGas"],
        });
      }
    }
  });
};

// Bill parsing function
function parseBillData(text: string) {
  const t = text.replace(/\s+/g, " ").toUpperCase();
  
  const addr = (label: string) => {
    const m = t.match(new RegExp(label + "[:\\s]+([A-ZÀ-Ù' .-]+)\\s+(\\d+)", "i"));
    return m ? { via: m[1].trim(), civico: m[2] } : undefined;
  };
  
  const capCitta = () => {
    const m = t.match(/\b(\d{5})\b[^A-Z0-9]{0,10}([A-ZÀ-Ù' -]{2,})/i);
    return m ? { cap: m[1], citta: m[2].trim() } : undefined;
  };
  
  const pod = t.match(/\bPOD\s*([A-Z0-9]{14,})\b/i)?.[1];
  const pdr = t.match(/\bPDR\s*([0-9]{14})\b/i)?.[1];

  // Estrazione potenza impegnata per luce
  const potenzaMatch = t.match(/POTENZA\s+(IMPEGNATA|CONTRATTUALE)[^0-9]{0,10}(\d+[.,]?\d*)\s*KW/i);
  const potenzaImpegnata = potenzaMatch ? parseFloat(potenzaMatch[2].replace(',', '.')) : undefined;

  return { addr, capCitta, pod, pdr, potenzaImpegnata };
}

export default function CompileContract() {
  const navigate = useNavigate();
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Document upload states
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [billUploaded, setBillUploaded] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [docPreviews, setDocPreviews] = useState<string[]>([]);
  const [billPreviews, setBillPreviews] = useState<string[]>([]);
  const [ocrSource, setOcrSource] = useState<{ doc?: 'google' | 'tesseract'; bill?: 'google' | 'tesseract' }>({});
  
  const selectedOffer = selectedOffers[0]; // Use first offer for validation logic
  
  const form = useForm({
    resolver: zodResolver(createValidationSchema(selectedOffer)),
    defaultValues: {
      nome: "",
      cognome: "",
      codiceFiscale: "",
      cellulare: "",
      email: "",
      iban: "",
      docTipo: "CARTA_IDENTITA" as const,
      docRilasciatoDa: "Comune" as const,
      docNumero: "",
      docRilascio: "",
      docScadenza: "",
      resVia: "",
      resCivico: "",
      resCitta: "",
      resCap: "",
      fornUguale: false,
      fornVia: "",
      fornCivico: "",
      fornCitta: "",
      fornCap: "",
      pod: "",
      pdr: "",
      potenzaImpegnataKw: undefined,
      usiGas: [] as ("cottura" | "riscaldamento" | "acqua_calda")[],
      residenziale: "si" as const,
    },
  });
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const watchFornUguale = watch("fornUguale");
  
  // Cleanup
  useEffect(() => {
    return () => {
      docPreviews.forEach(url => URL.revokeObjectURL(url));
      billPreviews.forEach(url => URL.revokeObjectURL(url));
      // OCR cleanup non più necessario con Netlify Functions
    };
  }, [docPreviews, billPreviews]);
  
  // Copy residence to supply address when checkbox is checked
  useEffect(() => {
    if (watchFornUguale) {
      setValue("fornVia", watch("resVia"));
      setValue("fornCivico", watch("resCivico"));
      setValue("fornCitta", watch("resCitta"));
      setValue("fornCap", watch("resCap"));
    }
  }, [watchFornUguale, watch, setValue]);
  
  // Load offers from localStorage
  useEffect(() => {
    const loadOffers = () => {
      try {
        const selectedOffer = localStorage.getItem("selectedOffer");
        if (selectedOffer) {
          const parsed = JSON.parse(selectedOffer);
          const offerArray = Array.isArray(parsed) ? parsed : [parsed];
          setSelectedOffers(offerArray);
          return;
        }
        
        const possibleKeys = ["selectedOffers", "selected_offers", "cart", "carrello"];
        let raw: string | null = null;
        for (const k of possibleKeys) {
          const v = localStorage.getItem(k);
          if (v) {
            raw = v;
            break;
          }
        }
        
        if (!raw) {
          setSelectedOffers([]);
          return;
        }
        
        let parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }
        
        const mapped: Offer[] = parsed
          .map((offer: any) => {
            if (!offer) return null;
            
            const id = offer.id ?? offer.offerId ?? offer.uid ?? offer._id ?? `${offer.brand || offer.gestore || "offer"}-${offer.nome || offer.name || Date.now()}`;
            const name = offer.name ?? offer.nome ?? offer.titolo ?? "Offerta";
            const brand = offer.brand ?? offer.gestore ?? offer.marca ?? "Gestore";
            const serviceType = offer.serviceType ?? offer.tipo ?? offer.tipologia ?? offer.supplyType ?? "servizio";
            const customerType = offer.customerType ?? offer.tipoCliente ?? offer.segmento ?? "residenziale";
            const price = offer.price ?? offer.prezzo ?? offer.costo ?? "";
            
            // Inferire commodity dal serviceType se non presente
            let commodity = offer.commodity;
            if (!commodity) {
              const service = serviceType.toLowerCase();
              if (service.includes("luce") || service.includes("electric")) {
                commodity = "electricity";
              } else if (service.includes("gas")) {
                commodity = "gas";
              }
            }

            return {
              id, name, brand, serviceType, customerType, price,
              commodity: commodity,
              segment: offer.segment,
              requiresIban: offer.requiresIban
            } as Offer;
          })
          .filter(Boolean);
        
        setSelectedOffers(mapped);
      } catch (error) {
        console.error("Error loading offers:", error);
        setSelectedOffers([]);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadOffers();
  }, []);
  
  // Redirect if no offers
  useEffect(() => {
    if (isLoaded && selectedOffers.length === 0) {
      navigate("/offers");
    }
  }, [selectedOffers, navigate, isLoaded]);
  
  // Handle document upload with OCR (Netlify Functions)
  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setOcrLoading(true);
    try {
      const { text, parsed, previews } = await processDocumentOCR(Array.from(files));
      setDocPreviews(prev => [...prev, ...previews]);

      // Debug: log extracted text
      console.log("📄 Testo estratto OCR:", text);
      console.log("📋 Dati parsificati:", parsed);

      // Auto-fill form fields with debug
      let filledFields = 0;
      if (parsed.nome) {
        setValue("nome", parsed.nome);
        console.log("✅ Nome compilato:", parsed.nome);
        filledFields++;
      }
      if (parsed.cognome) {
        setValue("cognome", parsed.cognome);
        console.log("✅ Cognome compilato:", parsed.cognome);
        filledFields++;
      }
      if (parsed.codiceFiscale) {
        setValue("codiceFiscale", parsed.codiceFiscale);
        console.log("✅ Codice Fiscale compilato:", parsed.codiceFiscale);
        filledFields++;
      }
      if (parsed.numeroDocumento) {
        setValue("docNumero", parsed.numeroDocumento);
        console.log("✅ Numero documento compilato:", parsed.numeroDocumento);
        filledFields++;
      }
      if (parsed.scadenza) {
        setValue("docScadenza", parsed.scadenza);
        console.log("✅ Scadenza compilata:", parsed.scadenza);
        filledFields++;
      }

      console.log(`📊 Totale campi compilati: ${filledFields}/5`);

      // Show success message
      toast.success(`Documento elaborato con OCR. ${filledFields} campi compilati automaticamente.`);

      setDocumentUploaded(true);
      setOcrSource(prev => ({ ...prev, doc: 'netlify' }));

    } catch (err: any) {
      console.error("OCR error:", err);
      toast.error(`Errore nell'elaborazione OCR del documento: ${err.message}. Compila i campi manualmente.`);
    } finally {
      setOcrLoading(false);
    }
  };
  
  // Handle bill upload with OCR (Netlify Functions)
  const handleBillUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setOcrLoading(true);
    try {
      const { text, data, previews } = await processBillOCR(Array.from(files));
      setBillPreviews(prev => [...prev, ...previews]);

      console.log("📄 Testo fattura estratto:", text);
      console.log("📋 Dati fattura parsificati:", data);

      let filledFields = 0;

      // Extract residence address from parsed data
      if (data.residenza) {
        if (data.residenza.via) {
          setValue("resVia", data.residenza.via);
          filledFields++;
        }
        if (data.residenza.civico) {
          setValue("resCivico", data.residenza.civico);
          filledFields++;
        }
        if (data.residenza.cap) {
          setValue("resCap", data.residenza.cap);
          filledFields++;
        }
        if (data.residenza.citta) {
          setValue("resCitta", data.residenza.citta);
          filledFields++;
        }
      }

      // Extract supply address from parsed data
      if (data.fornitura) {
        if (data.fornitura.via) {
          setValue("fornVia", data.fornitura.via);
          filledFields++;
        }
        if (data.fornitura.civico) {
          setValue("fornCivico", data.fornitura.civico);
          filledFields++;
        }
        if (data.fornitura.cap) {
          setValue("fornCap", data.fornitura.cap);
          filledFields++;
        }
        if (data.fornitura.citta) {
          setValue("fornCitta", data.fornitura.citta);
          filledFields++;
        }
      }

      // Set POD/PDR based on commodity
      if (selectedOffer?.commodity === "electricity" && data.pod) {
        setValue("pod", data.pod);
        filledFields++;
      }
      if (selectedOffer?.commodity === "gas" && data.pdr) {
        setValue("pdr", data.pdr);
        filledFields++;
      }

      // Set potenza impegnata for electricity
      if (selectedOffer?.commodity === "electricity" && data.potenzaImpegnata) {
        setValue("potenzaImpegnataKw", data.potenzaImpegnata);
        filledFields++;
      }

      console.log(`📊 Totale campi fattura compilati: ${filledFields}`);

      // Show success message
      toast.success(`Fattura elaborata con Netlify OCR. ${filledFields} campi compilati automaticamente.`);

      setBillUploaded(true);
      setOcrSource(prev => ({ ...prev, bill: 'netlify' }));

    } catch (err: any) {
      console.error("Bill OCR error:", err);
      toast.error("Errore nell'elaborazione della fattura. Compila i campi manualmente.");
    } finally {
      setOcrLoading(false);
    }
  };
  
  // Form submission
  const onSubmit = async (data: any) => {
    if (!documentUploaded) {
      toast.error("Documento d'identità obbligatorio");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Normalize data
      const contractData = {
        cliente: {
          nome: data.nome,
          cognome: data.cognome,
          codiceFiscale: data.codiceFiscale,
          cellulare: data.cellulare,
          email: data.email,
          iban: data.iban
        },
        documento: {
          tipo: data.docTipo,
          numero: data.docNumero,
          rilasciatoDa: data.docRilasciatoDa,
          dataRilascio: data.docRilascio,
          dataScadenza: data.docScadenza
        },
        indirizzi: {
          residenza: {
            via: data.resVia,
            civico: data.resCivico,
            citta: data.resCitta,
            cap: data.resCap
          },
          fornitura: data.fornUguale ? {
            via: data.resVia,
            civico: data.resCivico,
            citta: data.resCitta,
            cap: data.resCap
          } : {
            via: data.fornVia,
            civico: data.fornCivico,
            citta: data.fornCitta,
            cap: data.fornCap
          }
        },
        pod: data.pod,
        pdr: data.pdr,
        potenzaImpegnataKw: data.potenzaImpegnataKw,
        usiGas: data.usiGas,
        residenziale: data.residenziale,
        offerte: selectedOffers
      };
      
      // Save to localStorage (in real app would be database)
      const existingContracts = JSON.parse(localStorage.getItem('contracts') || '[]');
      const newContract = {
        ...contractData,
        id: Date.now().toString(),
        consulenteId: 'user1',
        stato: 'da_verificare',
        dataCreazione: new Date().toISOString(),
        ultimaModifica: new Date().toISOString()
      };
      existingContracts.push(newContract);
      localStorage.setItem('contracts', JSON.stringify(existingContracts));
      
      // Clear cart
      localStorage.removeItem('selectedOffers');
      localStorage.removeItem('selectedOffer');
      
      toast.success("Contratto inviato con successo!");
      navigate("/contracts");
      
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Errore nell'invio del contratto. Riprova.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!isLoaded) return null;
  if (selectedOffers.length === 0) return null;
  
  return (
    <AppLayout userRole="consulente">
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Compila Contratto</h1>
            <p className="text-gray-600">Inserisci i dati del cliente e carica i documenti necessari</p>
          </div>
          
          {/* Selected Offers Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Offerte Selezionate ({selectedOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedOffers.map(offer => (
                  <div key={offer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <div className="font-medium">{offer.name}</div>
                      <div className="text-sm text-gray-500">{offer.brand} - {offer.serviceType}</div>
                      {offer.commodity && (
                        <Badge variant="outline" className="mt-1">
                          {offer.commodity === "electricity" ? "Luce" : "Gas"}
                        </Badge>
                      )}
                      {!offer.commodity && (
                        <Badge variant="secondary" className="mt-1">
                          Commodity non specificata
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline">{offer.price}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* 1. Documento d'identità */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Documento d'identità
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Carica il documento del cliente per compilazione automatica
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Document Type Radio */}
                <div>
                  <Label className="text-sm font-medium">Tipo documento</Label>
                  <RadioGroup
                    value={watch("docTipo")}
                    onValueChange={(value) => setValue("docTipo", value as any)}
                    className="flex flex-wrap gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CARTA_IDENTITA" id="ci" />
                      <Label htmlFor="ci">Carta di identità</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PATENTE" id="patente" />
                      <Label htmlFor="patente">Patente</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PASSAPORTO" id="passaporto" />
                      <Label htmlFor="passaporto">Passaporto</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) => handleDocumentUpload(e.target.files)}
                    className="hidden"
                    id="doc-upload"
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      Carica fronte e retro del documento
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, JPG o PNG - Accetta più file
                    </p>
                    <Button
                      type="button"
                      onClick={() => document.getElementById("doc-upload")?.click()}
                      className="mt-2"
                      style={{ backgroundColor: '#F2C927', color: '#333' }}
                    >
                      Seleziona File
                    </Button>
                  </div>
                </div>
                
                {/* Loading State */}
                {ocrLoading && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-600">
                      Estrazione dati in corso...
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Document Previews */}
                {docPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {docPreviews.map((src, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden bg-white">
                        <img src={src} alt={`doc-${i}`} className="w-full h-32 object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Success Message */}
                {documentUploaded && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Documento elaborato con successo. I campi sono stati compilati automaticamente.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            {/* 2. Dati Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dati Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      {...register("nome")}
                      placeholder="Nome del cliente"
                    />
                    {errors.nome && (
                      <p className="text-sm text-red-600 mt-1">{errors.nome.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="cognome">Cognome *</Label>
                    <Input
                      id="cognome"
                      {...register("cognome")}
                      placeholder="Cognome del cliente"
                    />
                    {errors.cognome && (
                      <p className="text-sm text-red-600 mt-1">{errors.cognome.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="codiceFiscale">Codice Fiscale *</Label>
                    <Input
                      id="codiceFiscale"
                      {...register("codiceFiscale")}
                      placeholder="RSSMRA80A01H501X"
                      style={{ textTransform: 'uppercase' }}
                    />
                    {errors.codiceFiscale && (
                      <p className="text-sm text-red-600 mt-1">{errors.codiceFiscale.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="cellulare">Cellulare *</Label>
                    <Input
                      id="cellulare"
                      {...register("cellulare")}
                      placeholder="+39 123 456 7890"
                    />
                    {errors.cellulare && (
                      <p className="text-sm text-red-600 mt-1">{errors.cellulare.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="cliente@email.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="iban">
                      IBAN {selectedOffer?.requiresIban ? "*" : ""}
                    </Label>
                    <Input
                      id="iban"
                      {...register("iban")}
                      placeholder="IT60 X054 2811 1010 0000 0123 456"
                      style={{ textTransform: 'uppercase' }}
                    />
                    {errors.iban && (
                      <p className="text-sm text-red-600 mt-1">{errors.iban.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 3. Dettagli Documento */}
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Documento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="docRilasciatoDa">Rilasciato da *</Label>
                    <Select
                      value={watch("docRilasciatoDa")}
                      onValueChange={(value) => setValue("docRilasciatoDa", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona ente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Comune">Comune</SelectItem>
                        <SelectItem value="MC">MC</SelectItem>
                        <SelectItem value="MCTC">MCTC</SelectItem>
                        <SelectItem value="MIT UCO">MIT UCO</SelectItem>
                        <SelectItem value="Questura">Questura</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.docRilasciatoDa && (
                      <p className="text-sm text-red-600 mt-1">{errors.docRilasciatoDa.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="docNumero">Numero documento</Label>
                    <Input
                      id="docNumero"
                      {...register("docNumero")}
                      placeholder="Numero del documento"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="docRilascio">Data di rilascio *</Label>
                    <Input
                      id="docRilascio"
                      type="date"
                      {...register("docRilascio")}
                    />
                    {errors.docRilascio && (
                      <p className="text-sm text-red-600 mt-1">{errors.docRilascio.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="docScadenza">Data di scadenza *</Label>
                    <Input
                      id="docScadenza"
                      type="date"
                      {...register("docScadenza")}
                    />
                    {errors.docScadenza && (
                      <p className="text-sm text-red-600 mt-1">{errors.docScadenza.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 4. Fattura */}
            <Card>
              <CardHeader>
                <CardTitle>Fattura</CardTitle>
                <p className="text-sm text-gray-600">
                  Carica una fattura recente per estrarre i dati di residenza e fornitura
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Area */}
                {!billUploaded && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleBillUpload(e.target.files)}
                      className="hidden"
                      id="bill-upload"
                    />
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <div className="space-y-2">
                      <p className="text-gray-600">Carica fattura del cliente</p>
                      <p className="text-sm text-gray-500">PDF, JPG o PNG</p>
                      <Button
                        type="button"
                        onClick={() => document.getElementById("bill-upload")?.click()}
                        className="mt-2"
                        style={{ backgroundColor: '#F2C927', color: '#333' }}
                      >
                        Seleziona File
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Bill Previews */}
                {billPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {billPreviews.map((src, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden bg-white">
                        <img src={src} alt={`bill-${i}`} className="w-full h-32 object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Address Fields */}
                <div className="space-y-6">
                  {/* Residenza */}
                  <div>
                    <h4 className="font-medium mb-3">Indirizzo di Residenza</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="resVia">Via *</Label>
                        <Input
                          id="resVia"
                          {...register("resVia")}
                          placeholder="Via/Corso/Piazza"
                        />
                        {errors.resVia && (
                          <p className="text-sm text-red-600 mt-1">{errors.resVia.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="resCivico">Civico *</Label>
                        <Input
                          id="resCivico"
                          {...register("resCivico")}
                          placeholder="123"
                        />
                        {errors.resCivico && (
                          <p className="text-sm text-red-600 mt-1">{errors.resCivico.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="resCitta">Città *</Label>
                        <Input
                          id="resCitta"
                          {...register("resCitta")}
                          placeholder="Milano"
                        />
                        {errors.resCitta && (
                          <p className="text-sm text-red-600 mt-1">{errors.resCitta.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="resCap">CAP *</Label>
                        <Input
                          id="resCap"
                          {...register("resCap")}
                          placeholder="20100"
                        />
                        {errors.resCap && (
                          <p className="text-sm text-red-600 mt-1">{errors.resCap.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Checkbox fornitura uguale */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fornUguale"
                      checked={watchFornUguale}
                      onCheckedChange={(checked) => setValue("fornUguale", !!checked)}
                    />
                    <Label htmlFor="fornUguale" className="text-sm">
                      Fornitura uguale a residenza
                    </Label>
                  </div>
                  
                  {/* Fornitura */}
                  {!watchFornUguale && (
                    <div>
                      <h4 className="font-medium mb-3">Indirizzo di Fornitura</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fornVia">Via *</Label>
                          <Input
                            id="fornVia"
                            {...register("fornVia")}
                            placeholder="Via/Corso/Piazza"
                          />
                          {errors.fornVia && (
                            <p className="text-sm text-red-600 mt-1">{errors.fornVia.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="fornCivico">Civico *</Label>
                          <Input
                            id="fornCivico"
                            {...register("fornCivico")}
                            placeholder="123"
                          />
                          {errors.fornCivico && (
                            <p className="text-sm text-red-600 mt-1">{errors.fornCivico.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="fornCitta">Città *</Label>
                          <Input
                            id="fornCitta"
                            {...register("fornCitta")}
                            placeholder="Milano"
                          />
                          {errors.fornCitta && (
                            <p className="text-sm text-red-600 mt-1">{errors.fornCitta.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="fornCap">CAP *</Label>
                          <Input
                            id="fornCap"
                            {...register("fornCap")}
                            placeholder="20100"
                          />
                          {errors.fornCap && (
                            <p className="text-sm text-red-600 mt-1">{errors.fornCap.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* POD/PDR */}
                  <div>
                    <h4 className="font-medium mb-3">Codici di fornitura</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(selectedOffer?.commodity === "electricity" || !selectedOffer?.commodity) && (
                        <div>
                          <Label htmlFor="pod">POD {selectedOffer?.commodity === "electricity" ? "*" : ""}</Label>
                          <Input
                            id="pod"
                            {...register("pod")}
                            placeholder="IT123E45678901234567890"
                          />
                          {errors.pod && (
                            <p className="text-sm text-red-600 mt-1">{errors.pod.message}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Codice per fornitura elettrica</p>
                        </div>
                      )}

                      {(selectedOffer?.commodity === "gas" || !selectedOffer?.commodity) && (
                        <div>
                          <Label htmlFor="pdr">PDR {selectedOffer?.commodity === "gas" ? "*" : ""}</Label>
                          <Input
                            id="pdr"
                            {...register("pdr")}
                            placeholder="12345678901234"
                          />
                          {errors.pdr && (
                            <p className="text-sm text-red-600 mt-1">{errors.pdr.message}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Codice per fornitura gas</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dati tecnici luce */}
                  {selectedOffer?.commodity === "electricity" && (
                    <div>
                      <h4 className="font-medium mb-3">Dati fornitura luce</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="potenzaImpegnataKw">Potenza impegnata (kW) *</Label>
                          <Input
                            id="potenzaImpegnataKw"
                            type="number"
                            step="0.5"
                            {...register("potenzaImpegnataKw", { valueAsNumber: true })}
                            placeholder="3.0"
                          />
                          {errors.potenzaImpegnataKw && (
                            <p className="text-sm text-red-600 mt-1">{errors.potenzaImpegnataKw.message?.toString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dati tecnici gas */}
                  {selectedOffer?.commodity === "gas" && (
                    <div>
                      <h4 className="font-medium mb-3">Dati fornitura gas</h4>
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Usi del gas *</Label>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="uso-cottura"
                              checked={watch("usiGas")?.includes("cottura") || false}
                              onCheckedChange={(checked) => {
                                const currentUsi = watch("usiGas") || [];
                                if (checked) {
                                  setValue("usiGas", [...currentUsi, "cottura"]);
                                } else {
                                  setValue("usiGas", currentUsi.filter(uso => uso !== "cottura"));
                                }
                              }}
                            />
                            <Label htmlFor="uso-cottura" className="text-sm">Cottura</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="uso-riscaldamento"
                              checked={watch("usiGas")?.includes("riscaldamento") || false}
                              onCheckedChange={(checked) => {
                                const currentUsi = watch("usiGas") || [];
                                if (checked) {
                                  setValue("usiGas", [...currentUsi, "riscaldamento"]);
                                } else {
                                  setValue("usiGas", currentUsi.filter(uso => uso !== "riscaldamento"));
                                }
                              }}
                            />
                            <Label htmlFor="uso-riscaldamento" className="text-sm">Riscaldamento</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="uso-acqua-calda"
                              checked={watch("usiGas")?.includes("acqua_calda") || false}
                              onCheckedChange={(checked) => {
                                const currentUsi = watch("usiGas") || [];
                                if (checked) {
                                  setValue("usiGas", [...currentUsi, "acqua_calda"]);
                                } else {
                                  setValue("usiGas", currentUsi.filter(uso => uso !== "acqua_calda"));
                                }
                              }}
                            />
                            <Label htmlFor="uso-acqua-calda" className="text-sm">Acqua calda</Label>
                          </div>
                        </div>
                        {errors.usiGas && (
                          <p className="text-sm text-red-600 mt-1">{errors.usiGas.message?.toString()}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Residenziale radio (only if residential segment) */}
                  {selectedOffer?.segment === "residential" && (
                    <div>
                      <Label className="text-sm font-medium">Residenziale</Label>
                      <RadioGroup
                        value={watch("residenziale")}
                        onValueChange={(value) => setValue("residenziale", value as any)}
                        className="flex gap-6 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="si" id="res-si" />
                          <Label htmlFor="res-si">Sì</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="res-no" />
                          <Label htmlFor="res-no">No</Label>
                        </div>
                      </RadioGroup>
                      {errors.residenziale && (
                        <p className="text-sm text-red-600 mt-1">{errors.residenziale.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/offers")}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className="flex items-center gap-2 px-8"
                style={{ backgroundColor: '#E6007E', color: 'white' }}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Conferma e Invia Contratto
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
