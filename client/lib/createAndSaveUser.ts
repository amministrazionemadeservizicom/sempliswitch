import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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

export async function createAndSaveUser(input: CreateUserInput) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );

    const uid = userCredential.user.uid;

    await setDoc(doc(db, "utenti", uid), {
      uid,
      nome: input.nome,
      cognome: input.cognome || "",
      email: input.email,
      ruolo: input.ruolo,
      stato: input.stato ? "attivo" : "non attivo",
      pianoCompensi: input.pianoCompensi || "",
      gestoriAssegnati: input.gestoriAssegnati || [],
      ragioneSociale: input.ragioneSociale || "",
      partitaIva: input.partitaIva || "",
      codiceFiscale: input.codiceFiscale || "",
      numeroCellulare: input.numeroCellulare || "",
      indirizzo: input.indirizzo || "",
      città: input.città || "",
      provincia: input.provincia || "",
      cap: input.cap || "",
      masterRiferimento: input.master || "",
      creatoIl: serverTimestamp(),
    });

    console.log("✅ Utente creato correttamente con UID:", uid);
    return uid;
  } catch (error: any) {
    console.error("❌ Errore durante la creazione dell'utente:", error.message);
    throw error;
  }
}