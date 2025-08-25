import admin from "firebase-admin";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface UserUpdate {
  uid: string;
  role?: "admin" | "consulente" | "backoffice" | "master";
  parentId?: string;
  nome?: string;
  cognome?: string;
  email?: string;
  attivo?: boolean;
}

/**
 * Script per aggiornare utenti nel database Firebase
 * 
 * Configurazione richiesta:
 * 1. Installa firebase-admin: npm install firebase-admin
 * 2. Configura le credenziali (vedi sotto)
 * 3. Esegui: npm run ts-node server/scripts/updateUsers.ts
 */

class UserUpdater {
  private db: admin.firestore.Firestore;

  constructor() {
    this.initializeFirebase();
    this.db = admin.firestore();
  }

  private initializeFirebase() {
    try {
      // Metodo 1: Credenziali da file JSON (più sicuro)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: "sempliswitch" // Il tuo project ID
        });
        console.log("🔑 Firebase inizializzato con service account file");
        return;
      }

      // Metodo 2: Credenziali da variabili d'ambiente
      if (process.env.FIREBASE_PRIVATE_KEY) {
        const serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID || "sempliswitch",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          projectId: serviceAccount.projectId
        });
        console.log("🔑 Firebase inizializzato con variabili d'ambiente");
        return;
      }

      // Metodo 3: Default credentials (per Google Cloud environments)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "sempliswitch"
      });
      console.log("🔑 Firebase inizializzato con application default credentials");

    } catch (error) {
      console.error("❌ Errore nell'inizializzazione di Firebase:", error);
      console.log(`
📋 Per configurare le credenziali:

METODO 1 - File JSON (consigliato):
1. Scarica il file JSON delle credenziali dalla console Firebase
2. Salva il file come 'firebase-service-account.json' nella root del progetto
3. Aggiungi al .env: FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

METODO 2 - Variabili d'ambiente:
Aggiungi al file .env:
FIREBASE_PROJECT_ID=sempliswitch
FIREBASE_CLIENT_EMAIL=your-client-email@sempliswitch.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour\\nPrivate\\nKey\\n-----END PRIVATE KEY-----\\n"
      `);
      process.exit(1);
    }
  }

  /**
   * Aggiorna un singolo utente
   */
  async updateUser(userUpdate: UserUpdate): Promise<void> {
    try {
      const { uid, ...updateData } = userUpdate;
      
      console.log(`🔄 Aggiornamento utente ${uid}...`);
      
      // Rimuovi campi undefined
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(cleanUpdateData).length === 0) {
        console.log("⚠️ Nessun campo da aggiornare");
        return;
      }

      await this.db.collection("utenti").doc(uid).update({
        ...cleanUpdateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Utente ${uid} aggiornato con successo`);
      console.log(`   Campi aggiornati:`, cleanUpdateData);

    } catch (error) {
      console.error(`❌ Errore nell'aggiornamento dell'utente ${userUpdate.uid}:`, error);
      throw error;
    }
  }

  /**
   * Aggiorna più utenti in batch
   */
  async updateUsers(userUpdates: UserUpdate[]): Promise<void> {
    console.log(`🔄 Aggiornamento di ${userUpdates.length} utenti...`);
    
    const results = await Promise.allSettled(
      userUpdates.map(update => this.updateUser(update))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`\n📊 Risultati:`);
    console.log(`   ✅ Successi: ${successful}`);
    console.log(`   ❌ Fallimenti: ${failed}`);

    if (failed > 0) {
      console.log(`\n⚠️ Errori:`);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(`   ${userUpdates[index].uid}: ${result.reason.message}`);
        }
      });
    }
  }

  /**
   * Elenca tutti gli utenti per controllo
   */
  async listUsers(limit: number = 10): Promise<void> {
    try {
      console.log(`📋 Lista degli ultimi ${limit} utenti:`);
      
      const snapshot = await this.db.collection("utenti")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      if (snapshot.empty) {
        console.log("   Nessun utente trovato");
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   ${doc.id}: ${data.nome} ${data.cognome} (${data.role || 'no-role'})`);
      });

    } catch (error) {
      console.error("❌ Errore nel listare gli utenti:", error);
    }
  }

  /**
   * Trova utente per email
   */
  async findUserByEmail(email: string): Promise<string | null> {
    try {
      console.log(`�� Ricerca utente con email: ${email}`);
      
      const snapshot = await this.db.collection("utenti")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log("   ❌ Utente non trovato");
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      console.log(`   ✅ Trovato: ${doc.id} - ${data.nome} ${data.cognome}`);
      return doc.id;

    } catch (error) {
      console.error("❌ Errore nella ricerca:", error);
      return null;
    }
  }
}

/**
 * Funzione principale - Configura qui i tuoi aggiornamenti
 */
async function main() {
  const updater = new UserUpdater();

  try {
    // ==========================================
    // CONFIGURA QUI I TUOI AGGIORNAMENTI
    // ==========================================

    // Esempio 1: Aggiorna un singolo utente
    await updater.updateUser({
      uid: "M4P77GsN0X...", // Sostituisci con UID reale
      role: "consulente",
      parentId: "UID_DEL_MASTER" // Sostituisci con UID reale
    });

    // Esempio 2: Aggiorna più utenti
    /*
    await updater.updateUsers([
      {
        uid: "user1_uid",
        role: "consulente",
        parentId: "master_uid"
      },
      {
        uid: "user2_uid", 
        role: "backoffice",
        attivo: true
      }
    ]);
    */

    // Esempio 3: Trova utente per email e aggiorna
    /*
    const uid = await updater.findUserByEmail("user@example.com");
    if (uid) {
      await updater.updateUser({
        uid,
        role: "consulente",
        parentId: "master_uid"
      });
    }
    */

    // Lista utenti per controllo
    await updater.listUsers(5);

    console.log("\n🎉 Script completato con successo!");

  } catch (error) {
    console.error("💥 Errore generale:", error);
    process.exit(1);
  } finally {
    // Chiudi l'app admin
    await admin.app().delete();
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  main().catch(console.error);
}

export { UserUpdater };
