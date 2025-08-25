import type { Handler } from "@netlify/functions";
import Busboy from "busboy";
import path from "path";
import vision from "@google-cloud/vision";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
} as const;

// Percorso della chiave (locale) o ENV su Netlify
const KEY_PATH = path.resolve(".netlify/functions/keys/vision-sa.json");

function getVisionCredentials(): any | undefined {
  const raw = process.env.GCP_SA_JSON;
  if (!raw) return undefined;
  try {
    // Permettiamo sia JSON puro che base64
    const txt = Buffer.from(raw, raw.trim().startsWith("{") ? "utf8" : "base64").toString("utf8");
    return JSON.parse(txt);
  } catch {
    return undefined;
  }
}

// Client Vision: usa credenziali da ENV se presenti, altrimenti file locale
const envCreds = getVisionCredentials();
const client = envCreds
  ? new vision.ImageAnnotatorClient({ credentials: envCreds })
  : new vision.ImageAnnotatorClient({ keyFilename: KEY_PATH });

// --- utils: parse multipart in Buffer[] ---
function parseMultipart(event: any): Promise<{ files: { filename: string; buffer: Buffer; mimetype: string }[] }> {
  return new Promise((resolve, reject) => {
    const files: { filename: string; buffer: Buffer; mimetype: string }[] = [];
    const bb = Busboy({
      headers: event.headers,
    });

    bb.on("file", (_: string, file: any, info: { filename: string; mimeType: string }) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      file.on("data", (d: Buffer) => chunks.push(d));
      file.on("end", () => {
        files.push({ filename, buffer: Buffer.concat(chunks), mimetype: mimeType });
      });
    });

    bb.on("error", reject);
    bb.on("finish", () => resolve({ files }));
    // Netlify sends the raw body as string/base64 sometimes; ensure we feed a Buffer
    const isBase64 = event.isBase64Encoded;
    const raw = isBase64 ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "");
    bb.end(raw);
  });
}

// --- estrai alcuni campi base IT (best effort) ---
function pad2(n: number) { return n.toString().padStart(2, "0"); }

function yymmddToItDate(yy: string, mm: string, dd: string) {
  // Heuristic century: years > (currentYY + 5) are 1900s, otherwise 2000s
  const nowYY = Number(new Date().getFullYear().toString().slice(-2));
  const y = Number(yy);
  const century = y > (nowYY + 5) % 100 ? 1900 : 2000;
  const yyyy = century + y;
  return `${pad2(Number(dd))}/${pad2(Number(mm))}/${yyyy}`;
}

function findItalianDate(src: string): string[] {
  const out: string[] = [];
  const re = /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/g; // DD/MM/YYYY or DD-MM-YYYY
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    let [_, dd, mm, yy] = m;
    if (yy.length === 2) {
      // convert YY -> YYYY (same heuristic)
      const nowYY = Number(new Date().getFullYear().toString().slice(-2));
      const y = Number(yy);
      const century = y > (nowYY + 5) % 100 ? 1900 : 2000;
      yy = String(century + y);
    }
    const ddn = Number(dd), mmn = Number(mm), yyn = Number(yy);
    if (ddn >= 1 && ddn <= 31 && mmn >= 1 && mmn <= 12 && yyn >= 1900) {
      out.push(`${pad2(ddn)}/${pad2(mmn)}/${yyn}`);
    }
  }
  return out;
}

function parseMrzTD1orTD3(text: string) {
  // Try to parse MRZ-like blocks. Very tolerant: look for SURNAMES<<GIVEN NAMES and 2 YYMMDD dates nearby
  const mrzBlock = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.includes("<<") || /<[A-Z0-9]/.test(l))
    .join("\n");

  const result: Partial<{ surname: string; given: string; doc: string; birth: string; expiry: string; }> = {};

  // Names line like: ROSSI<<MARIO<PAOLO
  const nm = mrzBlock.match(/([A-ZÀ-Ü']{2,})(?:<+)([A-ZÀ-Ü'<]+)\b/);
  if (nm) {
    result.surname = nm[1].replace(/<+/g, " ").trim();
    result.given = nm[2].replace(/<+/g, " ").trim();
  }

  // Dates in YYMMDD in vicinity (first -> birth or issue, second -> expiry). We won't use birth here.
  const datesYYMMDD = Array.from(mrzBlock.matchAll(/\b(\d{2})(\d{2})(\d{2})\b/g)).map((m) => yymmddToItDate(m[1], m[2], m[3]));
  if (datesYYMMDD.length >= 2) {
    result.expiry = datesYYMMDD[1];
    // We don't depend on the first date; rilascio we’ll compute elsewhere if needed
  }

  // Document number: a long alphanumeric near names
  const dn = mrzBlock.match(/\b([A-Z0-9]{6,12})\b/);
  if (dn) result.doc = dn[1];

  return result;
}

