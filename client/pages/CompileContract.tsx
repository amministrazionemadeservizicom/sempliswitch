import { useState, useEffect, useRef } from "react";
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
  Save,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { extractTextFromFiles, terminateOcrWorker } from "@/utils/ocr";
import { detectDocType, parseFieldsByType, DocType } from "@/utils/id-parsers";
/**
 * ⚠️ Assicurati di configurare la variabile VITE_API_BASE_URL nel file .env per puntare al backend OCR!
 * Es: VITE_API_BASE_URL="https://backend.example.com/api"
 */

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

/** Unisce due PDF in un unico File PDF */
async function mergePdfFiles(pdfA: File, pdfB: File): Promise<File> {
  const aBytes = await pdfA.arrayBuffer();
  const bBytes = await pdfB.arrayBuffer();
  const aDoc = await PDFDocument.load(aBytes);
  const bDoc = await PDFDocument.load(bBytes);
  const merged = await PDFDocument.create();
  const aPages = await merged.copyPages(aDoc, aDoc.getPageIndices());
  aPages.forEach(p => merged.addPage(p));
  const bPages = await merged.copyPages(bDoc, bDoc.getPageIndices());
  bPages.forEach(p => merged.addPage(p));
  const mergedBytes = await merged.save();
  return new File([mergedBytes], `merged_${Date.now()}.pdf`, { type: 'application/pdf' });
}

