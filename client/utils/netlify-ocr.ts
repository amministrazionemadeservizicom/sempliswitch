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

  // Always use local OCR for now since Netlify endpoint is not available
  console.log('📤 Usando OCR locale (Tesseract.js)...');

  try {
    const { text } = await extractTextFromFiles(files);

    console.log('📄 Testo grezzo estratto dall\'OCR:');
    console.log('---START TEXT---');
    console.log(text);
    console.log('---END TEXT---');

    const detectedType = detectDocType(text);
    console.log('🔍 Tipo documento rilevato:', detectedType);

    const parsed = parseFieldsByType(detectedType, text);
    console.log('📋 Campi parsati:', parsed);

    console.log('✅ OCR locale completato con successo');
    return {
      text: text || '',
      parsed: { ...parsed, conf: 0.6 }, // Tesseract confidence
      previews
    };

  } catch (localError) {
    console.error('❌ Errore OCR locale:', localError);
    throw new Error(`OCR failed: ${localError.message}`);
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

  // Always use local OCR for now since Netlify endpoint is not available
  console.log('📤 Usando OCR locale (Tesseract.js) per fattura...');

  try {
    const { text } = await extractTextFromFiles(files);
    const billData = parseBillData(text);

    console.log('✅ OCR locale fattura completato con successo');
    return {
      text: text || '',
      data: billData,
      previews
    };

  } catch (localError) {
    console.error('❌ Errore OCR locale per fattura:', localError);
    throw new Error(`Bill OCR failed: ${localError.message}`);
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
