export type DocType = "CIE" | "CARTA_VECCHIA" | "PATENTE" | "PASSAPORTO" | "UNKNOWN";

export function detectDocType(ocrText: string): DocType {
  const t = ocrText.toUpperCase();
  // MRZ TD1 (CIE): 3 righe con lettere+< e 'ID' all'inizio riga 1
  const hasMrzTd1 = /[\r\n]ID[A-Z0-9<]{25,}[\r\n][A-Z0-9<]{25,}[\r\n][A-Z0-9<]{25,}/.test(t);
  // MRZ TD3 (Passaporto): riga che inizia con "P<"
  const hasMrzTd3 = /[\r\n]P<.*/.test(t);
  if (hasMrzTd1 || t.includes("CARTA D'IDENTIT") || t.includes("CARTA DI IDENTIT")) return "CIE";
  if (hasMrzTd3 || t.includes("PASSAPORTO") || t.includes("PASSPORT")) return "PASSAPORTO";
  if (t.includes("PATENTE DI GUIDA") || t.includes("DRIVING LICENCE")) return "PATENTE";
  if (t.includes("COMUNE DI") || t.includes("RILASCIATA IL")) return "CARTA_VECCHIA";
  return "UNKNOWN";
}

export type ParsedFields = {
  nome?: string;
  cognome?: string;
  dataNascita?: string;  // ISO yyyy-mm-dd
  luogoNascita?: string;
  codiceFiscale?: string;
  numeroDocumento?: string;
  scadenza?: string;     // ISO
  iban?: string;
  conf?: number;         // 0..1 confidenza
};

// Utility function
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

const CF_RE = /\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/;

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
    /^RILASCIATO/i,
    /^PLACE AND DATE/i,
    /^OF BIRTH/i,
    /^FATHER AND/i,
    /^MOTHER'S/i,
    /^TUTOR'S/i,
    /^SURNAME/i,
    /^IDENTITY CARD/i,
    /^FISCAL CODE/i,
    /^MUNICIPALITY/i
  ];

  if (skipPatterns.some(pattern => pattern.test(value))) {
    return undefined;
  }

  // Stop at common separators or new field indicators, but preserve compound names
  value = value.split(/\b(?:LUOGO E DATA|EMISSIONE|SCADENZA|CITTADINANZA|STATURA|SESSO)\b/i)[0].trim();

  // Remove English labels that might be concatenated
  value = value.replace(/\s*\/\s*(SURNAME|NAME|PLACE AND DATE OF BIRTH|SEX|HEIGHT|NATIONALITY|ISSUING|EXPIRY).*$/i, '').trim();

  // Must be reasonable length and not all caps descriptive text
  if (value.length < 2 || value.length > 50) return undefined;
  if (value.length > 30 && value === value.toUpperCase() && !value.includes(' ')) return undefined;

  return value;
}

