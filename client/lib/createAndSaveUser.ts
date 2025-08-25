interface CreateUserInput {
  nome: string;
  cognome?: string;
  email: string;
  password: string;
  ruolo: "admin" | "back office" | "consulente" | "master";
  stato: boolean;
  pianoCompensi?: string;
  gestoriAssegnati?: string[];
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  numeroCellulare?: string;
  indirizzo?: string;
  città?: string;
  provincia?: string;
  cap?: string;
  master?: string;
}

import { adminApi } from "../utils/admin-api";

export async function createAndSaveUser(input: CreateUserInput) {
  try {
    const result = await adminApi.createUser({
      nome: input.nome,
      email: input.email,
      password: input.password,
      ruolo: input.ruolo,
      stato: input.stato,
      pianoCompensi: input.pianoCompensi || "",
      gestoriAssegnati: input.gestoriAssegnati || [],
      master: input.master || ""
    });

    console.log("✅ Utente creato correttamente tramite Firebase Admin:", result);
    return result.uid;
  } catch (error: any) {
    console.error("❌ Errore durante la creazione dell'utente:", error.message);
    throw error;
  }
}
