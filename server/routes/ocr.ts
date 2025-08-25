import { Request, Response } from "express";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import * as fileUpload from "express-fileupload";

// Extend Express Request type to include files
interface RequestWithFiles extends Request {
  files?: { [name: string]: fileUpload.UploadedFile | fileUpload.UploadedFile[] } | null | undefined;
}

// Local document parsing utilities
type DocType = "CIE" | "CARTA_VECCHIA" | "PATENTE" | "PASSAPORTO" | "UNKNOWN";

type ParsedFields = {
  nome?: string;
  cognome?: string;
  dataNascita?: string;
  luogoNascita?: string;
  codiceFiscale?: string;
  numeroDocumento?: string;
  scadenza?: string;
  iban?: string;
  conf?: number;
};

function detectDocType(ocrText: string): DocType {
  const t = ocrText.toUpperCase();
  const hasMrzTd1 = /[\r\n]ID[A-Z0-9<]{25,}[\r\n][A-Z0-9<]{25,}[\r\n][A-Z0-9<]{25,}/.test(t);
  const hasMrzTd3 = /[\r\n]P<.*/.test(t);
  if (hasMrzTd1 || t.includes("CARTA D'IDENTIT") || t.includes("CARTA DI IDENTIT")) return "CIE";
  if (hasMrzTd3 || t.includes("PASSAPORTO") || t.includes("PASSPORT")) return "PASSAPORTO";
  if (t.includes("PATENTE DI GUIDA") || t.includes("DRIVING LICENCE")) return "PATENTE";
  if (t.includes("COMUNE DI") || t.includes("RILASCIATA IL")) return "CARTA_VECCHIA";
  return "UNKNOWN";
}

function toIsoDateLike(s?: string) {
  if (!s) return undefined;
  const m = s.replace(/[-.]/g,"/").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return undefined;
  const [ , d, mo, yRaw ] = m;
  const y = Number(yRaw) < 100 ? (Number(yRaw) + 1900) : Number(yRaw);
  const mm = String(mo).padStart(2,"0");
  const dd = String(d).padStart(2,"0");
  return `${y}-${mm}-${dd}`;
}

// Helper function to extract clean field values
function extractCleanField(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;

  let value = match[1].trim();

  // Skip descriptive/instructional text
  const skipPatterns = [
    /^E NOME DEL/i,
    /^DEL PADRE/i,
    /^DELLA MADRE/i,
    /^O DI CHI/i,
    /^NE FA LE VECI/i,
    /^LUOGO E DATA/i,
    /^DI NASCITA/i,
    /^VALIDA PER/i,
    /^FINO AL/i,
    /^CITTADINANZA/i,
    /^STATURA/i,
    /^DOCUMENTO/i,
    /^RILASCIATO/i
  ];

  if (skipPatterns.some(pattern => pattern.test(value))) {
    return undefined;
  }

  // Stop at common separators or new field indicators
  value = value.split(/\b(?:COGNOME|NOME|NATO|RILASCIATO|SCADENZA|CITTADINANZA|STATURA)\b/i)[0].trim();

  // Must be reasonable length and not all caps descriptive text
  if (value.length < 2 || value.length > 50) return undefined;
  if (value.length > 20 && value === value.toUpperCase()) return undefined;

  return value;
}