function extractFields(text: string) {
  const norm = text.replace(/\s+/g, " ");
  const fields: Record<string, string> = {};

  // 1) MRZ-first parsing (if present). Gives us reliable Cognome / Nome e spesso scadenza e numero doc.
  const mrz = parseMrzTD1orTD3(text.toUpperCase());
  if (mrz.surname) fields.cognome = mrz.surname;
  if (mrz.given) fields.nome = mrz.given.split(" ")[0]; // primo nome
  if (mrz.doc) fields.numero_documento = mrz.doc;
  if (mrz.expiry) fields.data_scadenza = mrz.expiry;

  // 2) Codice fiscale
  if (!fields.codice_fiscale) {
    const cf = norm.match(/\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/i);
    if (cf) fields.codice_fiscale = cf[1].toUpperCase();
  }

  // 3) Nome / Cognome con etichette esplicite (fallback se MRZ assente)
  if (!fields.nome) {
    const nome = norm.match(/(?:nome|name)\s*[:\-]?\s*([A-ZÀ-Ü][A-Za-zÀ-ü' -]{2,})/i);
    if (nome) fields.nome = nome[1].trim();
  }
  if (!fields.cognome) {
    const cognome = norm.match(/(?:cognome|surname|last name)\s*[:\-]?\s*([A-ZÀ-Ü][A-Za-zÀ-ü' -]{2,})/i);
    if (cognome) fields.cognome = cognome[1].trim();
  }

  // 4) Numero documento (etichette comuni)
  if (!fields.numero_documento) {
    const ndoc = norm.match(/(?:n(?:umero)?\s*doc(?:umento)?|document\s*no\.?|id\s*no\.?)\s*[:\-]?\s*([A-Z0-9\-]{5,20})/i);
    if (ndoc) fields.numero_documento = ndoc[1].trim();
  }

  // 5) Date: priorità a etichette, poi fallback sulle due date plausibili
  const lower = norm.toLowerCase();
  const dateLabels = [
    { key: "data_rilascio", labels: ["rilascio", "emissione", "issued", "ril."] },
    { key: "data_scadenza", labels: ["scadenza", "expiry", "exp.", "valido fino al", "valid to"] },
  ] as const;

  for (const group of dateLabels) {
    if (!(group.key in fields)) {
      for (const label of group.labels) {
        const re = new RegExp(`${label}[^0-9]{0,10}(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4})`, "i");
        const m = lower.match(re);
        if (m) { fields[group.key] = findItalianDate(m[0])[0]; break; }
      }
    }
  }

  // Fallback: se ancora mancano, prendi le prime due date nel testo e ordinale cronologicamente
  const allDates = findItalianDate(norm);
  if (!fields.data_rilascio || !fields.data_scadenza) {
    if (allDates.length >= 2) {
      const [a, b] = allDates
        .map((d) => {
          const [dd, mm, yy] = d.split("/").map(Number);
          return { d, t: new Date(yy, mm - 1, dd).getTime() };
        })
        .sort((x, y) => x.t - y.t)
        .map((x) => x.d);
      if (!fields.data_rilascio) fields.data_rilascio = a;
      if (!fields.data_scadenza) fields.data_scadenza = b;
    } else if (allDates.length === 1) {
      // Se una sola data ed è futura -> scadenza, altrimenti rilascio
      const [dd, mm, yy] = allDates[0].split("/").map(Number);
      const ts = new Date(yy, mm - 1, dd).getTime();
      if (ts > Date.now()) fields.data_scadenza = allDates[0]; else fields.data_rilascio = allDates[0];
    }
  }

  // 6) Email / Cellulare come extra (non richiesti ma utili)
  const cell = norm.match(/(\+39\s?)?3\d{2}\s?\d{6,7}/);
  if (cell) fields.cellulare = cell[0].replace(/\s+/g, "");
  const email = norm.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) fields.email = email[0].toLowerCase();

  return fields;
}

export const handler: Handler = async (event) => {
  // Health check (useful to verify the function is deployed)
  if (event.httpMethod === "GET") {
    return { statusCode: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, endpoint: "/.netlify/functions/ocr", method: "GET" }) };
  }
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, body: "" };
  }

  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Allow": "POST,OPTIONS", ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
      };
    }

    // Parse incoming multipart to get uploaded images/PDF (front/back)
    const { files } = await parseMultipart(event);
    if (!files.length) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ ok: false, error: "No files uploaded" }),
      };
    }

    // OCR with Google Vision (Document Text Detection for highest text quality)
    let fullText = "";
    for (const f of files) {
      const [resp] = await client.documentTextDetection({ image: { content: f.buffer } });
      const pageText = resp.fullTextAnnotation?.text || resp.textAnnotations?.[0]?.description || "";
      fullText += (fullText ? "\n\n" : "") + pageText;
    }

    // Build parsed fields for the frontend autofill
    const __ocrText = fullText || "";
    const __fields = extractFields(__ocrText);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({
        ok: true,
        fields: __fields,
        text: __ocrText,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ ok: false, error: error?.message || String(error) }),
    };
  }
};