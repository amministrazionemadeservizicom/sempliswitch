import { extractTextFromFiles as tesseractOCR } from "./ocr";

export interface GoogleOCRDocumentResponse {
  text: string;
  detectedType: string;
  parsedFields: {
    nome?: string;
    cognome?: string;
    codiceFiscale?: string;
    numeroDocumento?: string;
    scadenza?: string;
    dataNascita?: string;
    conf?: number;
  };
  confidence: number;
}

export interface GoogleOCRBillResponse {
  text: string;
  data: {
    residenza?: {
      via: string;
      civico: string;
      cap?: string;
      citta?: string;
    } | null;
    fornitura?: {
      via: string;
      civico: string;
      cap?: string;
      citta?: string;
    } | null;
    pod?: string;
    pdr?: string;
    potenzaImpegnata?: number;
  };
}

// Convert File to FormData for upload
function createFormData(files: File[]): FormData {
  const formData = new FormData();
  
  if (files.length === 1) {
    formData.append('file', files[0]);
  } else {
    // For multiple files, we'll send the first one to Google OCR
    // TODO: Handle multiple files better (merge or process separately)
    formData.append('file', files[0]);
  }
  
  return formData;
}

// Google OCR for documents with fallback to Tesseract
export async function extractDocumentData(files: File[]): Promise<{
  text: string;
  parsedFields: any;
  detectedType: string;
  previews: string[];
  source: 'google' | 'tesseract';
}> {
  const previews = files.map(file => URL.createObjectURL(file));

  try {
    // Try Google OCR first with timeout
    const formData = createFormData(files);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch('/api/ocr/document', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result: GoogleOCRDocumentResponse = await response.json();

      return {
        text: result.text,
        parsedFields: result.parsedFields,
        detectedType: result.detectedType,
        previews,
        source: 'google'
      };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn('Google OCR failed:', response.status, errorText);
      throw new Error(`Google OCR failed: ${response.status}`);
    }
  } catch (googleError) {
    console.warn('Google OCR error:', googleError);

    try {
      // Fallback to Tesseract.js client-side OCR
      console.log('Falling back to Tesseract.js...');
      const { text, previews: tesseractPreviews } = await tesseractOCR(files);

      return {
        text,
        parsedFields: {}, // Tesseract doesn't parse fields directly
        detectedType: 'UNKNOWN',
        previews: tesseractPreviews.length > 0 ? tesseractPreviews : previews,
        source: 'tesseract'
      };
    } catch (tesseractError) {
      console.error('Both Google OCR and Tesseract failed:', tesseractError);
      throw new Error('OCR processing failed with both Google and Tesseract');
    }
  }
}

// Google OCR for bills with fallback to Tesseract
export async function extractBillData(files: File[]): Promise<{
  text: string;
  data: any;
  previews: string[];
  source: 'google' | 'tesseract';
}> {
  const previews = files.map(file => URL.createObjectURL(file));
  
  try {
    // Try Google OCR first
    const formData = createFormData(files);
    
    const response = await fetch('/api/ocr/bill', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result: GoogleOCRBillResponse = await response.json();
      
      return {
        text: result.text,
        data: result.data,
        previews,
        source: 'google'
      };
    } else {
      console.warn('Google OCR failed, falling back to Tesseract');
      throw new Error('Google OCR failed');
    }
  } catch (googleError) {
    console.warn('Google OCR error:', googleError);
    
    try {
      // Fallback to Tesseract.js client-side OCR
      const { text, previews: tesseractPreviews } = await tesseractOCR(files);
      
      // Basic parsing with existing client-side logic
      const basicData = {
        text: text,
        // Add basic parsing here if needed
      };
      
      return {
        text,
        data: basicData,
        previews: tesseractPreviews.length > 0 ? tesseractPreviews : previews,
        source: 'tesseract'
      };
    } catch (tesseractError) {
      console.error('Both Google OCR and Tesseract failed:', tesseractError);
      throw new Error('OCR processing failed with both Google and Tesseract');
    }
  }
}

// Helper function to check if Google OCR is available
export async function isGoogleOCRAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/ping');
    return response.ok;
  } catch {
    return false;
  }
}
