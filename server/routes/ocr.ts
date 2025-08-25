import { RequestHandler } from "express";
import vision from "@google-cloud/vision";
import { detectDocType, parseFieldsByType } from "../../client/utils/id-parsers";

// Initialize Google Cloud Vision client with credentials from environment
let visionClient: vision.ImageAnnotatorClient;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Use credentials from environment variable (production/secure setup)
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id
    });
    console.log('✅ Google Cloud Vision initialized with environment credentials');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use credentials from file path (fallback for local development)
    visionClient = new vision.ImageAnnotatorClient();
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
export const handleDocumentOCR: RequestHandler = async (req, res) => {
  try {
    if (!req.files || !('file' in req.files)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
    
    if (!file.data) {
      return res.status(400).json({ error: "Invalid file data" });
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
export const handleBillOCR: RequestHandler = async (req, res) => {
  try {
    if (!req.files || !('file' in req.files)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
    
    if (!file.data) {
      return res.status(400).json({ error: "Invalid file data" });
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
