// Tipi per il sistema di gestione contratti

export type ContractStatus = 
  | 'Caricato'           // Iniziale - contratto caricato dal consulente
  | 'In Lavorazione'     // Un operatore back office/admin sta lavorando il contratto
  | 'Documenti OK'       // Back office: documenti verificati e corretti
  | 'Documenti KO'       // Back office: documenti non conformi, serve integrazione
  | 'Integrazione'       // Consulente/Master: ha integrato i documenti, torna in lavorazione
  | 'Inserimento OK'     // Back office/Admin: definitivamente approvato
  | 'Inserimento KO'     // Back office/Admin: definitivamente rifiutato
  | 'Pagato'            // Admin: contratto pagato
  | 'Stornato'          // Admin: contratto stornato
  | 'Annullato';        // Contratto annullato

export type UserRole = 'admin' | 'back office' | 'master' | 'consulente';

export interface ContractDocument {
  id: string;
  nome: string;
  tipo: 'documento_identita' | 'bolletta' | 'fattura' | 'altro';
  url: string;
  caricatoDa: string;
  dataCaricamento: string;
}

export interface ContractWorkflow {
  stato: ContractStatus;
  dataModifica: string;
  modificatoDa: {
    id: string;
    nome: string;
    cognome: string;
    ruolo: UserRole;
  };
  note?: string;
}

export interface ContractLock {
  lockedBy: {
    id: string;
    nome: string;
    cognome: string;
    ruolo: UserRole;
  };
  dataLock: string;
  inScadenza: boolean; // true se il lock sta per scadere
}

export interface Contract {
  id: string;
  codiceUnivocoOfferta: string;
  dataCreazione: string;
  creatoDa: {
    id: string;
    nome: string;
    cognome: string;
    ruolo: UserRole;
  };
  contatto: {
    nome: string;
    cognome: string;
    codiceFiscale: string;
    cellulare?: string;
    email?: string;
  };
  ragioneSociale?: string;
  isBusiness: boolean;
  
  // Sistema di stati
  statoOfferta: ContractStatus;
  noteStatoOfferta: string;
  cronologiaStati: ContractWorkflow[];
  
  // Sistema di locking
  lock?: ContractLock;
  
  // Documenti
  documenti: ContractDocument[];
  
  // Gestione POD multipli
  pod?: string[];
  pdr?: string[];
  
  // Metadati
  gestore: string;
  filePath?: string;
  masterReference?: string;
  tipologiaContratto: 'energia' | 'telefonia';
  
  // Evidenziazione per nuovi POD sulla stessa anagrafica
  nuoviPodAggiunti?: boolean;
  dataUltimaIntegrazione?: string;
}

export interface ContractFilters {
  searchTerm: string;
  cognome: string;
  codiceFiscale: string;
  codiceContratto: string;
  stato: ContractStatus | 'all';
  dataInizio?: string;
  dataFine?: string;
  creatoDa?: string;
  soloMiei?: boolean; // Per consulenti che vogliono vedere solo i propri
  soloInLavorazione?: boolean; // Per back office
  soloNuoviPod?: boolean; // Evidenzia contratti con nuovi POD aggiunti
}

export interface WorkQueueStats {
  daLavorare: number;
  inLavorazione: number;
  completati: number;
  richiedonoIntegrazione: number;
}

// Configurazione permessi per ruolo
export const RolePermissions = {
  admin: {
    canEdit: true,
    canDelete: true,
    canChangeToPagato: true,
    canChangeToStornato: true,
    canLock: true,
    canViewAll: true,
    canDownloadAll: true,
  },
  'back office': {
    canEdit: true,
    canDelete: false,
    canChangeToPagato: false,
    canChangeToStornato: false,
    canLock: true,
    canViewAll: true,
    canDownloadAll: true,
  },
  master: {
    canEdit: false,
    canDelete: false,
    canChangeToPagato: false,
    canChangeToStornato: false,
    canLock: false,
    canViewAll: false, // Solo suoi e dei sub-agenti
    canDownloadAll: false,
  },
  consulente: {
    canEdit: false,
    canDelete: false,
    canChangeToPagato: false,
    canChangeToStornato: false,
    canLock: false,
    canViewAll: false, // Solo suoi
    canDownloadAll: false,
  },
} as const;

// Configurazione colori stati
export const StatusColors = {
  'Caricato': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'In Lavorazione': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'Documenti OK': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'Documenti KO': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  'Integrazione': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'Inserimento OK': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Inserimento KO': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  'Pagato': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Stornato': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  'Annullato': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
} as const;

// Transizioni di stato permesse
export const AllowedTransitions = {
  'Caricato': ['In Lavorazione', 'Annullato'],
  'In Lavorazione': ['Documenti OK', 'Documenti KO', 'Caricato'],
  'Documenti OK': ['Inserimento OK', 'Inserimento KO', 'In Lavorazione'],
  'Documenti KO': ['Integrazione'],
  'Integrazione': ['In Lavorazione'],
  'Inserimento OK': ['Pagato', 'Stornato'],
  'Inserimento KO': ['In Lavorazione', 'Annullato'],
  'Pagato': [], // Stato finale
  'Stornato': ['In Lavorazione'], // Può essere rilavorato
  'Annullato': ['In Lavorazione'], // Può essere riattivato
} as const;
