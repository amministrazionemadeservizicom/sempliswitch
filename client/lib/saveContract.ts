import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Helper function to recursively remove undefined values from objects
function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
}

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
    if (!db) {
      throw new Error("Firebase non configurato");
    }

    // Generate unique contract code
    const timestamp = Date.now();
    const codiceUnivocoOfferta = `CON-${timestamp}`;

    // Determine contract type and provider from selected offers
    const tipologiaContratto = contractData.offerte.some(offer => 
      offer.serviceType === "Luce" || offer.serviceType === "Gas"
    ) ? "energia" : "telefonia";

    const gestore = contractData.offerte[0]?.brand || "UNKNOWN";

    // Map to Contract interface format
    const contractForFirebase = {
      codiceUnivocoOfferta,
      dataCreazione: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      creatoDa: {
        id: userId,
        nome: userName,
        cognome: userSurname
      },
      contatto: {
        nome: contractData.cliente.nome,
        cognome: contractData.cliente.cognome,
        codiceFiscale: contractData.cliente.codiceFiscale
      },
      isBusiness: false, // Default to residential, could be calculated from data
      statoOfferta: 'Caricato' as const,
      noteStatoOfferta: 'Contratto appena creato',
      gestore,
      masterReference: masterReference || '',
      tipologiaContratto,
      
      // Additional detailed data
      dettagliCliente: {
        cellulare: contractData.cliente.cellulare,
        email: contractData.cliente.email,
        iban: contractData.cliente.iban
      },
      documento: contractData.documento,
      indirizzi: contractData.indirizzi,
      datiTecnici: {
        pod: contractData.pod,
        pdr: contractData.pdr,
        potenzaImpegnataKw: contractData.potenzaImpegnataKw,
        usiGas: contractData.usiGas,
        residenziale: contractData.residenziale
      },
      offerte: contractData.offerte,
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log("💾 Saving contract to Firebase:", contractForFirebase);

    const docRef = await addDoc(collection(db, "contratti"), contractForFirebase);
    
    console.log("✅ Contract saved successfully with ID:", docRef.id);
    
    return {
      success: true,
      contractId: docRef.id,
      codiceUnivocoOfferta
    };

  } catch (error: any) {
    console.error("❌ Error saving contract:", error);
    throw new Error(`Errore nel salvataggio del contratto: ${error.message}`);
  }
}
