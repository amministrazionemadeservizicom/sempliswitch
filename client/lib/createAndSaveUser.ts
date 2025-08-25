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
    const response = await fetch('/.netlify/functions/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: input.nome,
        cognome: input.cognome || "",
        email: input.email,
        password: input.password,
        ruolo: input.ruolo,
        stato: input.stato,
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
        master: input.master || "",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Errore nella creazione dell\'utente');
    }

    const result = await response.json();
    console.log("✅ Utente creato correttamente tramite API:", result);
    return result.uid;
  } catch (error: any) {
    console.error("❌ Errore durante la creazione dell'utente:", error.message);
    throw error;
  }
}
