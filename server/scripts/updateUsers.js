const admin = require("firebase-admin");
require("dotenv").config();

/**
 * Script semplificato per aggiornare utenti Firebase (versione JavaScript)
 * 
 * SETUP:
 * 1. npm install firebase-admin dotenv
 * 2. Configura le credenziali (vedi sotto)
 * 3. node server/scripts/updateUsers.js
 */

// Inizializza Firebase Admin
function initializeFirebase() {
  try {
    // Prova prima con il file JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "sempliswitch"
      });
      console.log("🔑 Firebase inizializzato con service account");
      return;
    }

    // Fallback su variabili d'ambiente
    if (process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "sempliswitch",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID || "sempliswitch"
      });
      console.log("🔑 Firebase inizializzato con variabili d'ambiente");
      return;
    }

    // Ultimo tentativo con default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: "sempliswitch"
    });
    console.log("🔑 Firebase inizializzato con default credentials");

  } catch (error) {
    console.error("❌ Errore inizializzazione Firebase:", error.message);
    console.log(`
📋 CONFIGURAZIONE CREDENZIALI:

Crea un file .env nella root del progetto con:

# Metodo 1: File JSON (consigliato)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Metodo 2: Variabili dirette
FIREBASE_PROJECT_ID=sempliswitch
FIREBASE_CLIENT_EMAIL=your-email@sempliswitch.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYourKey\\n-----END PRIVATE KEY-----"
    `);
    process.exit(1);
  }
}

// Funzione per aggiornare un utente
async function updateUser(uid, updates) {
  try {
    const db = admin.firestore();
    
    console.log(`🔄 Aggiornamento utente ${uid}...`);
    
    await db.collection("utenti").doc(uid).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Utente ${uid} aggiornato con successo`);
    console.log("   Campi aggiornati:", updates);

  } catch (error) {
    console.error(`❌ Errore aggiornamento ${uid}:`, error.message);
    throw error;
  }
}

// Funzione per trovare utente per email
async function findUserByEmail(email) {
  try {
    const db = admin.firestore();
    console.log(`🔍 Ricerca utente: ${email}`);
    
    const snapshot = await db.collection("utenti")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("❌ Utente non trovato");
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log(`✅ Trovato: ${doc.id} - ${data.nome} ${data.cognome}`);
    return doc.id;

  } catch (error) {
    console.error("❌ Errore ricerca:", error.message);
    return null;
  }
}

// Funzione per listare utenti
async function listUsers(limit = 5) {
  try {
    const db = admin.firestore();
    console.log(`📋 Ultimi ${limit} utenti:`);
    
    const snapshot = await db.collection("utenti")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    if (snapshot.empty) {
      console.log("   Nessun utente trovato");
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   ${doc.id}: ${data.nome || 'N/A'} ${data.cognome || 'N/A'} (${data.role || 'no-role'})`);
    });

  } catch (error) {
    console.error("❌ Errore lista utenti:", error.message);
  }
}

// FUNZIONE PRINCIPALE
async function main() {
  // Inizializza Firebase
  initializeFirebase();

  try {
    // ==========================================
    // MODIFICA QUI I TUOI AGGIORNAMENTI
    // ==========================================

    // ESEMPIO 1: Aggiorna ruolo e parentId
    await updateUser("M4P77GsN0X...", {  // ← Sostituisci con UID reale
      role: "consulente",
      parentId: "UID_DEL_MASTER"  // ← Sostituisci con UID reale
    });

    // ESEMPIO 2: Trova utente per email e aggiorna
    /*
    const uid = await findUserByEmail("utente@example.com");
    if (uid) {
      await updateUser(uid, {
        role: "consulente",
        parentId: "master_uid_here"
      });
    }
    */

    // ESEMPIO 3: Aggiorna più campi
    /*
    await updateUser("altro_uid", {
      role: "backoffice", 
      attivo: true,
      nome: "Nuovo Nome"
    });
    */

    // Lista utenti per controllo
    await listUsers(5);

    console.log("\n🎉 Script completato!");

  } catch (error) {
    console.error("💥 Errore:", error.message);
  } finally {
    // Chiudi l'app
    await admin.app().delete();
    console.log("👋 Connessione chiusa");
  }
}

// Avvia lo script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateUser,
  findUserByEmail,
  listUsers
};
