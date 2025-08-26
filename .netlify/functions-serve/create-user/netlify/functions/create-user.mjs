
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/firebase-admin.ts
var firebase_admin_exports = {};
__export(firebase_admin_exports, {
  adminAuth: () => adminAuth,
  adminDb: () => adminDb,
  adminOperations: () => adminOperations,
  default: () => firebase_admin_default,
  isFirebaseAvailable: () => isFirebaseAvailable
});
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import fs from "fs";
var isFirebaseInitialized, adminDb, adminAuth, firebase_admin_default, isFirebaseAvailable, adminOperations;
var init_firebase_admin = __esm({
  "server/firebase-admin.ts"() {
    isFirebaseInitialized = false;
    if (!admin.apps.length) {
      try {
        console.log("\u{1F525} Initializing Firebase Admin SDK...");
        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
          console.log("\u{1F4CB} Using Firebase credentials from environment variables...");
          const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID || "sempliswitch",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
          };
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: "sempliswitch"
          });
          isFirebaseInitialized = true;
          console.log("\u2705 Firebase Admin SDK initialized with environment variables");
        } else {
          const serviceAccountPath = path.join(process.cwd(), "credentials", "firebase-admin-credentials.json");
          console.log("\u{1F4C1} Trying service account file:", serviceAccountPath);
          if (fs.existsSync(serviceAccountPath)) {
            const serviceAccountContent = fs.readFileSync(serviceAccountPath, "utf8");
            const serviceAccount = JSON.parse(serviceAccountContent);
            if (serviceAccount.private_key && serviceAccount.private_key.length > 100) {
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
                projectId: "sempliswitch"
              });
              isFirebaseInitialized = true;
              console.log("\u2705 Firebase Admin SDK initialized with service account file");
            } else {
              console.warn("\u26A0\uFE0F Service account file has incomplete private key");
              throw new Error("Incomplete private key in service account file");
            }
          } else {
            console.warn("\u26A0\uFE0F Service account file not found:", serviceAccountPath);
            throw new Error("Service account file not found");
          }
        }
      } catch (error) {
        console.error("\u274C Failed to initialize Firebase Admin SDK:", error);
        console.log(`
\u{1F527} To fix this Firebase Admin authentication issue:

METHOD 1 - Environment Variables (Recommended):
Set these environment variables:
- FIREBASE_PROJECT_ID=sempliswitch
- FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@sempliswitch.iam.gserviceaccount.com
- FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour\\nComplete\\nPrivate\\nKey\\n-----END PRIVATE KEY-----\\n"

METHOD 2 - Fix Service Account File:
Ensure the credentials/firebase-admin-credentials.json file has a complete private_key field

For now, the system will operate in fallback mode with limited functionality.
    `);
        isFirebaseInitialized = false;
      }
    }
    adminDb = isFirebaseInitialized ? getFirestore() : null;
    adminAuth = isFirebaseInitialized ? admin.auth() : null;
    firebase_admin_default = admin;
    isFirebaseAvailable = () => isFirebaseInitialized;
    adminOperations = {
      // Create user with custom claims
      async createUserWithRole(userData) {
        if (!isFirebaseInitialized || !adminAuth || !adminDb) {
          throw new Error("Firebase Admin SDK not properly initialized. Please check credentials.");
        }
        try {
          const userRecord = await adminAuth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.cognome ? `${userData.nome} ${userData.cognome}` : userData.nome
          });
          await adminAuth.setCustomUserClaims(userRecord.uid, {
            role: userData.ruolo
          });
          await adminDb.collection("utenti").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: userData.email,
            nome: userData.nome,
            cognome: userData.cognome || "",
            ruolo: userData.ruolo,
            attivo: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ...userData
          });
          console.log("\u2705 User created successfully:", userRecord.uid);
          return userRecord;
        } catch (error) {
          console.error("\u274C Error creating user:", error);
          throw error;
        }
      },
      // Get all contracts with admin privileges
      async getAllContracts() {
        if (!isFirebaseInitialized || !adminDb) {
          console.warn("\u26A0\uFE0F Firebase not available, returning empty contracts list");
          return [];
        }
        try {
          const snapshot = await adminDb.collection("contracts").get();
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("\u274C Error fetching contracts:", error);
          return [];
        }
      },
      // Update contract status with admin privileges
      async updateContractStatus(contractId, status, notes) {
        if (!isFirebaseInitialized || !adminDb) {
          throw new Error("Firebase Admin SDK not properly initialized. Cannot update contract status.");
        }
        try {
          await adminDb.collection("contracts").doc(contractId).update({
            statoOfferta: status,
            noteStatoOfferta: notes || "",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log("\u2705 Contract status updated:", contractId);
          return true;
        } catch (error) {
          console.error("\u274C Error updating contract:", error);
          throw error;
        }
      },
      // Update full contract with admin privileges
      async updateContract(contractId, updateData) {
        if (!isFirebaseInitialized || !adminDb) {
          throw new Error("Firebase Admin SDK not properly initialized. Cannot update contract.");
        }
        try {
          const updateFields = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          if (updateData.statoOfferta)
            updateFields.statoOfferta = updateData.statoOfferta;
          if (updateData.noteStatoOfferta !== void 0)
            updateFields.noteStatoOfferta = updateData.noteStatoOfferta;
          if (updateData.contatto)
            updateFields.contatto = updateData.contatto;
          if (updateData.ragioneSociale !== void 0)
            updateFields.ragioneSociale = updateData.ragioneSociale;
          if (updateData.lock !== void 0)
            updateFields.lock = updateData.lock;
          if (updateData.cronologiaStati)
            updateFields.cronologiaStati = updateData.cronologiaStati;
          if (updateData.dataUltimaIntegrazione !== void 0)
            updateFields.dataUltimaIntegrazione = updateData.dataUltimaIntegrazione;
          if (updateData.nuoviPodAggiunti !== void 0)
            updateFields.nuoviPodAggiunti = updateData.nuoviPodAggiunti;
          if (updateData.documenti)
            updateFields.documenti = updateData.documenti;
          if (updateData.pod)
            updateFields.pod = updateData.pod;
          if (updateData.pdr)
            updateFields.pdr = updateData.pdr;
          if (updateData.gestore)
            updateFields.gestore = updateData.gestore;
          if (updateData.tipologiaContratto)
            updateFields.tipologiaContratto = updateData.tipologiaContratto;
          if (updateData.masterReference !== void 0)
            updateFields.masterReference = updateData.masterReference;
          if (updateData.isBusiness !== void 0)
            updateFields.isBusiness = updateData.isBusiness;
          await adminDb.collection("contracts").doc(contractId).update(updateFields);
          console.log("\u2705 Contract updated:", contractId);
          return true;
        } catch (error) {
          console.error("\u274C Error updating contract:", error);
          throw error;
        }
      },
      // Save new contract with admin privileges
      async saveContract(contractData, userId, userName, userSurname, masterReference) {
        if (!isFirebaseInitialized || !adminDb) {
          throw new Error("Firebase Admin SDK not properly initialized. Cannot save contract.");
        }
        try {
          const timestamp = Date.now();
          const codiceUnivocoOfferta = `CON-${timestamp}`;
          const tipologiaContratto = contractData.offerte.some(
            (offer) => offer.serviceType === "Luce" || offer.serviceType === "Gas"
          ) ? "energia" : "telefonia";
          const gestore = contractData.offerte[0]?.brand || "UNKNOWN";
          const contractForFirebase = {
            codiceUnivocoOfferta,
            dataCreazione: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            // YYYY-MM-DD format
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
            isBusiness: false,
            // Default to residential
            statoOfferta: "Caricato",
            noteStatoOfferta: "Contratto appena creato",
            gestore,
            masterReference: masterReference || "",
            tipologiaContratto,
            // Additional detailed data
            dettagliCliente: {
              cellulare: contractData.cliente.cellulare,
              email: contractData.cliente.email,
              iban: contractData.cliente.iban || null
            },
            documento: contractData.documento,
            indirizzi: contractData.indirizzi,
            datiTecnici: {
              pod: contractData.pod || null,
              pdr: contractData.pdr || null,
              potenzaImpegnataKw: contractData.potenzaImpegnataKw || null,
              usiGas: contractData.usiGas || [],
              residenziale: contractData.residenziale || null
            },
            offerte: contractData.offerte || [],
            // Timestamps
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          const cleanedContract = this.cleanUndefinedValues(contractForFirebase);
          console.log("\uFFFD\uFFFD\uFFFD Saving contract via Admin SDK:", cleanedContract);
          const docRef = await adminDb.collection("contracts").add(cleanedContract);
          console.log("\u2705 Contract saved successfully with ID:", docRef.id);
          return {
            success: true,
            contractId: docRef.id,
            codiceUnivocoOfferta
          };
        } catch (error) {
          console.error("\u274C Error saving contract via Admin SDK:", error);
          throw error;
        }
      },
      // Helper function to clean undefined values
      cleanUndefinedValues(obj) {
        if (obj === null || obj === void 0) {
          return null;
        }
        if (Array.isArray(obj)) {
          return obj.map((item) => this.cleanUndefinedValues(item)).filter((item) => item !== void 0);
        }
        if (typeof obj === "object") {
          const cleaned = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== void 0) {
              cleaned[key] = this.cleanUndefinedValues(value);
            }
          }
          return cleaned;
        }
        return obj;
      },
      // Delete contract with admin privileges
      async deleteContract(contractId) {
        if (!isFirebaseInitialized || !adminDb) {
          throw new Error("Firebase Admin SDK not properly initialized. Cannot delete contract.");
        }
        try {
          await adminDb.collection("contracts").doc(contractId).delete();
          console.log("\u2705 Contract deleted:", contractId);
          return true;
        } catch (error) {
          console.error("\u274C Error deleting contract:", error);
          throw error;
        }
      }
    };
  }
});

