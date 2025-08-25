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

// Parser CIE (solo da testo OCR + MRZ semplificata)
export function parseCIE(text: string): ParsedFields {
  const t = text.replace(/\s+/g," ").trim();
  // MRZ TD1 (3 righe). Proviamo a catturare blocco
  const m = t.match(/ID[A-Z0-9<]{20,}\s+[A-Z0-9<]{20,}\s+[A-Z0-9<]{20,}/i);
  let nome, cognome, scadenza, numeroDocumento, dataNascita;

  if (m) {
    const mrz = m[0].split(/\s+/);
    const L1 = mrz[0] || "";
    const L2 = mrz[1] || "";
    const L3 = mrz[2] || "";

    // N.B. estrazione MRZ precisa richiede parser MRZ; qui fallback euristico:
    // Numero documento tipicamente in L1 pos 5..13 (euristico)
    numeroDocumento = L1.replace(/[^A-Z0-9]/g,"").slice(5,14);
    // Cognome<Nome in L2: split su "<<"
    const nameBlock = L2.split("<<");
    if (nameBlock.length >= 2) {
      cognome = nameBlock[0].replace(/</g," ").trim();
      nome = nameBlock[1].replace(/</g," ").trim();
    }
    // Data nascita/scadenza presenti in L3 (yyMMdd). Qui lasciamo vuoto: serve parser MRZ vero per sicurezza.
  }

  // Fallback da label italiane
  nome ||= (t.match(/NOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim();
  cognome ||= (t.match(/COGNOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim();
  dataNascita = toIsoDateLike(t.match(/NATO.*?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]);
  scadenza = toIsoDateLike(t.match(/SCADENZA[:\s]+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]);
  const cf = t.match(CF_RE)?.[1];

  return {
    nome, cognome, dataNascita, scadenza, numeroDocumento,
    codiceFiscale: cf?.toUpperCase(),
    conf: 0.6
  };
}

// Parser carta identità vecchia (cartacea)
export function parseCartaVecchia(text: string): ParsedFields {
  const t = text.replace(/\s+/g," ").trim();
  return {
    nome: (t.match(/NOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim() || undefined,
    cognome: (t.match(/COGNOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim() || undefined,
    dataNascita: toIsoDateLike(t.match(/NATO.*?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)?.[1]),
    luogoNascita: (t.match(/NATO A[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim() || undefined,
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
    nome: (t.match(/NOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim() || undefined,
    cognome: (t.match(/COGNOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim() || undefined,
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
    nome: (t.match(/NOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim() || undefined,
    cognome: (t.match(/COGNOME[:\s]+([A-ZÀ-Ù' -]+)/i)?.[1] || "").trim() || undefined,
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
