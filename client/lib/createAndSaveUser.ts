import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
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
  // Save current admin user credentials
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Devi essere autenticato per creare un utente");
  }

  try {
    // Store current admin email (we'll need it to re-authenticate)
    const adminEmail = currentUser.email;
    if (!adminEmail) {
      throw new Error("Email admin non trovata");
    }

    // Create the new user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );

    const uid = userCredential.user.uid;

    // Save user data to Firestore
    await setDoc(doc(db, "utenti", uid), {
      uid,
      nome: input.nome,
      cognome: input.cognome || "",
      email: input.email,
      ruolo: input.ruolo,
      attivo: input.stato,
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

    // Sign out the newly created user
    await signOut(auth);

    // Re-authenticate the admin user
    // Note: This requires the admin password to be available
    // For now, we'll let the auth state listener handle the re-authentication

    console.log("✅ Utente creato correttamente con UID:", uid);
    return uid;
  } catch (error: any) {
    console.error("❌ Errore durante la creazione dell'utente:", error.message);
    throw error;
  }
}