/** Normalizza dei nuovi file in un PDF e lo unisce al documento esistente */
async function appendFilesToExistingPdf(existing: File, files: FileList): Promise<File | null> {
  const newPdf = await normalizeToSinglePdf(files);
  if (!newPdf) return null;
  return await mergePdfFiles(existing, newPdf);
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
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [invoicePreviewUrls, setInvoicePreviewUrls] = useState<Record<string, string>>({});
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || "";
  const isOcrConfigured = Boolean(apiBaseUrl);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const documentAppendInputRef = useRef<HTMLInputElement>(null);

  // OCR states
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrPreviews, setOcrPreviews] = useState<string[]>([]);
  const [docType, setDocType] = useState<DocType>("UNKNOWN");

  // New OCR states for real client-side OCR
  const [docPreviews, setDocPreviews] = useState<string[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Document type selector
  type DocTypeLocal = "ci_nuova" | "ci_vecchia" | "patente" | "passaporto";
  const [selectedDocType, setSelectedDocType] = useState<DocTypeLocal>("ci_nuova");

  // Cleanup degli ObjectURL e OCR worker
  useEffect(() => {
    return () => {
      if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
      Object.values(invoicePreviewUrls).forEach(u => URL.revokeObjectURL(u));
      ocrPreviews.forEach(u => URL.revokeObjectURL(u));
      terminateOcrWorker().catch(() => {});
      // Rilascia gli URL locali
      docPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper functions for OCR autofill
  function capitalizeWords(s: string) {
    return s.toLowerCase().replace(/\b\p{L}/gu, m => m.toUpperCase());
  }

  function normalizeDate(s: string) {
    const [d, m, yRaw] = s.replace(/-/g,"/").replace(/\./g,"/").split("/");
    const y = Number(yRaw) < 100 ? `19${yRaw}` : yRaw;
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  // Image preprocessing for better OCR quality
  async function preprocessImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        // Disegno immagine in B/N
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i+1] + data[i+2]) / 3;
          const bw = avg > 140 ? 255 : 0;  // threshold
          data[i] = data[i+1] = data[i+2] = bw;
        }
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        }, "image/png");
      };
    });
  }

  // Advanced regex patterns and parsing
  function normalizeText(s: string) {
    return s.replace(/\s+/g, " ").trim();
  }

  const RX_DATE = /\b(\d{2}\/\d{2}\/\d{4})\b/;
  const RX_DATE_ALT = /\b(\d{4}-\d{2}-\d{2})\b/;
  const RX_CF = /\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/i;

  // Numeri documento
  const RX_CI_NUOVA_NUM = /\b([A-Z0-9]{9})\b/;
  const RX_CI_VECCHIA_NUM = /\b(\d{5,8}[A-Z]{0,2})\b/;
  const RX_PATENTE_NUM = /\b([A-Z]{1,2}\d{6,8})\b/;
  const RX_PASSAPORTO_NUM = /\b([A-Z]{1,2}\d{6,8}|[A-Z0-9]{9})\b/;

  // Etichette comuni
  const RX_ENTE = /\b(Rilasciata da|Emessa da|Autorità|Comune|Questura)\s*[:\-]?\s*([A-ZÀ-Ù' \-]+)/i;
  const RX_RILASCIO = /\b(Data di rilascio|Rilasciata il|Emessa il)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i;
  const RX_SCADENZA = /\b(Data di scadenza|Scadenza)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i;

  // Extra: nascita
  const RX_NASCITA = /\b(Nato a|Luogo di nascita)\s*[:\-]?\s*([A-ZÀ-Ù' \-]+)\s+il\s*(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i;

  function toIso(d: string) {
    if (/\d{2}\/\d{2}\/\d{4}/.test(d)) {
      const [gg, mm, aa] = d.split("/");
      return `${aa}-${mm}-${gg}`;
    }
    if (/\d{4}-\d{2}-\d{2}/.test(d)) return d;
    return "";
  }

  function parseNameSurname(txt: string) {
    let name = "", surname = "";
    const nm1 = txt.match(/Cognome\s*[:\-]?\s*([A-ZÀ-Ù' -]+)\s+Nome\s*[:\-]?\s*([A-ZÀ-Ù' -]+)/i);
    const nm2 = txt.match(/Nome\s*[:\-]?\s*([A-ZÀ-Ù' -]+)\s+Cognome\s*[:\-]?\s*([A-ZÀ-Ù' -]+)/i);
    if (nm1) { surname = nm1[1].trim(); name = nm1[2].trim(); }
    else if (nm2) { name = nm2[1].trim(); surname = nm2[2].trim(); }
    const cap = (s: string) => s.toLowerCase().replace(/\b([a-zà-ù'])/g, (m) => m.toUpperCase());
    return { name: name ? cap(name) : "", surname: surname ? cap(surname) : "" };
  }

  type ParsedDoc = {
    number?: string;
    issueDate?: string;
    expiryDate?: string;
    authority?: string;
    name?: string;
    surname?: string;
    cf?: string;
    birthDate?: string;
    birthPlace?: string;
  };

  function parseByDocType(docType: DocTypeLocal, raw: string): ParsedDoc {
    const t = normalizeText(raw);
    const parsed: ParsedDoc = {};

    const { name, surname } = parseNameSurname(t);
    if (name) parsed.name = name;
    if (surname) parsed.surname = surname;

    const cf = t.match(RX_CF);
    if (cf) parsed.cf = cf[1].toUpperCase();

    const ente = t.match(RX_ENTE); if (ente) parsed.authority = ente[2].trim();
    const ril = t.match(RX_RILASCIO) || t.match(RX_DATE) || t.match(RX_DATE_ALT);
    const sca = t.match(RX_SCADENZA);
    if (ril) parsed.issueDate = toIso(ril[2] || ril[1]);
    if (sca) parsed.expiryDate = toIso(sca[2] || sca[1]);

    const nasc = t.match(RX_NASCITA);
    if (nasc) {
      parsed.birthPlace = nasc[2].trim();
      parsed.birthDate = toIso(nasc[3]);
    }

    switch (docType) {
      case "ci_nuova": { const m = t.match(RX_CI_NUOVA_NUM); if (m) parsed.number = m[1]; break; }
      case "ci_vecchia": { const m = t.match(RX_CI_VECCHIA_NUM); if (m) parsed.number = m[1]; break; }
      case "patente": { const m = t.match(RX_PATENTE_NUM); if (m) parsed.number = m[1]; break; }
      case "passaporto": { const m = t.match(RX_PASSAPORTO_NUM); if (m) parsed.number = m[1]; break; }
    }

    return parsed;
  }

  // Enhanced OCR document files handler with preprocessing
  async function handleDocumentFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setOcrLoading(true);
    setOcrError(null);
    try {
      // Preprocess images for better OCR quality
      const preprocessedFiles = await Promise.all(Array.from(files).map(preprocessImage));
      const { text, previews } = await extractTextFromFiles(preprocessedFiles as File[]);
      setDocPreviews((prev) => [...prev, ...previews]);

      // Advanced parsing using selected document type
      const parsed = parseByDocType(selectedDocType, text);

      // Update form fields with extracted data
      if (parsed.name) {
        setCustomerData((p) => ({ ...p, nome: parsed.name! }));
        setDocumentData((p) => ({ ...p, nome: parsed.name! }));
      }
      if (parsed.surname) {
        setCustomerData((p) => ({ ...p, cognome: parsed.surname! }));
        setDocumentData((p) => ({ ...p, cognome: parsed.surname! }));
      }
      if (parsed.cf) {
        setCustomerData((p) => ({ ...p, cf: parsed.cf! }));
        setDocumentData((p) => ({ ...p, cf: parsed.cf! }));
      }
      if (parsed.number) {
        setDocumentData((p) => ({ ...p, numeroDocumento: parsed.number! }));
      }
      if (parsed.issueDate) {
        setDocumentData((p) => ({ ...p, dataRilascio: parsed.issueDate! }));
      }
      if (parsed.expiryDate) {
        setDocumentData((p) => ({ ...p, dataScadenza: parsed.expiryDate! }));
      }
      // Note: authority, birthDate, birthPlace would need additional fields in DocumentData interface

      console.log('Advanced OCR parsed data:', parsed);

      // Mark document as uploaded
      setDocumentUploaded(true);

    } catch (err: any) {
      console.error("OCR error:", err);
      setOcrError("Impossibile leggere il documento. Riprova con una foto più nitida.");
    } finally {
      setOcrLoading(false);
    }
  }

  function autofillFromOcr(text: string) {
    const norm = text.replace(/\s+/g, " ").trim();

    const cf = norm.match(/\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/i)?.[1];
    if (cf) {
      setCustomerData(prev => ({ ...prev, cf: cf.toUpperCase() }));
      setDocumentData(prev => ({ ...prev, cf: cf.toUpperCase() }));
    }

    const iban = norm.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/i)?.[1];
    if (iban) {
      setCustomerData(prev => ({ ...prev, iban: iban.replace(/\s/g, "").toUpperCase() }));
    }

    const nome = norm.match(/(?:Nome|Name)[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1]?.trim();
    const cognome = norm.match(/(?:Cognome|Surname)[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1]?.trim();
    if (nome) {
      const formattedNome = capitalizeWords(nome);
      setCustomerData(prev => ({ ...prev, nome: formattedNome }));
      setDocumentData(prev => ({ ...prev, nome: formattedNome }));
    }
    if (cognome) {
      const formattedCognome = capitalizeWords(cognome);
      setCustomerData(prev => ({ ...prev, cognome: formattedCognome }));
      setDocumentData(prev => ({ ...prev, cognome: formattedCognome }));
    }

    const numeroDoc = norm.match(/(?:Numero|Document)[:\s]+([A-Z0-9]+)/i)?.[1]?.trim();
    if (numeroDoc) {
      setDocumentData(prev => ({ ...prev, numeroDocumento: numeroDoc }));
    }

    const dataRilascio = norm.match(/(?:Rilasciato|Issued)[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)?.[1];
    if (dataRilascio) {
      setDocumentData(prev => ({ ...prev, dataRilascio: normalizeDate(dataRilascio) }));
    }

    const dataScadenza = norm.match(/(?:Scadenza|Expires)[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)?.[1];
    if (dataScadenza) {
      setDocumentData(prev => ({ ...prev, dataScadenza: normalizeDate(dataScadenza) }));
    }
  }

  // OCR-enabled document upload handler
  async function handleIdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    setOcrRunning(true);
    try {
      const { text, previews } = await extractTextFromFiles(files);
      setOcrText(text);

      // Clean up old previews
      ocrPreviews.forEach(u => URL.revokeObjectURL(u));
      setOcrPreviews(previews);

      // Smart document type detection and parsing
      const detected = detectDocType(text);
      setDocType(detected);
      const parsed = parseFieldsByType(detected, text);

      // Map parsed fields to form state (adapting setValue calls to current state management)
      if (parsed.nome) {
        setCustomerData(prev => ({ ...prev, nome: parsed.nome! }));
        setDocumentData(prev => ({ ...prev, nome: parsed.nome! }));
      }
      if (parsed.cognome) {
        setCustomerData(prev => ({ ...prev, cognome: parsed.cognome! }));
        setDocumentData(prev => ({ ...prev, cognome: parsed.cognome! }));
      }
      if (parsed.codiceFiscale) {
        setCustomerData(prev => ({ ...prev, cf: parsed.codiceFiscale! }));
        setDocumentData(prev => ({ ...prev, cf: parsed.codiceFiscale! }));
      }
      if (parsed.iban) {
        setCustomerData(prev => ({ ...prev, iban: parsed.iban! }));
      }
      if (parsed.numeroDocumento) {
        setDocumentData(prev => ({ ...prev, numeroDocumento: parsed.numeroDocumento! }));
      }
      if (parsed.scadenza) {
        setDocumentData(prev => ({ ...prev, dataScadenza: parsed.scadenza! }));
      }
      if (parsed.dataNascita) {
        // Add birth date to document data if we had that field
        console.log('Data nascita rilevata:', parsed.dataNascita);
      }

      // Fallback to generic OCR parsing for any missed fields
      autofillFromOcr(text);

      // Also normalize files to single PDF for upload
      const finalFile = await normalizeToSinglePdf(e.target.files!);
      if (finalFile) {
        setUploadedFiles(prev => ({ ...prev, document: finalFile as File }));
        setDocumentUploaded(true);
      }
    } catch (err) {
      console.error("OCR error", err);
      setErrors(prev => [...prev, "Errore nell'elaborazione OCR del documento."]);
    } finally {
      setOcrRunning(false);
      e.currentTarget.value = '';
    }
  }

  const handleDocumentAppend = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadedFiles.document) return; // safety
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsProcessing(true);
      const merged = await appendFilesToExistingPdf(uploadedFiles.document, files);
      if (!merged) return;
      // ricalcola l'OCR sul PDF completo per popolare nuovamente i campi
      const extracted = await processDocumentOCR(merged);
      setDocumentData(extracted);
      setCustomerData(prev => ({ ...prev, nome: extracted.nome, cognome: extracted.cognome, cf: extracted.cf }));
      setUploadedFiles(prev => ({ ...prev, document: merged }));
      const prevUrl = documentPreviewUrl;
      const newUrl = URL.createObjectURL(merged);
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      setDocumentPreviewUrl(newUrl);
    } catch (e) {
      console.error('Append documento fallito:', e);
      setErrors(prev => [...prev, "Errore nell'aggiunta pagine al documento."]);
    } finally {
      setIsProcessing(false);
      event.currentTarget.value = '';
    }
  };

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

  /** Invoca il backend OCR caricando il file come FormData.
   *  Endpoint attesi:
   *   - POST `${import.meta.env.VITE_API_BASE_URL}/ocr/document` -> DocumentData
   *   - POST `${import.meta.env.VITE_API_BASE_URL}/ocr/invoice`  -> InvoiceData
   */
  async function callOcrApi<T>(path: "/ocr/document" | "/ocr/invoice", file: File): Promise<T> {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    if (!base) {
      throw new Error("OCR non configurato (manca VITE_API_BASE_URL).");
    }
    const url = `${base}${path}`;
    const form = new FormData();
    form.append("file", file, file.name);

    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OCR API error ${res.status}: ${txt}`);
    }
    return (await res.json()) as T;
  }

  // Sostituisce il MOCK: usa l'endpoint /ocr/document
  const processDocumentOCR = async (file: File): Promise<DocumentData> => {
    try {
      // Invia SEMPRE il PDF già normalizzato/mergiato
      const data = await callOcrApi<DocumentData>("/ocr/document", file);

      // Normalizzazione/valori di sicurezza: evita undefined
      return {
        nome: data?.nome || "",
        cognome: data?.cognome || "",
        cf: data?.cf || "",
        numeroDocumento: data?.numeroDocumento || "",
        dataRilascio: data?.dataRilascio || "",
        dataScadenza: data?.dataScadenza || "",
      };
    } catch (err: any) {
      console.error("OCR documento fallito:", err);
      setErrors(prev => [...prev, err?.message || "OCR documento non disponibile. Compila i campi a mano."]);
      return {
        nome: "",
        cognome: "",
        cf: "",
        numeroDocumento: "",
        dataRilascio: "",
        dataScadenza: "",
      };
    }
  };

  // Sostituisce il MOCK: usa l'endpoint /ocr/invoice
  const processInvoiceOCR = async (file: File): Promise<InvoiceData> => {
    try {
      const data = await callOcrApi<InvoiceData>("/ocr/invoice", file);
      return {
        pod: data?.pod || "",
        indirizzoFornitura: data?.indirizzoFornitura || "",
        indirizzoFatturazione: data?.indirizzoFatturazione || "",
        kwImpegnati: data?.kwImpegnati || "",
        tensione: data?.tensione || "",
      };
    } catch (err: any) {
      console.error("OCR fattura fallito:", err);
      setErrors(prev => [...prev, err?.message || "OCR fattura non disponibile. Compila i campi a mano."]);
      return {
        pod: "",
        indirizzoFornitura: "",
        indirizzoFatturazione: "",
        kwImpegnati: "",
        tensione: "",
      };
    }
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

      const previewUrl = URL.createObjectURL(finalFile as File);
      if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
      setDocumentPreviewUrl(previewUrl);

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

      const url = URL.createObjectURL(finalFile as File);
      setInvoicePreviewUrls(prev => {
        if (prev[offerId]) URL.revokeObjectURL(prev[offerId]);
        return { ...prev, [offerId]: url };
      });

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

          {!isOcrConfigured && docPreviews.length === 0 && (
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                OCR esterno non configurato. L'OCR client-side è attivo per l'estrazione automatica dei dati dai documenti.
              </AlertDescription>
            </Alert>
          )}

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
                <p className="text-sm text-gray-600 mt-1">Puoi caricare PDF singoli o più foto; se ne carichi più di una le uniamo in un unico PDF.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Document Type Selector */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">Tipo documento:</span>
                    {(["ci_nuova","ci_vecchia","patente","passaporto"] as DocTypeLocal[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedDocType(t)}
                        className={`px-3 py-1 rounded-full border text-sm transition-colors ${
                          selectedDocType === t ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        {t.replace("_"," ")}
                      </button>
                    ))}
                  </div>

                  <div className="border-2 border-dashed rounded-xl p-5 text-center">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleDocumentFiles(e.target.files)}
                      className="hidden"
                      id="doc-upload"
                    />
                    <label
                      htmlFor="doc-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{ backgroundColor: '#F2C927', color: '#333', cursor: 'pointer' }}
                    >
                      Seleziona file (fronte/retro)
                    </label>

                    {ocrLoading && (
                      <p className="mt-3 text-sm text-gray-600">Estrazione in corso…</p>
                    )}
                    {ocrError && (
                      <p className="mt-3 text-sm text-red-600">{ocrError}</p>
                    )}
                    
                    {/* Document Type Detection */}
                    {docType !== "UNKNOWN" && (
                      <div className="text-xs text-green-600 font-medium mt-2">✓ Documento riconosciuto: {docType}</div>
                    )}
                  </div>

                  {docPreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {docPreviews.map((src, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden bg-white">
                          <img src={src} alt={`doc-${i}`} className="w-full h-36 object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <label
                      htmlFor="doc-upload"
                      className="text-sm underline cursor-pointer"
                    >
                      Aggiungi un altro file
                    </label>
                  </div>
                </div>
                
                {/* Document data fields - show when document is uploaded */}
                {documentUploaded && (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 text-green-700 mb-3">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Documento elaborato con OCR avanzato ({selectedDocType.replace("_", " ")})</span>
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
                          onChange={(e) => handleInvoiceUpload(e, offer.id)}
                          className="hidden"
                          id={`invoice-upload-${offer.id}`}
                        />
                        <Button
                          type="button"
                          onClick={() => document.getElementById(`invoice-upload-${offer.id}`)?.click()}
                          style={{ backgroundColor: '#F2C927', color: '#333333' }}
                          className="cursor-pointer"
                        >
                          Seleziona File
                        </Button>
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
                      <div className="mt-4 flex items-center gap-3">
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            try {
                              setIsProcessing(true);
                              const existing = uploadedFiles.invoices[offer.id];
                              if (!existing) return;
                              const merged = await appendFilesToExistingPdf(existing, files);
                              if (!merged) return;
                              // OCR mock sulla versione completa della fattura
                              const extracted = await processInvoiceOCR(merged);
                              setInvoiceData(prev => ({ ...prev, [offer.id]: extracted }));
                              setUploadedFiles(prev => ({
                                ...prev,
                                invoices: { ...prev.invoices, [offer.id]: merged }
                              }));
                              setInvoicePreviewUrls(prev => {
                                if (prev[offer.id]) URL.revokeObjectURL(prev[offer.id]);
                                const newUrl = URL.createObjectURL(merged);
                                return { ...prev, [offer.id]: newUrl };
                              });
                            } catch (err) {
                              console.error('Append fattura fallito:', err);
                              setErrors(prev => [...prev, "Errore nell'aggiunta pagine alla fattura."]);
                            } finally {
                              setIsProcessing(false);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="hidden"
                          id={`invoice-append-${offer.id}`}
                        />
                        <Button
                          type="button"
                          onClick={() => document.getElementById(`invoice-append-${offer.id}`)?.click()}
                          style={{ backgroundColor: '#F2C927', color: '#333333' }}
                        >
                          Aggiungi pagine fattura
                        </Button>
                      </div>
                      {invoicePreviewUrls[offer.id] && (
                        <div className="mt-4">
                          <Label>Anteprima fattura</Label>
                          <div className="mt-2 border rounded-lg overflow-hidden">
                            <iframe src={invoicePreviewUrls[offer.id]} title={`Anteprima fattura ${offer.id}`} className="w-full h-72" />
                          </div>
                          <div className="mt-2">
                            <a href={invoicePreviewUrls[offer.id]} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm underline text-blue-700">
                              Apri in nuova scheda <ExternalLink className="h-4 w-4 ml-1" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </CustomCard>
            ))}

            {/* Processing Indicator */}
            {(isProcessing || ocrRunning || ocrLoading) && (
              <Alert className="border-blue-200 bg-blue-50">
                <Camera className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-600">
                  {ocrLoading ? "Estrazione dati in corso con OCR avanzato..." : 
                   ocrRunning ? "Estrazione dati in corso con OCR..." : "Elaborazione documento in corso..."}
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
