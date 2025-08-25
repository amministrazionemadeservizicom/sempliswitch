// client/utils/pricing.ts
export type Supply = "luce" | "gas";

export function fmt(n: number): string {
  return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseUnitPrice(input: unknown): number {
  if (typeof input === "number") return input;
  if (!input) return NaN;
  const s = String(input).replace(/\s+/g, " ").replace(",", ".");
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

// estrae lo spread da stringhe tipo "PSV + 0,10 €/Smc" / "PUN - 0,012 €/kWh"
function parseSpreadFromIndexedPrice(s: string): number | null {
  const norm = s.replace(",", ".").toUpperCase();
  const m = norm.match(/(PSV|PUN)\s*([+\-])\s*(\d+(\.\d+)?)/);
  if (!m) return null;
  const sign = m[2] === "-" ? -1 : 1;
  const num = Number(m[3]);
  return sign * num;
}

export function monthsBetween(isoStart: string, isoEnd: string): number {
  const a = new Date(isoStart);
  const b = new Date(isoEnd);
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b <= a) return 1;
  const msInMonth = 30.4375 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / msInMonth));
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

type SimulateParams = {
  priceType: "fisso" | "variabile";
  priceString: string;           // "0,390 €/Smc" oppure "PSV + 0,10 €/Smc"
  spread?: number;               // opzionale: spread salvato sul documento
  indexPrice?: number;           // opzionale: valore indice PSV/PUN in €/unità
  ccv: number;                   // €/mese
  consumoPeriodo: number;        // kWh o Smc
  spesaMateriaEnergia: number;   // € (dalla bolletta)
  mesiPeriodo: number;           // n° mensilità
  supplyType: Supply;
  ivaPerc?: number;              // default 10% (privati)
};

export function simulateOffer(p: SimulateParams) {
  const iva = p.ivaPerc ?? 0.10;

  // 1) calcolo prezzo unitario
  let prezzoEnergia = NaN;

  // Se è variabile e contiene PSV/PUN => indice + spread
  const spreadFromString = parseSpreadFromIndexedPrice(p.priceString);
  if (p.priceType === "variabile" && spreadFromString !== null) {
    const idx = Number(p.indexPrice ?? 0); // se non lo fornisci, usa 0 (fallback)
    prezzoEnergia = idx + spreadFromString;
  } else if (p.priceType === "variabile" && isFinite(p.spread ?? NaN)) {
    // variabile senza "PSV/PUN …" in stringa: usa spread come prezzo (fallback pratico)
    prezzoEnergia = Number(p.spread);
  } else {
    // fisso classico: prendi il numero dalla stringa
    prezzoEnergia = parseUnitPrice(p.priceString);
  }

  if (!isFinite(prezzoEnergia)) prezzoEnergia = 0;

  // 2) spesa periodo = (prezzo * consumo) + (ccv * mesi)
  const costoEnergiaPeriodo = prezzoEnergia * p.consumoPeriodo;
  const costoFissoPeriodo   = p.ccv * p.mesiPeriodo;
  const spesaOffertaPeriodo = round2(costoEnergiaPeriodo + costoFissoPeriodo);

  // 3) differenza (positiva = risparmio)
  const risparmioPeriodo = round2(p.spesaMateriaEnergia - spesaOffertaPeriodo);

  // 4) proiezione annua (come nel tuo esempio GAS)
  const risparmioMensileConIva = round2((risparmioPeriodo / Math.max(1, p.mesiPeriodo)) * (1 + iva));
  const risparmioAnnuo         = round2(risparmioMensileConIva * 12);

  return {
    prezzoEnergia: round2(prezzoEnergia),
    spesaOffertaPeriodo,
    risparmioPeriodo,
    risparmioAnnuo,
  };
}
