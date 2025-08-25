import { adminApi } from "../utils/admin-api";

interface ContractData {
  cliente: {
    nome: string;
    cognome: string;
    codiceFiscale: string;
    cellulare: string;
    email: string;
    iban?: string;
  };
  documento: {
    tipo: string;
    numero?: string;
    rilasciatoDa: string;
    dataRilascio: string;
    dataScadenza: string;
  };
  indirizzi: {
    residenza: {
      via: string;
      civico: string;
      citta: string;
      cap: string;
    };
    fornitura: {
      via: string;
      civico: string;
      citta: string;
      cap: string;
    };
  };
  pod?: string;
  pdr?: string;
  potenzaImpegnataKw?: number;
  usiGas?: string[];
  residenziale?: string;
  offerte: any[];
}

interface SaveContractInput {
  contractData: ContractData;
  userId: string;
  userName: string;
  userSurname: string;
  masterReference?: string;
}

export async function saveContract({
  contractData,
  userId,
  userName,
  userSurname,
  masterReference
}: SaveContractInput) {
  try {
    console.log("💾 Saving contract via secure Admin API...");

    // Use secure Admin API endpoint for contract saving
    const result = await adminApi.saveContract(
      contractData,
      userId,
      userName,
      userSurname,
      masterReference
    );
    
    console.log("✅ Contract saved successfully via Admin API:", result);
    
    return result;

  } catch (error: any) {
    console.error("❌ Error saving contract via Admin API:", error);
    throw new Error(`Errore nel salvataggio del contratto: ${error.message}`);
  }
}
