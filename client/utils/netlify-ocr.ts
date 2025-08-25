// Fallback imports for local OCR when Netlify is not available
import { extractTextFromFiles } from './ocr';
import { detectDocType, parseFieldsByType } from './id-parsers';

// Types only import to avoid conflicts
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

const OCR_ENDPOINT = 'https://sempliswitch.it/.netlify/functions/ocr';

// Removed testNetlifyEndpoint - we'll try directly and fallback on error

// OCR for identity documents using Netlify Functions
export async function processDocumentOCR(files: File[]): Promise<{
  text: string;
  parsed: ParsedFields;
  previews: string[];
}> {
  // Create previews for all files first
  const previews = await Promise.all(
    files.map(f => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
      });
    })
  );

  // Try Netlify OCR first (now properly configured)
  try {
    console.log('📤 Tentativo OCR Netlify...');

    // Prepare multipart form data
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });

    // Call Netlify function with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OCR request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 Risposta Netlify OCR:', result);

    if (!result.ok) {
      throw new Error(result.error || 'OCR failed');
    }

    const { text, fields } = result;

    // Convert Netlify fields to our expected format
    const parsed: ParsedFields = {
      nome: fields.nome,
      cognome: fields.cognome,
      codiceFiscale: fields.codice_fiscale,
      numeroDocumento: fields.numero_documento,
      scadenza: fields.data_scadenza,
      dataNascita: fields.data_nascita,
      luogoNascita: fields.luogo_nascita,
      conf: 0.8 // High confidence for Google Vision
    };

    console.log('✅ OCR Netlify completato con successo');
    return {
      text: text || '',
      parsed,
      previews
    };

  } catch (netlifyError) {
    // Log specific error types for debugging
    const errorMsg = netlifyError.message || 'Unknown error';
    if (errorMsg.includes('Failed to fetch')) {
      console.warn('⚠️ OCR Netlify: errore di rete (Failed to fetch), usando fallback locale');
    } else if (errorMsg.includes('AbortError')) {
      console.warn('⚠️ OCR Netlify: timeout, usando fallback locale');
    } else {
      console.warn('⚠️ OCR Netlify fallito:', errorMsg, ', usando fallback locale');
    }

    // Fallback to local Tesseract.js OCR
    try {
      console.log('📤 Usando OCR locale (Tesseract.js) come fallback...');

      const { text } = await extractTextFromFiles(files);
      const detectedType = detectDocType(text);
      const parsed = parseFieldsByType(detectedType, text);

      console.log('✅ OCR locale completato con successo');
      return {
        text: text || '',
        parsed: { ...parsed, conf: 0.6 }, // Lower confidence for Tesseract
        previews
      };

    } catch (fallbackError) {
      console.error('❌ Errore anche nel fallback OCR locale:', fallbackError);
      throw new Error(`OCR failed: Netlify (${errorMsg}) and local (${fallbackError.message})`);
    }
  }
}

// For bills, we'll use the same OCR endpoint but extract bill-specific data
export async function processBillOCR(files: File[]): Promise<{
  text: string;
  data: any;
  previews: string[];
}> {
  // Create previews for all files first
  const previews = await Promise.all(
    files.map(f => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
      });
    })
  );

  // Try Netlify OCR first (now properly configured)
  try {
    console.log('📤 Tentativo OCR Netlify per fattura...');

    // Prepare multipart form data
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });

    // Call Netlify function with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OCR request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 Risposta Netlify OCR fattura:', result);

    if (!result.ok) {
      throw new Error(result.error || 'OCR failed');
    }

    const { text } = result;
    const billData = parseBillData(text);

    console.log('✅ OCR Netlify fattura completato con successo');
    return {
      text: text || '',
      data: billData,
      previews
    };

  } catch (netlifyError) {
    // Log specific error types for debugging
    const errorMsg = netlifyError.message || 'Unknown error';
    if (errorMsg.includes('Failed to fetch')) {
      console.warn('⚠️ OCR Netlify fattura: errore di rete (Failed to fetch), usando fallback locale');
    } else if (errorMsg.includes('AbortError')) {
      console.warn('⚠️ OCR Netlify fattura: timeout, usando fallback locale');
    } else {
      console.warn('⚠️ OCR Netlify fattura fallito:', errorMsg, ', usando fallback locale');
    }

    // Fallback to local Tesseract.js OCR
    try {
      console.log('📤 Usando OCR locale (Tesseract.js) per fattura come fallback...');

      const { text } = await extractTextFromFiles(files);
      const billData = parseBillData(text);

      console.log('✅ OCR locale fattura completato con successo');
      return {
        text: text || '',
        data: billData,
        previews
      };

    } catch (fallbackError) {
      console.error('❌ Errore anche nel fallback OCR locale per fattura:', fallbackError);
      throw new Error(`Bill OCR failed: Netlify (${errorMsg}) and local (${fallbackError.message})`);
    }
  }
}

// Local bill parsing function (same as before)
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

  // Try to extract addresses
  const residenzaAddr = addr("RESIDENZA") || addr("DOMICILIO") || addr("INTESTATARIO");
  const fornituraAddr = addr("FORNITURA") || addr("UTENZA") || addr("CONTATORE");
  const location = capCitta();

  return {
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
  };
}
