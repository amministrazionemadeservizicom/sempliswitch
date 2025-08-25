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
  // Split text into lines to handle multiline format
  const lines = text.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.length > 0);
  const t = text.replace(/\s+/g," ").trim();

  console.log('🔍 Parsing CIE text:', t);
  console.log('📝 Lines found:', lines);

  let nome, cognome, scadenza, numeroDocumento, dataNascita, luogoNascita, emissione;

  // NEW: Parse multiline format where labels and values are on separate lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';

    // COGNOME / SURNAME pattern - value on next line
    if (/COGNOME\s*\/\s*SURNAME/i.test(line) && !cognome) {
      const valueMatch = nextLine.match(/^([A-ZÀ-Ù' -]+)/);
      if (valueMatch) {
        cognome = valueMatch[1].trim();
        console.log('📝 Found cognome:', cognome);
      }
    }

    // NOME / NAME pattern - value on next line
    if (/NOME\s*\/\s*NAME/i.test(line) && !nome) {
      const valueMatch = nextLine.match(/^([A-ZÀ-Ù' -]+)/);
      if (valueMatch) {
        nome = valueMatch[1].trim();
        console.log('📝 Found nome:', nome);
      }
    }

    // SCADENZA / EXPIRY pattern - value on next line or same line
    if (/SCADENZA\s*\/\s*EXPIRY/i.test(line) && !scadenza) {
      // Try next line first
      let dateMatch = nextLine.match(/(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/);
      if (!dateMatch) {
        // Try same line
        dateMatch = line.match(/SCADENZA.*?(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i);
      }
      if (dateMatch) {
        scadenza = toIsoDateLike(dateMatch[1]);
        console.log('📝 Found scadenza:', scadenza);
      }
    }

    // EMISSIONE / ISSUING pattern - value on next line or same line
    if (/EMISSIONE\s*\/\s*ISSUING/i.test(line) && !emissione) {
      // Try next line first
      let dateMatch = nextLine.match(/(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/);
      if (!dateMatch) {
        // Try same line
        dateMatch = line.match(/EMISSIONE.*?(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i);
      }
      if (dateMatch) {
        emissione = toIsoDateLike(dateMatch[1]);
        console.log('📝 Found emissione:', emissione);
      }
    }
  }

  // Fallback: try single-line patterns
  if (!cognome) {
    const cognomeMatch = t.match(/COGNOME\s*\/\s*SURNAME[:\s]*([A-ZÀ-Ù' -]+)(?=\s*NOME|\/|$)/i);
    if (cognomeMatch) cognome = cognomeMatch[1].trim();
  }

  if (!nome) {
    const nomeMatch = t.match(/NOME\s*\/\s*NAME[:\s]*([A-ZÀ-��' -]+)(?=\s*LUOGO|SESSO|\/|$)/i);
    if (nomeMatch) nome = nomeMatch[1].trim();
  }

  // Additional fallback patterns - look for patterns without strict formatting
  if (!cognome) {
    // Try to find cognome after any surname indicator
    const patterns = [
      /COGNOME[:\s]*([A-ZÀ-Ù' -]+)/i,
      /SURNAME[:\s]*([A-ZÀ-Ù' -]+)/i,
      /^([A-ZÀ-Ù' -]+)\s*\/\s*SURNAME/i
    ];
    for (const pattern of patterns) {
      const match = t.match(pattern);
      if (match && match[1].trim().length > 1) {
        cognome = match[1].trim();
        console.log('📝 Found cognome with fallback:', cognome);
        break;
      }
    }
  }

  if (!nome) {
    // Try to find nome after any name indicator
    const patterns = [
      /NOME[:\s]*([A-ZÀ-Ù' -]+)/i,
      /NAME[:\s]*([A-ZÀ-Ù' -]+)/i,
      /^([A-ZÀ-Ù' -]+)\s*\/\s*NAME/i
    ];
    for (const pattern of patterns) {
      const match = t.match(pattern);
      if (match && match[1].trim().length > 1) {
        nome = match[1].trim();
        console.log('📝 Found nome with fallback:', nome);
        break;
      }
    }
  }

  // Extract document number (format like CA89525IB)
  const docNumPatterns = [
    /\b([A-Z]{2}\d{5}[A-Z]{1,2})\b/,  // Standard CIE format like CA89525IB
    /N\.[\s]*([A-Z0-9]{6,12})/i,      // Old format with N.
    /NUMERO[:\s]*([A-Z0-9]{6,12})/i,  // With NUMERO label
    /([A-Z]{2}\d{5}[A-Z]{2})/,        // More flexible pattern
    /([A-Z0-9]{8,12})/                // Generic alphanumeric code
  ];

  for (const pattern of docNumPatterns) {
    const match = t.match(pattern);
    if (match) {
      numeroDocumento = match[1];
      console.log('📝 Found numeroDocumento with pattern:', numeroDocumento);
      break;
    }
  }

  // Extract birth date and place
  const birthMatch = t.match(/(?:LUOGO E DATA DI NASCITA|PLACE AND DATE OF BIRTH)[\s\/]*:?[\s]*([A-ZÀ-Ù' \(\)]+)[\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i);
  if (birthMatch) {
    luogoNascita = birthMatch[1].trim();
    dataNascita = toIsoDateLike(birthMatch[2]);
  }

  // Fallback for birth date extraction
  if (!dataNascita) {
    // Look for date patterns, but avoid scadenza/emissione dates
    const allDates = [...t.matchAll(/(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/g)];
    const scadenzaText = scadenza ? scadenza.replace(/[-]/g, '.') : '';
    const emissioneText = emissione ? emissione.replace(/[-]/g, '.') : '';

    for (const dateMatch of allDates) {
      const dateStr = dateMatch[1];
      const normalizedDate = dateStr.replace(/[\.\/-]/g, '.');

      // Skip if this is scadenza or emissione date
      if (scadenzaText && normalizedDate === scadenzaText.replace(/[-]/g, '.')) continue;
      if (emissioneText && normalizedDate === emissioneText.replace(/[-]/g, '.')) continue;

      dataNascita = toIsoDateLike(dateStr);
      break;
    }
  }

  // Additional fallback for dates if not found yet
  if (!scadenza) {
    const scadenzaPatterns = [
      /SCADENZA[:\s]*(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
      /EXPIRY[:\s]*(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
      /(?:SCAD|EXP)[:\s]*(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i
    ];
    for (const pattern of scadenzaPatterns) {
      const match = t.match(pattern);
      if (match) {
        scadenza = toIsoDateLike(match[1]);
        console.log('📝 Found scadenza with fallback:', scadenza);
        break;
      }
    }
  }

  if (!emissione) {
    const emissionePatterns = [
      /EMISSIONE[:\s]*(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
      /ISSUING[:\s]*(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
      /(?:EMISS|ISS)[:\s]*(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i
    ];
    for (const pattern of emissionePatterns) {
      const match = t.match(pattern);
      if (match) {
        emissione = toIsoDateLike(match[1]);
        console.log('📝 Found emissione with fallback:', emissione);
        break;
      }
    }
  }

  // Extract fiscal code from anywhere in text
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

  console.log('✅ CIE parsing result:', { nome, cognome, scadenza, numeroDocumento, dataNascita, emissione });

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