// Parser CIE (solo da testo OCR + MRZ semplificata)
export function parseCIE(text: string): ParsedFields {
  const t = text.replace(/\s+/g," ").trim();

  // Try multiple patterns for different CIE layouts
  let nome, cognome, scadenza, numeroDocumento, dataNascita, luogoNascita;

  // Pattern 1: Standard CIE format with COGNOME / SURNAME and NOME / NAME
  const cognomeMatch = t.match(/COGNOME\s*\/\s*SURNAME[:\s]*([A-ZÀ-Ù' -]+)(?=\s*NOME|\/|$)/i);
  const nomeMatch = t.match(/NOME\s*\/\s*NAME[:\s]*([A-ZÀ-Ù' -]+)(?=\s*LUOGO|SESSO|\/|$)/i);

  if (cognomeMatch) cognome = cognomeMatch[1].trim();
  if (nomeMatch) nome = nomeMatch[1].trim();

  // Pattern 2: Fallback to simple COGNOME/NOME without English
  if (!cognome) {
    cognome = extractCleanField(t, /\bCOGNOME[:\s]*([A-ZÀ-Ù' -]+)/i);
  }
  if (!nome) {
    nome = extractCleanField(t, /\bNOME[:\s]*([A-ZÀ-Ù' -]+)/i);
  }

  // Extract document number (format like CA89525IB)
  const docNumMatch = t.match(/\b([A-Z]{2}\d{5}[A-Z]{1,2})\b/) || t.match(/N\.[\s]*([A-Z0-9]{6,12})/i);
  if (docNumMatch) numeroDocumento = docNumMatch[1];

  // Extract birth date and place
  const birthMatch = t.match(/(?:LUOGO E DATA DI NASCITA|PLACE AND DATE OF BIRTH)[\s\/]*:?[\s]*([A-ZÀ-Ù' \(\)]+)[\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i);
  if (birthMatch) {
    luogoNascita = birthMatch[1].trim();
    dataNascita = toIsoDateLike(birthMatch[2]);
  }

  // Fallback for birth date only
  if (!dataNascita) {
    dataNascita = toIsoDateLike(t.match(/(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/)?.[1]);
  }

  // Extract expiry date
  const expiryMatch = t.match(/(?:SCADENZA|EXPIRY)[\s\/]*:?[\s]*(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i);
  if (expiryMatch) scadenza = toIsoDateLike(expiryMatch[1]);

  // Extract fiscal code
  const cf = t.match(CF_RE)?.[1];

  // MRZ parsing as fallback
  const mrzMatch = t.match(/C<ITA([A-Z0-9<]+)[\r\n]+([A-Z0-9<]+)[\r\n]+([A-Z<]+)/i);
  if (mrzMatch && (!nome || !cognome)) {
    const mrzLine3 = mrzMatch[3];
    const nameParts = mrzLine3.split('<<');
    if (nameParts.length >= 2 && !cognome) {
      cognome = nameParts[0].replace(/</g, ' ').trim();
    }
    if (nameParts.length >= 2 && !nome) {
      nome = nameParts[1].replace(/</g, ' ').trim();
    }
  }

  return {
    nome,
    cognome,
    dataNascita,
    luogoNascita,
    scadenza,
    numeroDocumento,
    codiceFiscale: cf?.toUpperCase(),
    conf: 0.7
  };
}

// Parser carta identità vecchia (cartacea)
export function parseCartaVecchia(text: string): ParsedFields {
  const t = text.replace(/\s+/g," ").trim();
  return {
    nome: extractCleanField(t, /\bNOME[:\s]+([A-ZÀ-Ù' -]+)/i),
    cognome: extractCleanField(t, /\bCOGNOME[:\s]+([A-ZÀ-Ù' -]+)/i),
    dataNascita: toIsoDateLike(t.match(/NATO.*?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]),
    luogoNascita: extractCleanField(t, /NATO A[:\s]+([A-ZÀ-Ù' -]+)/i),
    numeroDocumento: (t.match(/N\.\s*([A-Z0-9/-]+)/i)?.[1] || "").trim() || undefined,
    scadenza: toIsoDateLike(t.match(/SCADENZA[:\s]+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]),
    codiceFiscale: t.match(CF_RE)?.[1]?.toUpperCase(),
    conf: 0.5
  };
}

// Parser patente (senza barcode)
export function parsePatente(text: string): ParsedFields {
  const t = text.replace(/\s+/g," ").trim();
  const numeroDoc = t.match(/N\.\s*PATENTE[:\s]*([A-Z0-9/-]+)/i)?.[1]
                 || t.match(/\b([A-Z0-9]{8,})\b/)?.[1];

  return {
    nome: extractCleanField(t, /\bNOME[:\s]+([A-ZÀ-Ù' -]+)/i),
    cognome: extractCleanField(t, /\bCOGNOME[:\s]+([A-ZÀ-Ù' -]+)/i),
    dataNascita: toIsoDateLike(t.match(/NATO.*?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]),
    numeroDocumento: numeroDoc || undefined,
    scadenza: toIsoDateLike(t.match(/SCADENZA[:\s]+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]),
    codiceFiscale: t.match(CF_RE)?.[1]?.toUpperCase(),
    conf: 0.5
  };
}

export function parsePassaporto(text: string): ParsedFields {
  // Per estrazione seria serve parser MRZ TD3; qui lasciamo base
  const t = text.replace(/\s+/g," ").trim();
  return {
    nome: extractCleanField(t, /\bNOME[:\s]+([A-ZÀ-Ù' -]+)/i),
    cognome: extractCleanField(t, /\bCOGNOME[:\s]+([A-ZÀ-Ù' -]+)/i),
    numeroDocumento: (t.match(/N\.\s*PASSAPORTO[:\s]*([A-Z0-9/-]+)/i)?.[1] || "").trim() || undefined,
    conf: 0.4
  };
}

export function parseFieldsByType(type: DocType, text: string): ParsedFields {
  switch (type) {
    case "CIE": return parseCIE(text);
    case "CARTA_VECCHIA": return parseCartaVecchia(text);
    case "PATENTE": return parsePatente(text);
    case "PASSAPORTO": return parsePassaporto(text);
    default: return {};
  }
}
