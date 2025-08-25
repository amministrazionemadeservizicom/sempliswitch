// constants.ts

// Gestori energia
export const AVAILABLE_GESTORI_ENERGIA = [
  "PLENITUDE", "IREN", "ENEL", "EDISON", "ENGIE", "A2A", "AXPO", "ACEA", "ESTRA",
  "HERA", "SORGENIA", "CAMER", "FASTWEB ENERGIA", "AGSM"
];

// Gestori telefonia
export const AVAILABLE_GESTORI_TLC = [
  "TIM", "WINDTRE", "FASTWEB", "VODAFONE", "WICITY", "ENELFIBRA", "EDISONFIBRA"
];

// Tutti insieme (se ti serve una lista unica)
export const AVAILABLE_GESTORI = [
  ...AVAILABLE_GESTORI_ENERGIA,
  ...AVAILABLE_GESTORI_TLC
];

// Piani compensi
export const AVAILABLE_PLANET_NAMES = [
  "Terra",
  "Marte",
  "Giove",
  "Saturno",
  "Venere",
  "Nettuno",
  "Plutone"
];