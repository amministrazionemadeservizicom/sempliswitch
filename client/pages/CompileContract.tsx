import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload,
  FileText,
  User,
  Phone,
  Mail,
  CreditCard,
  Camera,
  CheckCircle,
  AlertTriangle,
  X,
  Save
} from "lucide-react";

/** Converte una o più immagini (File) in un unico Blob PDF */
async function imagesToSinglePdf(images: File[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const imgFile of images) {
    const bytes = await imgFile.arrayBuffer();
    const isPng = imgFile.type.includes('png');
    const embedded = isPng
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

    const { width, height } = embedded.size();
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/** Normalizza una selezione eterogenea (PDF e/o immagini multiple) in UN file finale:
  - se c'è 1 PDF e basta -> torna il PDF
  - se ci sono più PDF -> (per ora) prendi il primo (comportamento semplice, NON mergiare PDF-PDF)
  - se ci sono una o più immagini -> uniscile in un PDF
  - se ci sono PDF+immagini -> priorità alle immagini unite (unico PDF) */
async function normalizeToSinglePdf(files: FileList): Promise<File | null> {
  if (!files || files.length === 0) return null;

  const all = Array.from(files);
  const pdfs = all.filter(f => f.type === 'application/pdf');
  const images = all.filter(f => f.type.startsWith('image/'));

  // Caso: solo immagini → crea un PDF unico
  if (images.length > 0 && pdfs.length === 0) {
    const mergedBlob = await imagesToSinglePdf(images);
    return new File([mergedBlob], `scan_${Date.now()}.pdf`, { type: 'application/pdf' });
  }

  // Caso: solo PDF → prendi il primo (comportamento semplice)
  if (pdfs.length > 0 && images.length === 0) {
    return pdfs[0];
  }

  // Caso: PDF + immagini → usa il PDF creato dalle immagini (di solito è lo scenario "scansioni")
  if (images.length > 0 && pdfs.length > 0) {
    const mergedBlob = await imagesToSinglePdf(images);
    return new File([mergedBlob], `scan_${Date.now()}.pdf`, { type: 'application/pdf' });
  }

  return null;
}

interface Offer {
  id: string;
  name: string;
  brand: string;
  serviceType: string;
  customerType: string;
  price: string;
}

interface CustomerData {
  nome: string;
  cognome: string;
  cf: string;
  cellulare: string;
  email: string;
  iban: string;
}

interface DocumentData {
  nome: string;
  cognome: string;
  cf: string;
  numeroDocumento: string;
  dataRilascio: string;
  dataScadenza: string;
}

interface InvoiceData {
  pod: string;
  indirizzoFornitura: string;
  indirizzoFatturazione: string;
  kwImpegnati: string;
  tensione: string;
}

interface ContractData {
  cliente: CustomerData;
  documento: string;
  offerte: Array<{
    id_offerta: string;
    fattura: string;
    dati_fattura: InvoiceData;
  }>;
}

function CustomCard(
  { children, className = "" }: { children: React.ReactNode; className?: string }
) {
  return (
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
}

export default function CompileContract() {
  const navigate = useNavigate();
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [customerData, setCustomerData] = useState<CustomerData>({
    nome: "",
    cognome: "",
    cf: "",
    cellulare: "",
    email: "",
    iban: ""
  });

  const [documentData, setDocumentData] = useState<DocumentData>({
    nome: "",
    cognome: "",
    cf: "",
    numeroDocumento: "",
    dataRilascio: "",
    dataScadenza: ""
  });

  const [invoiceData, setInvoiceData] = useState<Record<string, InvoiceData>>({});
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [invoicesUploaded, setInvoicesUploaded] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{
    document?: File;
    invoices: Record<string, File>;
  }>({ invoices: {} });

  // Load offers from localStorage and check if should redirect
  useEffect(() => {
    const loadOffers = () => {
      try {
        // First check for "selectedOffer" key
        const selectedOffer = localStorage.getItem("selectedOffer");
        if (selectedOffer) {
          const parsed = JSON.parse(selectedOffer);
          // Transform into array with single element
          const offerArray = Array.isArray(parsed) ? parsed : [parsed];
          setSelectedOffers(offerArray);
          console.log("[CompileContract] trovata chiave selectedOffer:", offerArray);
          return;
        }

        // 🔎 1) Prova più chiavi comuni
        const possibleKeys = ["selectedOffers", "selected_offers", "cart", "carrello"];
        let raw: string | null = null;
        for (const k of possibleKeys) {
          const v = localStorage.getItem(k);
          if (v) {
            raw = v;
            console.log("[CompileContract] trovata chiave localStorage:", k);
            break;
          }
        }

        if (!raw) {
          console.warn("[CompileContract] Nessuna chiave trovata in localStorage (selectedOffers/cart).");
          setSelectedOffers([]);
          return;
        }

        let parsed = JSON.parse(raw);

        // 2) Se qualcuno ha salvato un singolo oggetto invece di un array
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }

        // 3) Mappatura robusta dei campi più comuni
        const mapped: Offer[] = parsed
          .map((offer: any) => {
            if (!offer) return null;

            const id =
              offer.id ?? offer.offerId ?? offer.uid ?? offer._id ?? `${offer.brand || offer.gestore || "offer"}-${offer.nome || offer.name || Date.now()}`;

            const name =
              offer.name ?? offer.nome ?? offer.titolo ?? "Offerta";

            const brand =
              offer.brand ?? offer.gestore ?? offer.marca ?? "Gestore";

            const serviceType =
              offer.serviceType ?? offer.tipo ?? offer.tipologia ?? offer.supplyType ?? "servizio";

            const customerType =
              offer.customerType ?? offer.tipoCliente ?? offer.segmento ?? "residenziale";

            const price =
              offer.price ?? offer.prezzo ?? offer.costo ?? "";

            return { id, name, brand, serviceType, customerType, price } as Offer;
          })
          .filter(Boolean);

        console.log("[CompileContract] Offerte mappate:", mapped);

        setSelectedOffers(mapped);
      } catch (error) {
        console.error("[CompileContract] Errore nel parse/mapping localStorage:", error);
        setSelectedOffers([]);
      } finally {
        setIsLoaded(true);
      }
    };

    loadOffers();
  }, []);

  // Check if user has selected offers, redirect if not (after loading)
  useEffect(() => {
    if (isLoaded && selectedOffers.length === 0) {
      navigate("/offers");
    }
  }, [selectedOffers, navigate, isLoaded]);

  // Mock OCR function for document processing
  const processDocumentOCR = async (file: File): Promise<DocumentData> => {
    setIsProcessing(true);
    
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock OCR extracted data
    const mockData: DocumentData = {
      nome: "Mario",
      cognome: "Rossi",
      cf: "RSSMRA80A01H501X",
      numeroDocumento: "AX1234567",
      dataRilascio: "15/01/2020",
      dataScadenza: "15/01/2030"
    };
    
    setIsProcessing(false);
    return mockData;
  };

  // Mock OCR function for invoice processing
  const processInvoiceOCR = async (file: File): Promise<InvoiceData> => {
    setIsProcessing(true);
    
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock OCR extracted data
    const mockData: InvoiceData = {
      pod: "IT001E12345678",
      indirizzoFornitura: "Via Roma 123, Milano",
      indirizzoFatturazione: "Via Roma 123, Milano",
      kwImpegnati: "3.0",
      tensione: "230V"
    };
    
    setIsProcessing(false);
    return mockData;
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      // Normalizza la selezione a UN solo file PDF finale (merge se necess.)
      const finalFile = await normalizeToSinglePdf(files);
      if (!finalFile) return;

      // Valida dimensione (max 10MB per sicurezza, puoi tenere 5MB se vuoi)
      const MAX = 10 * 1024 * 1024;
      if (finalFile.size > MAX) {
        setErrors(prev => [...prev, "File troppo grande. Massimo 10MB."]);
        return;
      }

      // Esegui l'OCR mock come già fai oggi, passando il PDF finale
      setIsProcessing(true);
      const extractedData = await processDocumentOCR(finalFile as File);

      setDocumentData(extractedData);
      setCustomerData(prev => ({
        ...prev,
        nome: extractedData.nome,
        cognome: extractedData.cognome,
        cf: extractedData.cf
      }));

      // Salva il file finale per l'upload sicuro più avanti
      setUploadedFiles(prev => ({ ...prev, document: finalFile as File }));
      setDocumentUploaded(true);
    } catch (err) {
      console.error("Errore upload documento:", err);
      setErrors(prev => [...prev, "Errore nell'elaborazione del documento."]);
    } finally {
      setIsProcessing(false);
      // reset del value per permettere nuovo stesso file
      event.currentTarget.value = "";
    }
  };

  const handleInvoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>, offerId: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      // Normalizza la selezione a UN PDF
      const finalFile = await normalizeToSinglePdf(files);
      if (!finalFile) return;

      const MAX = 10 * 1024 * 1024;
      if (finalFile.size > MAX) {
        setErrors(prev => [...prev, "File troppo grande. Massimo 10MB."]);
        return;
      }

      setIsProcessing(true);

      // OCR mock come oggi
      const extractedData = await processInvoiceOCR(finalFile as File);
      setInvoiceData(prev => ({ ...prev, [offerId]: extractedData }));

      // Salva file per upload sicuro
      setUploadedFiles(prev => ({
        ...prev,
        invoices: { ...prev.invoices, [offerId]: finalFile as File }
      }));

      setInvoicesUploaded(new Set([...invoicesUploaded, offerId]));
    } catch (err) {
      console.error("Errore upload fattura:", err);
      setErrors(prev => [...prev, "Errore nell'elaborazione della fattura."]);
    } finally {
      setIsProcessing(false);
      event.currentTarget.value = "";
    }
  };

  const updateCustomerData = (field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const updateDocumentData = (field: keyof DocumentData, value: string) => {
    setDocumentData(prev => ({ ...prev, [field]: value }));
  };

  const updateInvoiceData = (offerId: string, field: keyof InvoiceData, value: string) => {
    setInvoiceData(prev => ({
      ...prev,
      [offerId]: {
        ...prev[offerId],
        [field]: value
      }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    // Check required customer fields
    if (!customerData.nome) newErrors.push("Nome obbligatorio");
    if (!customerData.cognome) newErrors.push("Cognome obbligatorio");
    if (!customerData.cellulare) newErrors.push("Cellulare obbligatorio");
    if (!customerData.email) newErrors.push("Email obbligatoria");
    if (!customerData.iban) newErrors.push("IBAN obbligatorio");
    
    // Check document upload
    if (!documentUploaded) newErrors.push("Documento d'identità obbligatorio");
    
    // Check invoice uploads
    for (const offer of selectedOffers) {
      if (!invoicesUploaded.has(offer.id)) {
        newErrors.push(`Fattura obbligatoria per ${offer.name}`);
      }
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Simulate secure file upload to cloud storage
  const uploadToSecureStorage = async (file: File, type: 'document' | 'invoice', clientId: string): Promise<string> => {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In real implementation, this would upload to:
    // - Firebase Storage
    // - Supabase Storage
    // - Google Drive via Make.com automation
    // - AWS S3 with proper encryption

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const secureUrl = `https://secure-storage.app/contracts/${clientId}/${type}/${timestamp}_${sanitizedFileName}`;

    console.log(`File uploaded to secure storage: ${secureUrl}`);
    return secureUrl;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      // Upload document to secure storage
      const documentUrl = uploadedFiles.document
        ? await uploadToSecureStorage(uploadedFiles.document, 'document', customerData.cf)
        : '';

      // Upload invoices to secure storage
      const invoiceUrls: Record<string, string> = {};
      for (const offer of selectedOffers) {
        if (uploadedFiles.invoices[offer.id]) {
          invoiceUrls[offer.id] = await uploadToSecureStorage(
            uploadedFiles.invoices[offer.id],
            'invoice',
            customerData.cf
          );
        }
      }

      const contractData: ContractData = {
        cliente: customerData,
        documento: documentUrl,
        offerte: selectedOffers.map(offer => ({
          id_offerta: offer.id,
          fattura: invoiceUrls[offer.id],
          dati_fattura: invoiceData[offer.id] || {
            pod: "",
            indirizzoFornitura: "",
            indirizzoFatturazione: "",
            kwImpegnati: "",
            tensione: ""
          }
        }))
      };

      // Save contract to database (simulate)
      console.log("Contract data saved:", contractData);

      // Save to localStorage for demo (in real app would be database)
      const existingContracts = JSON.parse(localStorage.getItem('contracts') || '[]');
      const newContract = {
        ...contractData,
        id: Date.now().toString(),
        consulenteId: 'user1', // Current user ID
        stato: 'da_verificare',
        dataCreazione: new Date().toISOString(),
        ultimaModifica: new Date().toISOString()
      };
      existingContracts.push(newContract);
      localStorage.setItem('contracts', JSON.stringify(existingContracts));

      // Reset cart
      localStorage.removeItem('selectedOffers');
      localStorage.removeItem('selectedOffer');

      // Show success message
      alert("✅ Contratto inviato con successo!");

      // Navigate to contracts page
      navigate("/contracts");

    } catch (error) {
      console.error("Error submitting contract:", error);
      setErrors([...errors, "Errore nell'invio del contratto. Riprova."]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render anything until data is loaded
  if (!isLoaded) {
    return null;
  }

  // If no offers after loading, useEffect will handle redirect
  if (selectedOffers.length === 0) {
    return null;
  }

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
          <CustomCard className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Offerte Selezionate ({selectedOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedOffers.map(offer => (
                  <div key={offer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <div className="font-medium">{offer.name}</div>
                      <div className="text-sm text-gray-500">{offer.brand} - {offer.serviceType}</div>
                    </div>
                    <Badge variant="outline">{offer.price}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </CustomCard>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-8">
            {/* Customer Data */}
            <CustomCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dati Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={customerData.nome}
                      onChange={(e) => updateCustomerData('nome', e.target.value)}
                      placeholder="Nome del cliente"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cognome">Cognome *</Label>
                    <Input
                      id="cognome"
                      value={customerData.cognome}
                      onChange={(e) => updateCustomerData('cognome', e.target.value)}
                      placeholder="Cognome del cliente"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cf">Codice Fiscale</Label>
                    <Input
                      id="cf"
                      value={customerData.cf}
                      onChange={(e) => updateCustomerData('cf', e.target.value)}
                      placeholder="Codice fiscale"
                      disabled={documentUploaded}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cellulare">Cellulare *</Label>
                    <Input
                      id="cellulare"
                      value={customerData.cellulare}
                      onChange={(e) => updateCustomerData('cellulare', e.target.value)}
                      placeholder="+39 123 456 7890"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => updateCustomerData('email', e.target.value)}
                      placeholder="cliente@email.com"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="iban">IBAN *</Label>
                    <Input
                      id="iban"
                      value={customerData.iban}
                      onChange={(e) => updateCustomerData('iban', e.target.value)}
                      placeholder="IT60 X054 2811 1010 0000 0123 456"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </CardContent>
            </CustomCard>

            {/* Document Upload */}
            <CustomCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Documento d'Identità
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!documentUploaded ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <div className="space-y-2">
                      <p className="text-gray-600">Carica documento d'identità</p>
                      <p className="text-sm text-gray-500">PDF, JPG o PNG - Max 10MB</p>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        multiple
                        capture="environment"
                        onChange={handleDocumentUpload}
                        className="hidden"
                        id="document-upload"
                      />
                      <label htmlFor="document-upload">
                        <Button 
                          type="button"
                          style={{ backgroundColor: '#F2C927', color: '#333333' }}
                          className="cursor-pointer"
                        >
                          Seleziona File
                        </Button>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 mb-3">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Documento caricato e processato</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="doc-numero">Numero Documento</Label>
                        <Input
                          id="doc-numero"
                          value={documentData.numeroDocumento}
                          onChange={(e) => updateDocumentData('numeroDocumento', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-rilascio">Data Rilascio</Label>
                        <Input
                          id="doc-rilascio"
                          value={documentData.dataRilascio}
                          onChange={(e) => updateDocumentData('dataRilascio', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-scadenza">Data Scadenza</Label>
                        <Input
                          id="doc-scadenza"
                          value={documentData.dataScadenza}
                          onChange={(e) => updateDocumentData('dataScadenza', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </CustomCard>

            {/* Invoice Uploads */}
            {selectedOffers.map(offer => (
              <CustomCard key={offer.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Fattura
                  </CardTitle>
                  <p className="text-sm text-gray-600">Carica una fattura recente del cliente</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!invoicesUploaded.has(offer.id) ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <div className="space-y-2">
                        <p className="text-gray-600">Carica una fattura recente del cliente</p>
                        <p className="text-sm text-gray-500">PDF, JPG o PNG - Max 10MB</p>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          capture="environment"
                          onChange={(e) => handleInvoiceUpload(e, offer.id)}
                          className="hidden"
                          id={`invoice-upload-${offer.id}`}
                        />
                        <label htmlFor={`invoice-upload-${offer.id}`}>
                          <Button 
                            type="button"
                            style={{ backgroundColor: '#F2C927', color: '#333333' }}
                            className="cursor-pointer"
                          >
                            Seleziona File
                          </Button>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-3">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Fattura caricata e processata</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`pod-${offer.id}`}>POD</Label>
                          <Input
                            id={`pod-${offer.id}`}
                            value={invoiceData[offer.id]?.pod || ''}
                            onChange={(e) => updateInvoiceData(offer.id, 'pod', e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`kw-${offer.id}`}>kW Impegnati</Label>
                          <Input
                            id={`kw-${offer.id}`}
                            value={invoiceData[offer.id]?.kwImpegnati || ''}
                            onChange={(e) => updateInvoiceData(offer.id, 'kwImpegnati', e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor={`fornitura-${offer.id}`}>Indirizzo Fornitura</Label>
                          <Input
                            id={`fornitura-${offer.id}`}
                            value={invoiceData[offer.id]?.indirizzoFornitura || ''}
                            onChange={(e) => updateInvoiceData(offer.id, 'indirizzoFornitura', e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor={`fatturazione-${offer.id}`}>Indirizzo Fatturazione</Label>
                          <Input
                            id={`fatturazione-${offer.id}`}
                            value={invoiceData[offer.id]?.indirizzoFatturazione || ''}
                            onChange={(e) => updateInvoiceData(offer.id, 'indirizzoFatturazione', e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CustomCard>
            ))}

            {/* Processing Indicator */}
            {isProcessing && (
              <Alert className="border-blue-200 bg-blue-50">
                <Camera className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-600">
                  Elaborazione documento in corso con OCR...
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/offers")}
              >
                Annulla
              </Button>
              <Button
                onClick={handleSubmit}
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