function parseFieldsByType(type: DocType, text: string): ParsedFields {
  const t = text.replace(/\s+/g," ").trim();
  const CF_RE = /\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/;

  // Improved parsing for all document types
  const nome = extractCleanField(t, /\bNOME[:\s]+([A-ZÀ-Ù' -]+)/i);
  const cognome = extractCleanField(t, /\bCOGNOME[:\s]+([A-ZÀ-Ù' -]+)/i);
  const dataNascita = toIsoDateLike(t.match(/NATO.*?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]);
  const scadenza = toIsoDateLike(t.match(/SCADENZA[:\s]+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]);
  const codiceFiscale = t.match(CF_RE)?.[1]?.toUpperCase();

  let numeroDocumento;
  if (type === "PATENTE") {
    numeroDocumento = t.match(/N\.\s*PATENTE[:\s]*([A-Z0-9/-]+)/i)?.[1] || t.match(/\b([A-Z0-9]{8,})\b/)?.[1];
  } else if (type === "PASSAPORTO") {
    numeroDocumento = t.match(/N\.\s*PASSAPORTO[:\s]*([A-Z0-9/-]+)/i)?.[1];
  } else {
    numeroDocumento = t.match(/N\.\s*([A-Z0-9/-]+)/i)?.[1];
  }

  return {
    nome,
    cognome,
    dataNascita,
    scadenza,
    numeroDocumento: numeroDocumento || undefined,
    codiceFiscale,
    conf: 0.6
  };
}

// Initialize Google Cloud Vision client with credentials from environment
let visionClient: ImageAnnotatorClient;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Use credentials from environment variable (production/secure setup)
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    visionClient = new ImageAnnotatorClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id
    });
    console.log('✅ Google Cloud Vision initialized with environment credentials');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use credentials from file path (fallback for local development)
    visionClient = new ImageAnnotatorClient();
    console.log('✅ Google Cloud Vision initialized with file credentials');
  } else {
    throw new Error('No Google Cloud credentials found');
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Cloud Vision:', error);
  // We'll handle this error in the endpoints
}

// Helper function to extract text from image buffer
async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  if (!visionClient) {
    throw new Error("Google Cloud Vision is not properly configured");
  }

  try {
    const [result] = await visionClient.textDetection({
      image: { content: buffer }
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      throw new Error("No text detected in image");
    }

    return detections[0]?.description || "";
  } catch (error) {
    console.error("Google Vision OCR error:", error);
    throw new Error("Failed to process image with Google Vision");
  }
}

// Helper function to parse bill data
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

// OCR endpoint for identity documents
export const handleDocumentOCR = async (req: RequestWithFiles, res: Response) => {
  try {
    if (!req.files || !('file' in req.files)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;

    if (!file.data) {
      return res.status(400).json({ error: "Invalid file data" });
    }

    // Check if Google Cloud Vision is properly configured
    if (!visionClient) {
      console.error("Google Cloud Vision not configured, returning error to trigger client fallback");
      return res.status(503).json({
        error: "Google Cloud Vision not configured",
        details: "OCR service temporarily unavailable"
      });
    }

    // Extract text using Google Cloud Vision
    const extractedText = await extractTextFromBuffer(file.data);

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "No text detected in document" });
    }

    // Detect document type and parse fields
    const detectedType = detectDocType(extractedText);
    const parsedFields = parseFieldsByType(detectedType, extractedText);

    res.json({
      text: extractedText,
      detectedType,
      parsedFields,
      confidence: parsedFields.conf || 0.8 // Google Vision generally has high confidence
    });

  } catch (error: any) {
    console.error("Document OCR error:", error);
    res.status(500).json({
      error: "OCR processing failed",
      details: error.message
    });
  }
};

// OCR endpoint for bills/invoices
export const handleBillOCR = async (req: RequestWithFiles, res: Response) => {
  try {
    if (!req.files || !('file' in req.files)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;

    if (!file.data) {
      return res.status(400).json({ error: "Invalid file data" });
    }

    // Check if Google Cloud Vision is properly configured
    if (!visionClient) {
      console.error("Google Cloud Vision not configured, returning error to trigger client fallback");
      return res.status(503).json({
        error: "Google Cloud Vision not configured",
        details: "OCR service temporarily unavailable"
      });
    }

    // Extract text using Google Cloud Vision
    const extractedText = await extractTextFromBuffer(file.data);

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "No text detected in bill" });
    }

    // Parse bill data
    const { addr, capCitta, pod, pdr, potenzaImpegnata } = parseBillData(extractedText);

    // Try to extract addresses
    const residenzaAddr = addr("RESIDENZA") || addr("DOMICILIO") || addr("INTESTATARIO");
    const fornituraAddr = addr("FORNITURA") || addr("UTENZA") || addr("CONTATORE");
    const location = capCitta();

    res.json({
      text: extractedText,
      data: {
        residenza: residenzaAddr ? {
          via: residenzaAddr.via,
          civico: residenzaAddr.civico,
          cap: location?.cap,
          citta: location?.citta
        } : null,
        fornitura: fornituraAddr ? {
          via: fornituraAddr.via,
          civico: fornituraAddr.civico,
          cap: location?.cap,
          citta: location?.citta
        } : null,
        pod,
        pdr,
        potenzaImpegnata
      }
    });

  } catch (error: any) {
    console.error("Bill OCR error:", error);
    res.status(500).json({
      error: "OCR processing failed",
      details: error.message
    });
  }
};