// netlify/functions/create-user.ts
var create_user_default = async (request, context) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const body = await request.json();
    const { nome, email, password, ruolo, stato, pianoCompensi, gestoriAssegnati, master } = body;
    if (!nome || !email || !password || !ruolo) {
      return new Response(JSON.stringify({ error: "Campi obbligatori mancanti" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { adminOperations: adminOperations2 } = await Promise.resolve().then(() => (init_firebase_admin(), firebase_admin_exports));
    const userRecord = await adminOperations2.createUserWithRole({
      email,
      password,
      nome,
      ruolo,
      stato: stato ? "attivo" : "non attivo",
      pianoCompensi: pianoCompensi || "",
      gestoriAssegnati: gestoriAssegnati || [],
      masterRiferimento: master || ""
    });
    console.log("\u2705 Firebase user created:", userRecord.uid);
    return new Response(JSON.stringify({
      success: true,
      uid: userRecord.uid,
      message: "Utente creato con successo tramite Firebase Admin"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
  } catch (error) {
    console.error("\u274C Errore durante la creazione dell'utente:", error.message);
    return new Response(JSON.stringify({
      error: "Errore interno del server",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  create_user_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic2VydmVyL2ZpcmViYXNlLWFkbWluLnRzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL2NyZWF0ZS11c2VyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgYWRtaW4gZnJvbSAnZmlyZWJhc2UtYWRtaW4nO1xuaW1wb3J0IHsgZ2V0RmlyZXN0b3JlIH0gZnJvbSAnZmlyZWJhc2UtYWRtaW4vZmlyZXN0b3JlJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgQ29udHJhY3QgfSBmcm9tICcuLi9jbGllbnQvdHlwZXMvY29udHJhY3RzJztcblxubGV0IGlzRmlyZWJhc2VJbml0aWFsaXplZCA9IGZhbHNlO1xuXG4vLyBJbml0aWFsaXplIEZpcmViYXNlIEFkbWluIFNESyBpZiBub3QgYWxyZWFkeSBpbml0aWFsaXplZFxuaWYgKCFhZG1pbi5hcHBzLmxlbmd0aCkge1xuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKCdcdUQ4M0RcdUREMjUgSW5pdGlhbGl6aW5nIEZpcmViYXNlIEFkbWluIFNESy4uLicpO1xuXG4gICAgLy8gTWV0aG9kIDE6IFRyeSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZmlyc3QgKG1vc3Qgc2VjdXJlKVxuICAgIGlmIChwcm9jZXNzLmVudi5GSVJFQkFTRV9QUklWQVRFX0tFWSAmJiBwcm9jZXNzLmVudi5GSVJFQkFTRV9DTElFTlRfRU1BSUwpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0RcdURDQ0IgVXNpbmcgRmlyZWJhc2UgY3JlZGVudGlhbHMgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuLi4nKTtcblxuICAgICAgY29uc3Qgc2VydmljZUFjY291bnQgPSB7XG4gICAgICAgIHByb2plY3RJZDogcHJvY2Vzcy5lbnYuRklSRUJBU0VfUFJPSkVDVF9JRCB8fCAnc2VtcGxpc3dpdGNoJyxcbiAgICAgICAgY2xpZW50RW1haWw6IHByb2Nlc3MuZW52LkZJUkVCQVNFX0NMSUVOVF9FTUFJTCxcbiAgICAgICAgcHJpdmF0ZUtleTogcHJvY2Vzcy5lbnYuRklSRUJBU0VfUFJJVkFURV9LRVkucmVwbGFjZSgvXFxcXG4vZywgJ1xcbicpLFxuICAgICAgfTtcblxuICAgICAgYWRtaW4uaW5pdGlhbGl6ZUFwcCh7XG4gICAgICAgIGNyZWRlbnRpYWw6IGFkbWluLmNyZWRlbnRpYWwuY2VydChzZXJ2aWNlQWNjb3VudCksXG4gICAgICAgIHByb2plY3RJZDogJ3NlbXBsaXN3aXRjaCdcbiAgICAgIH0pO1xuXG4gICAgICBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBGaXJlYmFzZSBBZG1pbiBTREsgaW5pdGlhbGl6ZWQgd2l0aCBlbnZpcm9ubWVudCB2YXJpYWJsZXMnKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBNZXRob2QgMjogVHJ5IHNlcnZpY2UgYWNjb3VudCBmaWxlIChmYWxsYmFjaylcbiAgICAgIGNvbnN0IHNlcnZpY2VBY2NvdW50UGF0aCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnY3JlZGVudGlhbHMnLCAnZmlyZWJhc2UtYWRtaW4tY3JlZGVudGlhbHMuanNvbicpO1xuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1RENDMSBUcnlpbmcgc2VydmljZSBhY2NvdW50IGZpbGU6Jywgc2VydmljZUFjY291bnRQYXRoKTtcblxuICAgICAgLy8gQ2hlY2sgaWYgZmlsZSBleGlzdHMgYW5kIGlzIHZhbGlkXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhzZXJ2aWNlQWNjb3VudFBhdGgpKSB7XG4gICAgICAgIGNvbnN0IHNlcnZpY2VBY2NvdW50Q29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhzZXJ2aWNlQWNjb3VudFBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IHNlcnZpY2VBY2NvdW50ID0gSlNPTi5wYXJzZShzZXJ2aWNlQWNjb3VudENvbnRlbnQpO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgcHJpdmF0ZSBrZXkgaXMgY29tcGxldGVcbiAgICAgICAgaWYgKHNlcnZpY2VBY2NvdW50LnByaXZhdGVfa2V5ICYmIHNlcnZpY2VBY2NvdW50LnByaXZhdGVfa2V5Lmxlbmd0aCA+IDEwMCkge1xuICAgICAgICAgIGFkbWluLmluaXRpYWxpemVBcHAoe1xuICAgICAgICAgICAgY3JlZGVudGlhbDogYWRtaW4uY3JlZGVudGlhbC5jZXJ0KHNlcnZpY2VBY2NvdW50UGF0aCksXG4gICAgICAgICAgICBwcm9qZWN0SWQ6ICdzZW1wbGlzd2l0Y2gnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgRmlyZWJhc2UgQWRtaW4gU0RLIGluaXRpYWxpemVkIHdpdGggc2VydmljZSBhY2NvdW50IGZpbGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ1x1MjZBMFx1RkUwRiBTZXJ2aWNlIGFjY291bnQgZmlsZSBoYXMgaW5jb21wbGV0ZSBwcml2YXRlIGtleScpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW5jb21wbGV0ZSBwcml2YXRlIGtleSBpbiBzZXJ2aWNlIGFjY291bnQgZmlsZScpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1x1MjZBMFx1RkUwRiBTZXJ2aWNlIGFjY291bnQgZmlsZSBub3QgZm91bmQ6Jywgc2VydmljZUFjY291bnRQYXRoKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXJ2aWNlIGFjY291bnQgZmlsZSBub3QgZm91bmQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRmFpbGVkIHRvIGluaXRpYWxpemUgRmlyZWJhc2UgQWRtaW4gU0RLOicsIGVycm9yKTtcbiAgICBjb25zb2xlLmxvZyhgXG5cdUQ4M0RcdUREMjcgVG8gZml4IHRoaXMgRmlyZWJhc2UgQWRtaW4gYXV0aGVudGljYXRpb24gaXNzdWU6XG5cbk1FVEhPRCAxIC0gRW52aXJvbm1lbnQgVmFyaWFibGVzIChSZWNvbW1lbmRlZCk6XG5TZXQgdGhlc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzOlxuLSBGSVJFQkFTRV9QUk9KRUNUX0lEPXNlbXBsaXN3aXRjaFxuLSBGSVJFQkFTRV9DTElFTlRfRU1BSUw9ZmlyZWJhc2UtYWRtaW5zZGstZmJzdmNAc2VtcGxpc3dpdGNoLmlhbS5nc2VydmljZWFjY291bnQuY29tXG4tIEZJUkVCQVNFX1BSSVZBVEVfS0VZPVwiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXFxcXG5Zb3VyXFxcXG5Db21wbGV0ZVxcXFxuUHJpdmF0ZVxcXFxuS2V5XFxcXG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXFxcXG5cIlxuXG5NRVRIT0QgMiAtIEZpeCBTZXJ2aWNlIEFjY291bnQgRmlsZTpcbkVuc3VyZSB0aGUgY3JlZGVudGlhbHMvZmlyZWJhc2UtYWRtaW4tY3JlZGVudGlhbHMuanNvbiBmaWxlIGhhcyBhIGNvbXBsZXRlIHByaXZhdGVfa2V5IGZpZWxkXG5cbkZvciBub3csIHRoZSBzeXN0ZW0gd2lsbCBvcGVyYXRlIGluIGZhbGxiYWNrIG1vZGUgd2l0aCBsaW1pdGVkIGZ1bmN0aW9uYWxpdHkuXG4gICAgYCk7XG5cbiAgICAvLyBEb24ndCB0aHJvdyBlcnJvciAtIGFsbG93IHN5c3RlbSB0byBjb250aW51ZSB3aXRoIGZhbGxiYWNrc1xuICAgIGlzRmlyZWJhc2VJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG59XG5cbi8vIEV4cG9ydCBhZG1pbiBpbnN0YW5jZXMgKGNvbmRpdGlvbmFsIGJhc2VkIG9uIGluaXRpYWxpemF0aW9uKVxuZXhwb3J0IGNvbnN0IGFkbWluRGIgPSBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgPyBnZXRGaXJlc3RvcmUoKSA6IG51bGw7XG5leHBvcnQgY29uc3QgYWRtaW5BdXRoID0gaXNGaXJlYmFzZUluaXRpYWxpemVkID8gYWRtaW4uYXV0aCgpIDogbnVsbDtcbmV4cG9ydCBkZWZhdWx0IGFkbWluO1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gY2hlY2sgaWYgRmlyZWJhc2UgaXMgYXZhaWxhYmxlXG5leHBvcnQgY29uc3QgaXNGaXJlYmFzZUF2YWlsYWJsZSA9ICgpID0+IGlzRmlyZWJhc2VJbml0aWFsaXplZDtcblxuLy8gSGVscGVyIGZ1bmN0aW9ucyBmb3IgY29tbW9uIG9wZXJhdGlvbnNcbmV4cG9ydCBjb25zdCBhZG1pbk9wZXJhdGlvbnMgPSB7XG4gIC8vIENyZWF0ZSB1c2VyIHdpdGggY3VzdG9tIGNsYWltc1xuICBhc3luYyBjcmVhdGVVc2VyV2l0aFJvbGUodXNlckRhdGE6IHtcbiAgICBlbWFpbDogc3RyaW5nO1xuICAgIHBhc3N3b3JkOiBzdHJpbmc7XG4gICAgbm9tZTogc3RyaW5nO1xuICAgIGNvZ25vbWU/OiBzdHJpbmc7XG4gICAgcnVvbG86IHN0cmluZztcbiAgICBba2V5OiBzdHJpbmddOiBhbnk7XG4gIH0pIHtcbiAgICBpZiAoIWlzRmlyZWJhc2VJbml0aWFsaXplZCB8fCAhYWRtaW5BdXRoIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIFBsZWFzZSBjaGVjayBjcmVkZW50aWFscy4nKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gQ3JlYXRlIHVzZXIgaW4gQXV0aGVudGljYXRpb25cbiAgICAgIGNvbnN0IHVzZXJSZWNvcmQgPSBhd2FpdCBhZG1pbkF1dGguY3JlYXRlVXNlcih7XG4gICAgICAgIGVtYWlsOiB1c2VyRGF0YS5lbWFpbCxcbiAgICAgICAgcGFzc3dvcmQ6IHVzZXJEYXRhLnBhc3N3b3JkLFxuICAgICAgICBkaXNwbGF5TmFtZTogdXNlckRhdGEuY29nbm9tZSA/IGAke3VzZXJEYXRhLm5vbWV9ICR7dXNlckRhdGEuY29nbm9tZX1gIDogdXNlckRhdGEubm9tZSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZXQgY3VzdG9tIGNsYWltcyBmb3Igcm9sZVxuICAgICAgYXdhaXQgYWRtaW5BdXRoLnNldEN1c3RvbVVzZXJDbGFpbXModXNlclJlY29yZC51aWQsIHtcbiAgICAgICAgcm9sZTogdXNlckRhdGEucnVvbG9cbiAgICAgIH0pO1xuXG4gICAgICAvLyBTYXZlIHVzZXIgZGF0YSBpbiBGaXJlc3RvcmVcbiAgICAgIGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbigndXRlbnRpJykuZG9jKHVzZXJSZWNvcmQudWlkKS5zZXQoe1xuICAgICAgICB1aWQ6IHVzZXJSZWNvcmQudWlkLFxuICAgICAgICBlbWFpbDogdXNlckRhdGEuZW1haWwsXG4gICAgICAgIG5vbWU6IHVzZXJEYXRhLm5vbWUsXG4gICAgICAgIGNvZ25vbWU6IHVzZXJEYXRhLmNvZ25vbWUgfHwgJycsXG4gICAgICAgIHJ1b2xvOiB1c2VyRGF0YS5ydW9sbyxcbiAgICAgICAgYXR0aXZvOiB0cnVlLFxuICAgICAgICBjcmVhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpLFxuICAgICAgICAuLi51c2VyRGF0YVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgVXNlciBjcmVhdGVkIHN1Y2Nlc3NmdWxseTonLCB1c2VyUmVjb3JkLnVpZCk7XG4gICAgICByZXR1cm4gdXNlclJlY29yZDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIGNyZWF0aW5nIHVzZXI6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9LFxuXG4gIC8vIEdldCBhbGwgY29udHJhY3RzIHdpdGggYWRtaW4gcHJpdmlsZWdlc1xuICBhc3luYyBnZXRBbGxDb250cmFjdHMoKTogUHJvbWlzZTxDb250cmFjdFtdPiB7XG4gICAgaWYgKCFpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgfHwgIWFkbWluRGIpIHtcbiAgICAgIGNvbnNvbGUud2FybignXHUyNkEwXHVGRTBGIEZpcmViYXNlIG5vdCBhdmFpbGFibGUsIHJldHVybmluZyBlbXB0eSBjb250cmFjdHMgbGlzdCcpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzbmFwc2hvdCA9IGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuZ2V0KCk7XG4gICAgICByZXR1cm4gc25hcHNob3QuZG9jcy5tYXAoZG9jID0+ICh7XG4gICAgICAgIGlkOiBkb2MuaWQsXG4gICAgICAgIC4uLmRvYy5kYXRhKClcbiAgICAgIH0gYXMgQ29udHJhY3QpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIGZldGNoaW5nIGNvbnRyYWN0czonLCBlcnJvcik7XG4gICAgICAvLyBSZXR1cm4gZW1wdHkgYXJyYXkgaW5zdGVhZCBvZiB0aHJvd2luZyB0byBwcmV2ZW50IGJyZWFraW5nIHRoZSBVSVxuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfSxcblxuICAvLyBVcGRhdGUgY29udHJhY3Qgc3RhdHVzIHdpdGggYWRtaW4gcHJpdmlsZWdlc1xuICBhc3luYyB1cGRhdGVDb250cmFjdFN0YXR1cyhjb250cmFjdElkOiBzdHJpbmcsIHN0YXR1czogc3RyaW5nLCBub3Rlcz86IHN0cmluZykge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIENhbm5vdCB1cGRhdGUgY29udHJhY3Qgc3RhdHVzLicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ2NvbnRyYWN0cycpLmRvYyhjb250cmFjdElkKS51cGRhdGUoe1xuICAgICAgICBzdGF0b09mZmVydGE6IHN0YXR1cyxcbiAgICAgICAgbm90ZVN0YXRvT2ZmZXJ0YTogbm90ZXMgfHwgJycsXG4gICAgICAgIHVwZGF0ZWRBdDogYWRtaW4uZmlyZXN0b3JlLkZpZWxkVmFsdWUuc2VydmVyVGltZXN0YW1wKClcbiAgICAgIH0pO1xuXG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IENvbnRyYWN0IHN0YXR1cyB1cGRhdGVkOicsIGNvbnRyYWN0SWQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciB1cGRhdGluZyBjb250cmFjdDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVXBkYXRlIGZ1bGwgY29udHJhY3Qgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIHVwZGF0ZUNvbnRyYWN0KGNvbnRyYWN0SWQ6IHN0cmluZywgdXBkYXRlRGF0YTogUGFydGlhbDxDb250cmFjdD4pIHtcbiAgICBpZiAoIWlzRmlyZWJhc2VJbml0aWFsaXplZCB8fCAhYWRtaW5EYikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJlYmFzZSBBZG1pbiBTREsgbm90IHByb3Blcmx5IGluaXRpYWxpemVkLiBDYW5ub3QgdXBkYXRlIGNvbnRyYWN0LicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cGRhdGVGaWVsZHM6IGFueSA9IHtcbiAgICAgICAgdXBkYXRlZEF0OiBhZG1pbi5maXJlc3RvcmUuRmllbGRWYWx1ZS5zZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgfTtcblxuICAgICAgLy8gSGFuZGxlIGFsbCBwb3NzaWJsZSBDb250cmFjdCBwcm9wZXJ0aWVzXG4gICAgICBpZiAodXBkYXRlRGF0YS5zdGF0b09mZmVydGEpIHVwZGF0ZUZpZWxkcy5zdGF0b09mZmVydGEgPSB1cGRhdGVEYXRhLnN0YXRvT2ZmZXJ0YTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLm5vdGVTdGF0b09mZmVydGEgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLm5vdGVTdGF0b09mZmVydGEgPSB1cGRhdGVEYXRhLm5vdGVTdGF0b09mZmVydGE7XG4gICAgICBpZiAodXBkYXRlRGF0YS5jb250YXR0bykgdXBkYXRlRmllbGRzLmNvbnRhdHRvID0gdXBkYXRlRGF0YS5jb250YXR0bztcbiAgICAgIGlmICh1cGRhdGVEYXRhLnJhZ2lvbmVTb2NpYWxlICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5yYWdpb25lU29jaWFsZSA9IHVwZGF0ZURhdGEucmFnaW9uZVNvY2lhbGU7XG4gICAgICBpZiAodXBkYXRlRGF0YS5sb2NrICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5sb2NrID0gdXBkYXRlRGF0YS5sb2NrO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuY3Jvbm9sb2dpYVN0YXRpKSB1cGRhdGVGaWVsZHMuY3Jvbm9sb2dpYVN0YXRpID0gdXBkYXRlRGF0YS5jcm9ub2xvZ2lhU3RhdGk7XG4gICAgICBpZiAodXBkYXRlRGF0YS5kYXRhVWx0aW1hSW50ZWdyYXppb25lICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5kYXRhVWx0aW1hSW50ZWdyYXppb25lID0gdXBkYXRlRGF0YS5kYXRhVWx0aW1hSW50ZWdyYXppb25lO1xuICAgICAgaWYgKHVwZGF0ZURhdGEubnVvdmlQb2RBZ2dpdW50aSAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMubnVvdmlQb2RBZ2dpdW50aSA9IHVwZGF0ZURhdGEubnVvdmlQb2RBZ2dpdW50aTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmRvY3VtZW50aSkgdXBkYXRlRmllbGRzLmRvY3VtZW50aSA9IHVwZGF0ZURhdGEuZG9jdW1lbnRpO1xuICAgICAgaWYgKHVwZGF0ZURhdGEucG9kKSB1cGRhdGVGaWVsZHMucG9kID0gdXBkYXRlRGF0YS5wb2Q7XG4gICAgICBpZiAodXBkYXRlRGF0YS5wZHIpIHVwZGF0ZUZpZWxkcy5wZHIgPSB1cGRhdGVEYXRhLnBkcjtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmdlc3RvcmUpIHVwZGF0ZUZpZWxkcy5nZXN0b3JlID0gdXBkYXRlRGF0YS5nZXN0b3JlO1xuICAgICAgaWYgKHVwZGF0ZURhdGEudGlwb2xvZ2lhQ29udHJhdHRvKSB1cGRhdGVGaWVsZHMudGlwb2xvZ2lhQ29udHJhdHRvID0gdXBkYXRlRGF0YS50aXBvbG9naWFDb250cmF0dG87XG4gICAgICBpZiAodXBkYXRlRGF0YS5tYXN0ZXJSZWZlcmVuY2UgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLm1hc3RlclJlZmVyZW5jZSA9IHVwZGF0ZURhdGEubWFzdGVyUmVmZXJlbmNlO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuaXNCdXNpbmVzcyAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMuaXNCdXNpbmVzcyA9IHVwZGF0ZURhdGEuaXNCdXNpbmVzcztcblxuICAgICAgYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCdjb250cmFjdHMnKS5kb2MoY29udHJhY3RJZCkudXBkYXRlKHVwZGF0ZUZpZWxkcyk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgQ29udHJhY3QgdXBkYXRlZDonLCBjb250cmFjdElkKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3IgdXBkYXRpbmcgY29udHJhY3Q6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9LFxuXG4gIC8vIFNhdmUgbmV3IGNvbnRyYWN0IHdpdGggYWRtaW4gcHJpdmlsZWdlc1xuICBhc3luYyBzYXZlQ29udHJhY3QoY29udHJhY3REYXRhOiB7XG4gICAgY2xpZW50ZToge1xuICAgICAgbm9tZTogc3RyaW5nO1xuICAgICAgY29nbm9tZTogc3RyaW5nO1xuICAgICAgY29kaWNlRmlzY2FsZTogc3RyaW5nO1xuICAgICAgY2VsbHVsYXJlOiBzdHJpbmc7XG4gICAgICBlbWFpbDogc3RyaW5nO1xuICAgICAgaWJhbj86IHN0cmluZztcbiAgICB9O1xuICAgIGRvY3VtZW50bzoge1xuICAgICAgdGlwbzogc3RyaW5nO1xuICAgICAgbnVtZXJvPzogc3RyaW5nO1xuICAgICAgcmlsYXNjaWF0b0RhOiBzdHJpbmc7XG4gICAgICBkYXRhUmlsYXNjaW86IHN0cmluZztcbiAgICAgIGRhdGFTY2FkZW56YTogc3RyaW5nO1xuICAgIH07XG4gICAgaW5kaXJpenppOiB7XG4gICAgICByZXNpZGVuemE6IHtcbiAgICAgICAgdmlhOiBzdHJpbmc7XG4gICAgICAgIGNpdmljbzogc3RyaW5nO1xuICAgICAgICBjaXR0YTogc3RyaW5nO1xuICAgICAgICBjYXA6IHN0cmluZztcbiAgICAgIH07XG4gICAgICBmb3JuaXR1cmE6IHtcbiAgICAgICAgdmlhOiBzdHJpbmc7XG4gICAgICAgIGNpdmljbzogc3RyaW5nO1xuICAgICAgICBjaXR0YTogc3RyaW5nO1xuICAgICAgICBjYXA6IHN0cmluZztcbiAgICAgIH07XG4gICAgfTtcbiAgICBwb2Q/OiBzdHJpbmc7XG4gICAgcGRyPzogc3RyaW5nO1xuICAgIHBvdGVuemFJbXBlZ25hdGFLdz86IG51bWJlcjtcbiAgICB1c2lHYXM/OiBzdHJpbmdbXTtcbiAgICByZXNpZGVuemlhbGU/OiBzdHJpbmc7XG4gICAgb2ZmZXJ0ZTogYW55W107XG4gIH0sIHVzZXJJZDogc3RyaW5nLCB1c2VyTmFtZTogc3RyaW5nLCB1c2VyU3VybmFtZTogc3RyaW5nLCBtYXN0ZXJSZWZlcmVuY2U/OiBzdHJpbmcpIHtcbiAgICBpZiAoIWlzRmlyZWJhc2VJbml0aWFsaXplZCB8fCAhYWRtaW5EYikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJlYmFzZSBBZG1pbiBTREsgbm90IHByb3Blcmx5IGluaXRpYWxpemVkLiBDYW5ub3Qgc2F2ZSBjb250cmFjdC4nKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gR2VuZXJhdGUgdW5pcXVlIGNvbnRyYWN0IGNvZGVcbiAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgICBjb25zdCBjb2RpY2VVbml2b2NvT2ZmZXJ0YSA9IGBDT04tJHt0aW1lc3RhbXB9YDtcblxuICAgICAgLy8gRGV0ZXJtaW5lIGNvbnRyYWN0IHR5cGUgYW5kIHByb3ZpZGVyIGZyb20gc2VsZWN0ZWQgb2ZmZXJzXG4gICAgICBjb25zdCB0aXBvbG9naWFDb250cmF0dG8gPSBjb250cmFjdERhdGEub2ZmZXJ0ZS5zb21lKG9mZmVyID0+XG4gICAgICAgIG9mZmVyLnNlcnZpY2VUeXBlID09PSBcIkx1Y2VcIiB8fCBvZmZlci5zZXJ2aWNlVHlwZSA9PT0gXCJHYXNcIlxuICAgICAgKSA/IFwiZW5lcmdpYVwiIDogXCJ0ZWxlZm9uaWFcIjtcblxuICAgICAgY29uc3QgZ2VzdG9yZSA9IGNvbnRyYWN0RGF0YS5vZmZlcnRlWzBdPy5icmFuZCB8fCBcIlVOS05PV05cIjtcblxuICAgICAgLy8gQ3JlYXRlIGNvbnRyYWN0IGRvY3VtZW50IHdpdGggcHJvcGVyIHN0cnVjdHVyZVxuICAgICAgY29uc3QgY29udHJhY3RGb3JGaXJlYmFzZSA9IHtcbiAgICAgICAgY29kaWNlVW5pdm9jb09mZmVydGEsXG4gICAgICAgIGRhdGFDcmVhemlvbmU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdLCAvLyBZWVlZLU1NLUREIGZvcm1hdFxuICAgICAgICBjcmVhdG9EYToge1xuICAgICAgICAgIGlkOiB1c2VySWQsXG4gICAgICAgICAgbm9tZTogdXNlck5hbWUsXG4gICAgICAgICAgY29nbm9tZTogdXNlclN1cm5hbWVcbiAgICAgICAgfSxcbiAgICAgICAgY29udGF0dG86IHtcbiAgICAgICAgICBub21lOiBjb250cmFjdERhdGEuY2xpZW50ZS5ub21lLFxuICAgICAgICAgIGNvZ25vbWU6IGNvbnRyYWN0RGF0YS5jbGllbnRlLmNvZ25vbWUsXG4gICAgICAgICAgY29kaWNlRmlzY2FsZTogY29udHJhY3REYXRhLmNsaWVudGUuY29kaWNlRmlzY2FsZVxuICAgICAgICB9LFxuICAgICAgICBpc0J1c2luZXNzOiBmYWxzZSwgLy8gRGVmYXVsdCB0byByZXNpZGVudGlhbFxuICAgICAgICBzdGF0b09mZmVydGE6ICdDYXJpY2F0bycsXG4gICAgICAgIG5vdGVTdGF0b09mZmVydGE6ICdDb250cmF0dG8gYXBwZW5hIGNyZWF0bycsXG4gICAgICAgIGdlc3RvcmUsXG4gICAgICAgIG1hc3RlclJlZmVyZW5jZTogbWFzdGVyUmVmZXJlbmNlIHx8ICcnLFxuICAgICAgICB0aXBvbG9naWFDb250cmF0dG8sXG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBkZXRhaWxlZCBkYXRhXG4gICAgICAgIGRldHRhZ2xpQ2xpZW50ZToge1xuICAgICAgICAgIGNlbGx1bGFyZTogY29udHJhY3REYXRhLmNsaWVudGUuY2VsbHVsYXJlLFxuICAgICAgICAgIGVtYWlsOiBjb250cmFjdERhdGEuY2xpZW50ZS5lbWFpbCxcbiAgICAgICAgICBpYmFuOiBjb250cmFjdERhdGEuY2xpZW50ZS5pYmFuIHx8IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgZG9jdW1lbnRvOiBjb250cmFjdERhdGEuZG9jdW1lbnRvLFxuICAgICAgICBpbmRpcml6emk6IGNvbnRyYWN0RGF0YS5pbmRpcml6emksXG4gICAgICAgIGRhdGlUZWNuaWNpOiB7XG4gICAgICAgICAgcG9kOiBjb250cmFjdERhdGEucG9kIHx8IG51bGwsXG4gICAgICAgICAgcGRyOiBjb250cmFjdERhdGEucGRyIHx8IG51bGwsXG4gICAgICAgICAgcG90ZW56YUltcGVnbmF0YUt3OiBjb250cmFjdERhdGEucG90ZW56YUltcGVnbmF0YUt3IHx8IG51bGwsXG4gICAgICAgICAgdXNpR2FzOiBjb250cmFjdERhdGEudXNpR2FzIHx8IFtdLFxuICAgICAgICAgIHJlc2lkZW56aWFsZTogY29udHJhY3REYXRhLnJlc2lkZW56aWFsZSB8fCBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIG9mZmVydGU6IGNvbnRyYWN0RGF0YS5vZmZlcnRlIHx8IFtdLFxuXG4gICAgICAgIC8vIFRpbWVzdGFtcHNcbiAgICAgICAgY3JlYXRlZEF0OiBhZG1pbi5maXJlc3RvcmUuRmllbGRWYWx1ZS5zZXJ2ZXJUaW1lc3RhbXAoKSxcbiAgICAgICAgdXBkYXRlZEF0OiBhZG1pbi5maXJlc3RvcmUuRmllbGRWYWx1ZS5zZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgfTtcblxuICAgICAgLy8gQ2xlYW4gdW5kZWZpbmVkIHZhbHVlc1xuICAgICAgY29uc3QgY2xlYW5lZENvbnRyYWN0ID0gdGhpcy5jbGVhblVuZGVmaW5lZFZhbHVlcyhjb250cmFjdEZvckZpcmViYXNlKTtcblxuICAgICAgY29uc29sZS5sb2coJ1x1RkZGRFx1RkZGRFx1RkZGRCBTYXZpbmcgY29udHJhY3QgdmlhIEFkbWluIFNESzonLCBjbGVhbmVkQ29udHJhY3QpO1xuXG4gICAgICBjb25zdCBkb2NSZWYgPSBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ2NvbnRyYWN0cycpLmFkZChjbGVhbmVkQ29udHJhY3QpO1xuXG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IENvbnRyYWN0IHNhdmVkIHN1Y2Nlc3NmdWxseSB3aXRoIElEOicsIGRvY1JlZi5pZCk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGNvbnRyYWN0SWQ6IGRvY1JlZi5pZCxcbiAgICAgICAgY29kaWNlVW5pdm9jb09mZmVydGFcbiAgICAgIH07XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIHNhdmluZyBjb250cmFjdCB2aWEgQWRtaW4gU0RLOicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSxcblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY2xlYW4gdW5kZWZpbmVkIHZhbHVlc1xuICBjbGVhblVuZGVmaW5lZFZhbHVlcyhvYmo6IGFueSk6IGFueSB7XG4gICAgaWYgKG9iaiA9PT0gbnVsbCB8fCBvYmogPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuICAgICAgcmV0dXJuIG9iai5tYXAoaXRlbSA9PiB0aGlzLmNsZWFuVW5kZWZpbmVkVmFsdWVzKGl0ZW0pKS5maWx0ZXIoaXRlbSA9PiBpdGVtICE9PSB1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3QgY2xlYW5lZDogYW55ID0ge307XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2xlYW5lZFtrZXldID0gdGhpcy5jbGVhblVuZGVmaW5lZFZhbHVlcyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjbGVhbmVkO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgLy8gRGVsZXRlIGNvbnRyYWN0IHdpdGggYWRtaW4gcHJpdmlsZWdlc1xuICBhc3luYyBkZWxldGVDb250cmFjdChjb250cmFjdElkOiBzdHJpbmcpIHtcbiAgICBpZiAoIWlzRmlyZWJhc2VJbml0aWFsaXplZCB8fCAhYWRtaW5EYikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJlYmFzZSBBZG1pbiBTREsgbm90IHByb3Blcmx5IGluaXRpYWxpemVkLiBDYW5ub3QgZGVsZXRlIGNvbnRyYWN0LicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ2NvbnRyYWN0cycpLmRvYyhjb250cmFjdElkKS5kZWxldGUoKTtcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgQ29udHJhY3QgZGVsZXRlZDonLCBjb250cmFjdElkKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3IgZGVsZXRpbmcgY29udHJhY3Q6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59O1xuIiwgImltcG9ydCB7IENvbnRleHQgfSBmcm9tIFwiQG5ldGxpZnkvZnVuY3Rpb25zXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIChyZXF1ZXN0OiBSZXF1ZXN0LCBjb250ZXh0OiBDb250ZXh0KSA9PiB7XG4gIGlmIChyZXF1ZXN0Lm1ldGhvZCAhPT0gJ1BPU1QnKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSgnTWV0aG9kIG5vdCBhbGxvd2VkJywgeyBzdGF0dXM6IDQwNSB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuICAgIGNvbnN0IHsgbm9tZSwgZW1haWwsIHBhc3N3b3JkLCBydW9sbywgc3RhdG8sIHBpYW5vQ29tcGVuc2ksIGdlc3RvcmlBc3NlZ25hdGksIG1hc3RlciB9ID0gYm9keTtcblxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghbm9tZSB8fCAhZW1haWwgfHwgIXBhc3N3b3JkIHx8ICFydW9sbykge1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQ2FtcGkgb2JibGlnYXRvcmkgbWFuY2FudGknIH0pLCB7XG4gICAgICAgIHN0YXR1czogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVXNlIEZpcmViYXNlIEFkbWluIFNESyB0byBjcmVhdGUgdGhlIHVzZXJcbiAgICBjb25zdCB7IGFkbWluT3BlcmF0aW9ucyB9ID0gYXdhaXQgaW1wb3J0KCcuLi8uLi9zZXJ2ZXIvZmlyZWJhc2UtYWRtaW4nKTtcblxuICAgIGNvbnN0IHVzZXJSZWNvcmQgPSBhd2FpdCBhZG1pbk9wZXJhdGlvbnMuY3JlYXRlVXNlcldpdGhSb2xlKHtcbiAgICAgIGVtYWlsLFxuICAgICAgcGFzc3dvcmQsXG4gICAgICBub21lLFxuICAgICAgcnVvbG8sXG4gICAgICBzdGF0bzogc3RhdG8gPyBcImF0dGl2b1wiIDogXCJub24gYXR0aXZvXCIsXG4gICAgICBwaWFub0NvbXBlbnNpOiBwaWFub0NvbXBlbnNpIHx8IFwiXCIsXG4gICAgICBnZXN0b3JpQXNzZWduYXRpOiBnZXN0b3JpQXNzZWduYXRpIHx8IFtdLFxuICAgICAgbWFzdGVyUmlmZXJpbWVudG86IG1hc3RlciB8fCBcIlwiXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlx1MjcwNSBGaXJlYmFzZSB1c2VyIGNyZWF0ZWQ6XCIsIHVzZXJSZWNvcmQudWlkKTtcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIHVpZDogdXNlclJlY29yZC51aWQsXG4gICAgICBtZXNzYWdlOiBcIlV0ZW50ZSBjcmVhdG8gY29uIHN1Y2Nlc3NvIHRyYW1pdGUgRmlyZWJhc2UgQWRtaW5cIlxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHsgXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ1BPU1QsIE9QVElPTlMnXG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJcdTI3NEMgRXJyb3JlIGR1cmFudGUgbGEgY3JlYXppb25lIGRlbGwndXRlbnRlOlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICBlcnJvcjogJ0Vycm9yZSBpbnRlcm5vIGRlbCBzZXJ2ZXInLFxuICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSBcbiAgICB9KSwge1xuICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfVxuICAgIH0pO1xuICB9XG59O1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxvQkFBb0I7QUFDN0IsWUFBWSxVQUFVO0FBQ3RCLE9BQU8sUUFBUTtBQUhmLElBTUksdUJBNkVTLFNBQ0EsV0FDTix3QkFHTSxxQkFHQTtBQTNGYjtBQUFBO0FBTUEsSUFBSSx3QkFBd0I7QUFHNUIsUUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRO0FBQ3RCLFVBQUk7QUFDRixnQkFBUSxJQUFJLDhDQUF1QztBQUduRCxZQUFJLFFBQVEsSUFBSSx3QkFBd0IsUUFBUSxJQUFJLHVCQUF1QjtBQUN6RSxrQkFBUSxJQUFJLG9FQUE2RDtBQUV6RSxnQkFBTSxpQkFBaUI7QUFBQSxZQUNyQixXQUFXLFFBQVEsSUFBSSx1QkFBdUI7QUFBQSxZQUM5QyxhQUFhLFFBQVEsSUFBSTtBQUFBLFlBQ3pCLFlBQVksUUFBUSxJQUFJLHFCQUFxQixRQUFRLFFBQVEsSUFBSTtBQUFBLFVBQ25FO0FBRUEsZ0JBQU0sY0FBYztBQUFBLFlBQ2xCLFlBQVksTUFBTSxXQUFXLEtBQUssY0FBYztBQUFBLFlBQ2hELFdB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aUJBQU87QUFBQSxRQUNULFNBQVMsT0FBTztBQUNkLGtCQUFRLE1BQU0sbUNBQThCLEtBQUs7QUFDakQsZ0JBQU07QUFBQSxRQUNSO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBOzs7QUNuWEEsSUFBTyxzQkFBUSxPQUFPLFNBQWtCLFlBQXFCO0FBQzNELE1BQUksUUFBUSxXQUFXLFFBQVE7QUFDN0IsV0FBTyxJQUFJLFNBQVMsc0JBQXNCLEVBQUUsUUFBUSxJQUFJLENBQUM7QUFBQSxFQUMzRDtBQUVBLE1BQUk7QUFDRixVQUFNLE9BQU8sTUFBTSxRQUFRLEtBQUs7QUFDaEMsVUFBTSxFQUFFLE1BQU0sT0FBTyxVQUFVLE9BQU8sT0FBTyxlQUFlLGtCQUFrQixPQUFPLElBQUk7QUFHekYsUUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE9BQU87QUFDMUMsYUFBTyxJQUFJLFNBQVMsS0FBSyxVQUFVLEVBQUUsT0FBTyw2QkFBNkIsQ0FBQyxHQUFHO0FBQUEsUUFDM0UsUUFBUTtBQUFBLFFBQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxNQUNoRCxDQUFDO0FBQUEsSUFDSDtBQUdBLFVBQU0sRUFBRSxpQkFBQUEsaUJBQWdCLElBQUksTUFBTTtBQUVsQyxVQUFNLGFBQWEsTUFBTUEsaUJBQWdCLG1CQUFtQjtBQUFBLE1BQzFEO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQSxPQUFPLFFBQVEsV0FBVztBQUFBLE1BQzFCLGVBQWUsaUJBQWlCO0FBQUEsTUFDaEMsa0JBQWtCLG9CQUFvQixDQUFDO0FBQUEsTUFDdkMsbUJBQW1CLFVBQVU7QUFBQSxJQUMvQixDQUFDO0FBRUQsWUFBUSxJQUFJLGlDQUE0QixXQUFXLEdBQUc7QUFFdEQsV0FBTyxJQUFJLFNBQVMsS0FBSyxVQUFVO0FBQUEsTUFDakMsU0FBUztBQUFBLE1BQ1QsS0FBSyxXQUFXO0FBQUEsTUFDaEIsU0FBUztBQUFBLElBQ1gsQ0FBQyxHQUFHO0FBQUEsTUFDRixRQUFRO0FBQUEsTUFDUixTQUFTO0FBQUEsUUFDUCxnQkFBZ0I7QUFBQSxRQUNoQiwrQkFBK0I7QUFBQSxRQUMvQixnQ0FBZ0M7QUFBQSxRQUNoQyxnQ0FBZ0M7QUFBQSxNQUNsQztBQUFBLElBQ0YsQ0FBQztBQUFBLEVBRUgsU0FBUyxPQUFZO0FBQ25CLFlBQVEsTUFBTSxtREFBOEMsTUFBTSxPQUFPO0FBQ3pFLFdBQU8sSUFBSSxTQUFTLEtBQUssVUFBVTtBQUFBLE1BQ2pDLE9BQU87QUFBQSxNQUNQLFNBQVMsTUFBTTtBQUFBLElBQ2pCLENBQUMsR0FBRztBQUFBLE1BQ0YsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxJQUNoRCxDQUFDO0FBQUEsRUFDSDtBQUNGOyIsCiAgIm5hbWVzIjogWyJhZG1pbk9wZXJhdGlvbnMiXQp9Cg==
