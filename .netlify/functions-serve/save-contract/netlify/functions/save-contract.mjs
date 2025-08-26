
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

// netlify/functions/save-contract.ts
var save_contract_default = async (request, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), { status: 405, headers });
  }
  try {
    const requestBody = await request.json();
    const {
      contractData,
      userId,
      userName,
      userSurname,
      masterReference
    } = requestBody;
    if (!contractData || !userId || !userName || !userSurname) {
      return new Response(JSON.stringify({
        error: "Missing required fields: contractData, userId, userName, userSurname"
      }), { status: 400, headers });
    }
    if (!contractData.cliente || !contractData.cliente.nome || !contractData.cliente.cognome) {
      return new Response(JSON.stringify({
        error: "Invalid contract data: missing client information"
      }), { status: 400, headers });
    }
    const { adminOperations: adminOperations2 } = await Promise.resolve().then(() => (init_firebase_admin(), firebase_admin_exports));
    const result = await adminOperations2.saveContract(
      contractData,
      userId,
      userName,
      userSurname,
      masterReference
    );
    return new Response(JSON.stringify({
      success: true,
      message: "Contract saved successfully",
      data: result
    }), { status: 200, headers });
  } catch (error) {
    console.error("\u274C Save contract API error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), { status: 500, headers });
  }
};
export {
  save_contract_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic2VydmVyL2ZpcmViYXNlLWFkbWluLnRzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL3NhdmUtY29udHJhY3QudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBhZG1pbiBmcm9tICdmaXJlYmFzZS1hZG1pbic7XG5pbXBvcnQgeyBnZXRGaXJlc3RvcmUgfSBmcm9tICdmaXJlYmFzZS1hZG1pbi9maXJlc3RvcmUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBDb250cmFjdCB9IGZyb20gJy4uL2NsaWVudC90eXBlcy9jb250cmFjdHMnO1xuXG5sZXQgaXNGaXJlYmFzZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbi8vIEluaXRpYWxpemUgRmlyZWJhc2UgQWRtaW4gU0RLIGlmIG5vdCBhbHJlYWR5IGluaXRpYWxpemVkXG5pZiAoIWFkbWluLmFwcHMubGVuZ3RoKSB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ1x1RDgzRFx1REQyNSBJbml0aWFsaXppbmcgRmlyZWJhc2UgQWRtaW4gU0RLLi4uJyk7XG5cbiAgICAvLyBNZXRob2QgMTogVHJ5IGVudmlyb25tZW50IHZhcmlhYmxlcyBmaXJzdCAobW9zdCBzZWN1cmUpXG4gICAgaWYgKHByb2Nlc3MuZW52LkZJUkVCQVNFX1BSSVZBVEVfS0VZICYmIHByb2Nlc3MuZW52LkZJUkVCQVNFX0NMSUVOVF9FTUFJTCkge1xuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1RENDQiBVc2luZyBGaXJlYmFzZSBjcmVkZW50aWFscyBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy4uLicpO1xuXG4gICAgICBjb25zdCBzZXJ2aWNlQWNjb3VudCA9IHtcbiAgICAgICAgcHJvamVjdElkOiBwcm9jZXNzLmVudi5GSVJFQkFTRV9QUk9KRUNUX0lEIHx8ICdzZW1wbGlzd2l0Y2gnLFxuICAgICAgICBjbGllbnRFbWFpbDogcHJvY2Vzcy5lbnYuRklSRUJBU0VfQ0xJRU5UX0VNQUlMLFxuICAgICAgICBwcml2YXRlS2V5OiBwcm9jZXNzLmVudi5GSVJFQkFTRV9QUklWQVRFX0tFWS5yZXBsYWNlKC9cXFxcbi9nLCAnXFxuJyksXG4gICAgICB9O1xuXG4gICAgICBhZG1pbi5pbml0aWFsaXplQXBwKHtcbiAgICAgICAgY3JlZGVudGlhbDogYWRtaW4uY3JlZGVudGlhbC5jZXJ0KHNlcnZpY2VBY2NvdW50KSxcbiAgICAgICAgcHJvamVjdElkOiAnc2VtcGxpc3dpdGNoJ1xuICAgICAgfSk7XG5cbiAgICAgIGlzRmlyZWJhc2VJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IEZpcmViYXNlIEFkbWluIFNESyBpbml0aWFsaXplZCB3aXRoIGVudmlyb25tZW50IHZhcmlhYmxlcycpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE1ldGhvZCAyOiBUcnkgc2VydmljZSBhY2NvdW50IGZpbGUgKGZhbGxiYWNrKVxuICAgICAgY29uc3Qgc2VydmljZUFjY291bnRQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdjcmVkZW50aWFscycsICdmaXJlYmFzZS1hZG1pbi1jcmVkZW50aWFscy5qc29uJyk7XG4gICAgICBjb25zb2xlLmxvZygnXHVEODNEXHVEQ0MxIFRyeWluZyBzZXJ2aWNlIGFjY291bnQgZmlsZTonLCBzZXJ2aWNlQWNjb3VudFBhdGgpO1xuXG4gICAgICAvLyBDaGVjayBpZiBmaWxlIGV4aXN0cyBhbmQgaXMgdmFsaWRcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNlcnZpY2VBY2NvdW50UGF0aCkpIHtcbiAgICAgICAgY29uc3Qgc2VydmljZUFjY291bnRDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHNlcnZpY2VBY2NvdW50UGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3Qgc2VydmljZUFjY291bnQgPSBKU09OLnBhcnNlKHNlcnZpY2VBY2NvdW50Q29udGVudCk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCBwcml2YXRlIGtleSBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoc2VydmljZUFjY291bnQucHJpdmF0ZV9rZXkgJiYgc2VydmljZUFjY291bnQucHJpdmF0ZV9rZXkubGVuZ3RoID4gMTAwKSB7XG4gICAgICAgICAgYWRtaW4uaW5pdGlhbGl6ZUFwcCh7XG4gICAgICAgICAgICBjcmVkZW50aWFsOiBhZG1pbi5jcmVkZW50aWFsLmNlcnQoc2VydmljZUFjY291bnRQYXRoKSxcbiAgICAgICAgICAgIHByb2plY3RJZDogJ3NlbXBsaXN3aXRjaCdcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlzRmlyZWJhc2VJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBGaXJlYmFzZSBBZG1pbiBTREsgaW5pdGlhbGl6ZWQgd2l0aCBzZXJ2aWNlIGFjY291bnQgZmlsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2FybignXHUyNkEwXHVGRTBGIFNlcnZpY2UgYWNjb3VudCBmaWxlIGhhcyBpbmNvbXBsZXRlIHByaXZhdGUga2V5Jyk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvbXBsZXRlIHByaXZhdGUga2V5IGluIHNlcnZpY2UgYWNjb3VudCBmaWxlJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybignXHUyNkEwXHVGRTBGIFNlcnZpY2UgYWNjb3VudCBmaWxlIG5vdCBmb3VuZDonLCBzZXJ2aWNlQWNjb3VudFBhdGgpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlcnZpY2UgYWNjb3VudCBmaWxlIG5vdCBmb3VuZCcpO1xuICAgICAgfVxuICAgIH1cblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBGYWlsZWQgdG8gaW5pdGlhbGl6ZSBGaXJlYmFzZSBBZG1pbiBTREs6JywgZXJyb3IpO1xuICAgIGNvbnNvbGUubG9nKGBcblx1RDgzRFx1REQyNyBUbyBmaXggdGhpcyBGaXJlYmFzZSBBZG1pbiBhdXRoZW50aWNhdGlvbiBpc3N1ZTpcblxuTUVUSE9EIDEgLSBFbnZpcm9ubWVudCBWYXJpYWJsZXMgKFJlY29tbWVuZGVkKTpcblNldCB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXM6XG4tIEZJUkVCQVNFX1BST0pFQ1RfSUQ9c2VtcGxpc3dpdGNoXG4tIEZJUkVCQVNFX0NMSUVOVF9FTUFJTD1maXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BzZW1wbGlzd2l0Y2guaWFtLmdzZXJ2aWNlYWNjb3VudC5jb21cbi0gRklSRUJBU0VfUFJJVkFURV9LRVk9XCItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cXFxcbllvdXJcXFxcbkNvbXBsZXRlXFxcXG5Qcml2YXRlXFxcXG5LZXlcXFxcbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cXFxcblwiXG5cbk1FVEhPRCAyIC0gRml4IFNlcnZpY2UgQWNjb3VudCBGaWxlOlxuRW5zdXJlIHRoZSBjcmVkZW50aWFscy9maXJlYmFzZS1hZG1pbi1jcmVkZW50aWFscy5qc29uIGZpbGUgaGFzIGEgY29tcGxldGUgcHJpdmF0ZV9rZXkgZmllbGRcblxuRm9yIG5vdywgdGhlIHN5c3RlbSB3aWxsIG9wZXJhdGUgaW4gZmFsbGJhY2sgbW9kZSB3aXRoIGxpbWl0ZWQgZnVuY3Rpb25hbGl0eS5cbiAgICBgKTtcblxuICAgIC8vIERvbid0IHRocm93IGVycm9yIC0gYWxsb3cgc3lzdGVtIHRvIGNvbnRpbnVlIHdpdGggZmFsbGJhY2tzXG4gICAgaXNGaXJlYmFzZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cbn1cblxuLy8gRXhwb3J0IGFkbWluIGluc3RhbmNlcyAoY29uZGl0aW9uYWwgYmFzZWQgb24gaW5pdGlhbGl6YXRpb24pXG5leHBvcnQgY29uc3QgYWRtaW5EYiA9IGlzRmlyZWJhc2VJbml0aWFsaXplZCA/IGdldEZpcmVzdG9yZSgpIDogbnVsbDtcbmV4cG9ydCBjb25zdCBhZG1pbkF1dGggPSBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgPyBhZG1pbi5hdXRoKCkgOiBudWxsO1xuZXhwb3J0IGRlZmF1bHQgYWRtaW47XG5cbi8vIEhlbHBlciBmdW5jdGlvbiB0byBjaGVjayBpZiBGaXJlYmFzZSBpcyBhdmFpbGFibGVcbmV4cG9ydCBjb25zdCBpc0ZpcmViYXNlQXZhaWxhYmxlID0gKCkgPT4gaXNGaXJlYmFzZUluaXRpYWxpemVkO1xuXG4vLyBIZWxwZXIgZnVuY3Rpb25zIGZvciBjb21tb24gb3BlcmF0aW9uc1xuZXhwb3J0IGNvbnN0IGFkbWluT3BlcmF0aW9ucyA9IHtcbiAgLy8gQ3JlYXRlIHVzZXIgd2l0aCBjdXN0b20gY2xhaW1zXG4gIGFzeW5jIGNyZWF0ZVVzZXJXaXRoUm9sZSh1c2VyRGF0YToge1xuICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgcGFzc3dvcmQ6IHN0cmluZztcbiAgICBub21lOiBzdHJpbmc7XG4gICAgY29nbm9tZT86IHN0cmluZztcbiAgICBydW9sbzogc3RyaW5nO1xuICAgIFtrZXk6IHN0cmluZ106IGFueTtcbiAgfSkge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkF1dGggfHwgIWFkbWluRGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgQWRtaW4gU0RLIG5vdCBwcm9wZXJseSBpbml0aWFsaXplZC4gUGxlYXNlIGNoZWNrIGNyZWRlbnRpYWxzLicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBBdXRoZW50aWNhdGlvblxuICAgICAgY29uc3QgdXNlclJlY29yZCA9IGF3YWl0IGFkbWluQXV0aC5jcmVhdGVVc2VyKHtcbiAgICAgICAgZW1haWw6IHVzZXJEYXRhLmVtYWlsLFxuICAgICAgICBwYXNzd29yZDogdXNlckRhdGEucGFzc3dvcmQsXG4gICAgICAgIGRpc3BsYXlOYW1lOiB1c2VyRGF0YS5jb2dub21lID8gYCR7dXNlckRhdGEubm9tZX0gJHt1c2VyRGF0YS5jb2dub21lfWAgOiB1c2VyRGF0YS5ub21lLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFNldCBjdXN0b20gY2xhaW1zIGZvciByb2xlXG4gICAgICBhd2FpdCBhZG1pbkF1dGguc2V0Q3VzdG9tVXNlckNsYWltcyh1c2VyUmVjb3JkLnVpZCwge1xuICAgICAgICByb2xlOiB1c2VyRGF0YS5ydW9sb1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNhdmUgdXNlciBkYXRhIGluIEZpcmVzdG9yZVxuICAgICAgYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCd1dGVudGknKS5kb2ModXNlclJlY29yZC51aWQpLnNldCh7XG4gICAgICAgIHVpZDogdXNlclJlY29yZC51aWQsXG4gICAgICAgIGVtYWlsOiB1c2VyRGF0YS5lbWFpbCxcbiAgICAgICAgbm9tZTogdXNlckRhdGEubm9tZSxcbiAgICAgICAgY29nbm9tZTogdXNlckRhdGEuY29nbm9tZSB8fCAnJyxcbiAgICAgICAgcnVvbG86IHVzZXJEYXRhLnJ1b2xvLFxuICAgICAgICBhdHRpdm86IHRydWUsXG4gICAgICAgIGNyZWF0ZWRBdDogYWRtaW4uZmlyZXN0b3JlLkZpZWxkVmFsdWUuc2VydmVyVGltZXN0YW1wKCksXG4gICAgICAgIC4uLnVzZXJEYXRhXG4gICAgICB9KTtcblxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBVc2VyIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5OicsIHVzZXJSZWNvcmQudWlkKTtcbiAgICAgIHJldHVybiB1c2VyUmVjb3JkO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3IgY3JlYXRpbmcgdXNlcjonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sXG5cbiAgLy8gR2V0IGFsbCBjb250cmFjdHMgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIGdldEFsbENvbnRyYWN0cygpOiBQcm9taXNlPENvbnRyYWN0W10+IHtcbiAgICBpZiAoIWlzRmlyZWJhc2VJbml0aWFsaXplZCB8fCAhYWRtaW5EYikge1xuICAgICAgY29uc29sZS53YXJuKCdcdTI2QTBcdUZFMEYgRmlyZWJhc2Ugbm90IGF2YWlsYWJsZSwgcmV0dXJuaW5nIGVtcHR5IGNvbnRyYWN0cyBsaXN0Jyk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNuYXBzaG90ID0gYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCdjb250cmFjdHMnKS5nZXQoKTtcbiAgICAgIHJldHVybiBzbmFwc2hvdC5kb2NzLm1hcChkb2MgPT4gKHtcbiAgICAgICAgaWQ6IGRvYy5pZCxcbiAgICAgICAgLi4uZG9jLmRhdGEoKVxuICAgICAgfSBhcyBDb250cmFjdCkpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3IgZmV0Y2hpbmcgY29udHJhY3RzOicsIGVycm9yKTtcbiAgICAgIC8vIFJldHVybiBlbXB0eSBhcnJheSBpbnN0ZWFkIG9mIHRocm93aW5nIHRvIHByZXZlbnQgYnJlYWtpbmcgdGhlIFVJXG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9LFxuXG4gIC8vIFVwZGF0ZSBjb250cmFjdCBzdGF0dXMgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIHVwZGF0ZUNvbnRyYWN0U3RhdHVzKGNvbnRyYWN0SWQ6IHN0cmluZywgc3RhdHVzOiBzdHJpbmcsIG5vdGVzPzogc3RyaW5nKSB7XG4gICAgaWYgKCFpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgfHwgIWFkbWluRGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgQWRtaW4gU0RLIG5vdCBwcm9wZXJseSBpbml0aWFsaXplZC4gQ2Fubm90IHVwZGF0ZSBjb250cmFjdCBzdGF0dXMuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuZG9jKGNvbnRyYWN0SWQpLnVwZGF0ZSh7XG4gICAgICAgIHN0YXRvT2ZmZXJ0YTogc3RhdHVzLFxuICAgICAgICBub3RlU3RhdG9PZmZlcnRhOiBub3RlcyB8fCAnJyxcbiAgICAgICAgdXBkYXRlZEF0OiBhZG1pbi5maXJlc3RvcmUuRmllbGRWYWx1ZS5zZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgQ29udHJhY3Qgc3RhdHVzIHVwZGF0ZWQ6JywgY29udHJhY3RJZCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIHVwZGF0aW5nIGNvbnRyYWN0OicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSxcblxuICAvLyBVcGRhdGUgZnVsbCBjb250cmFjdCB3aXRoIGFkbWluIHByaXZpbGVnZXNcbiAgYXN5bmMgdXBkYXRlQ29udHJhY3QoY29udHJhY3RJZDogc3RyaW5nLCB1cGRhdGVEYXRhOiBQYXJ0aWFsPENvbnRyYWN0Pikge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIENhbm5vdCB1cGRhdGUgY29udHJhY3QuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVwZGF0ZUZpZWxkczogYW55ID0ge1xuICAgICAgICB1cGRhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpXG4gICAgICB9O1xuXG4gICAgICAvLyBIYW5kbGUgYWxsIHBvc3NpYmxlIENvbnRyYWN0IHByb3BlcnRpZXNcbiAgICAgIGlmICh1cGRhdGVEYXRhLnN0YXRvT2ZmZXJ0YSkgdXBkYXRlRmllbGRzLnN0YXRvT2ZmZXJ0YSA9IHVwZGF0ZURhdGEuc3RhdG9PZmZlcnRhO1xuICAgICAgaWYgKHVwZGF0ZURhdGEubm90ZVN0YXRvT2ZmZXJ0YSAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMubm90ZVN0YXRvT2ZmZXJ0YSA9IHVwZGF0ZURhdGEubm90ZVN0YXRvT2ZmZXJ0YTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmNvbnRhdHRvKSB1cGRhdGVGaWVsZHMuY29udGF0dG8gPSB1cGRhdGVEYXRhLmNvbnRhdHRvO1xuICAgICAgaWYgKHVwZGF0ZURhdGEucmFnaW9uZVNvY2lhbGUgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLnJhZ2lvbmVTb2NpYWxlID0gdXBkYXRlRGF0YS5yYWdpb25lU29jaWFsZTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmxvY2sgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLmxvY2sgPSB1cGRhdGVEYXRhLmxvY2s7XG4gICAgICBpZiAodXBkYXRlRGF0YS5jcm9ub2xvZ2lhU3RhdGkpIHVwZGF0ZUZpZWxkcy5jcm9ub2xvZ2lhU3RhdGkgPSB1cGRhdGVEYXRhLmNyb25vbG9naWFTdGF0aTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmRhdGFVbHRpbWFJbnRlZ3JhemlvbmUgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLmRhdGFVbHRpbWFJbnRlZ3JhemlvbmUgPSB1cGRhdGVEYXRhLmRhdGFVbHRpbWFJbnRlZ3JhemlvbmU7XG4gICAgICBpZiAodXBkYXRlRGF0YS5udW92aVBvZEFnZ2l1bnRpICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5udW92aVBvZEFnZ2l1bnRpID0gdXBkYXRlRGF0YS5udW92aVBvZEFnZ2l1bnRpO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuZG9jdW1lbnRpKSB1cGRhdGVGaWVsZHMuZG9jdW1lbnRpID0gdXBkYXRlRGF0YS5kb2N1bWVudGk7XG4gICAgICBpZiAodXBkYXRlRGF0YS5wb2QpIHVwZGF0ZUZpZWxkcy5wb2QgPSB1cGRhdGVEYXRhLnBvZDtcbiAgICAgIGlmICh1cGRhdGVEYXRhLnBkcikgdXBkYXRlRmllbGRzLnBkciA9IHVwZGF0ZURhdGEucGRyO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuZ2VzdG9yZSkgdXBkYXRlRmllbGRzLmdlc3RvcmUgPSB1cGRhdGVEYXRhLmdlc3RvcmU7XG4gICAgICBpZiAodXBkYXRlRGF0YS50aXBvbG9naWFDb250cmF0dG8pIHVwZGF0ZUZpZWxkcy50aXBvbG9naWFDb250cmF0dG8gPSB1cGRhdGVEYXRhLnRpcG9sb2dpYUNvbnRyYXR0bztcbiAgICAgIGlmICh1cGRhdGVEYXRhLm1hc3RlclJlZmVyZW5jZSAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMubWFzdGVyUmVmZXJlbmNlID0gdXBkYXRlRGF0YS5tYXN0ZXJSZWZlcmVuY2U7XG4gICAgICBpZiAodXBkYXRlRGF0YS5pc0J1c2luZXNzICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5pc0J1c2luZXNzID0gdXBkYXRlRGF0YS5pc0J1c2luZXNzO1xuXG4gICAgICBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ2NvbnRyYWN0cycpLmRvYyhjb250cmFjdElkKS51cGRhdGUodXBkYXRlRmllbGRzKTtcblxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDb250cmFjdCB1cGRhdGVkOicsIGNvbnRyYWN0SWQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciB1cGRhdGluZyBjb250cmFjdDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sXG5cbiAgLy8gU2F2ZSBuZXcgY29udHJhY3Qgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIHNhdmVDb250cmFjdChjb250cmFjdERhdGE6IHtcbiAgICBjbGllbnRlOiB7XG4gICAgICBub21lOiBzdHJpbmc7XG4gICAgICBjb2dub21lOiBzdHJpbmc7XG4gICAgICBjb2RpY2VGaXNjYWxlOiBzdHJpbmc7XG4gICAgICBjZWxsdWxhcmU6IHN0cmluZztcbiAgICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgICBpYmFuPzogc3RyaW5nO1xuICAgIH07XG4gICAgZG9jdW1lbnRvOiB7XG4gICAgICB0aXBvOiBzdHJpbmc7XG4gICAgICBudW1lcm8/OiBzdHJpbmc7XG4gICAgICByaWxhc2NpYXRvRGE6IHN0cmluZztcbiAgICAgIGRhdGFSaWxhc2Npbzogc3RyaW5nO1xuICAgICAgZGF0YVNjYWRlbnphOiBzdHJpbmc7XG4gICAgfTtcbiAgICBpbmRpcml6emk6IHtcbiAgICAgIHJlc2lkZW56YToge1xuICAgICAgICB2aWE6IHN0cmluZztcbiAgICAgICAgY2l2aWNvOiBzdHJpbmc7XG4gICAgICAgIGNpdHRhOiBzdHJpbmc7XG4gICAgICAgIGNhcDogc3RyaW5nO1xuICAgICAgfTtcbiAgICAgIGZvcm5pdHVyYToge1xuICAgICAgICB2aWE6IHN0cmluZztcbiAgICAgICAgY2l2aWNvOiBzdHJpbmc7XG4gICAgICAgIGNpdHRhOiBzdHJpbmc7XG4gICAgICAgIGNhcDogc3RyaW5nO1xuICAgICAgfTtcbiAgICB9O1xuICAgIHBvZD86IHN0cmluZztcbiAgICBwZHI/OiBzdHJpbmc7XG4gICAgcG90ZW56YUltcGVnbmF0YUt3PzogbnVtYmVyO1xuICAgIHVzaUdhcz86IHN0cmluZ1tdO1xuICAgIHJlc2lkZW56aWFsZT86IHN0cmluZztcbiAgICBvZmZlcnRlOiBhbnlbXTtcbiAgfSwgdXNlcklkOiBzdHJpbmcsIHVzZXJOYW1lOiBzdHJpbmcsIHVzZXJTdXJuYW1lOiBzdHJpbmcsIG1hc3RlclJlZmVyZW5jZT86IHN0cmluZykge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIENhbm5vdCBzYXZlIGNvbnRyYWN0LicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBHZW5lcmF0ZSB1bmlxdWUgY29udHJhY3QgY29kZVxuICAgICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICAgIGNvbnN0IGNvZGljZVVuaXZvY29PZmZlcnRhID0gYENPTi0ke3RpbWVzdGFtcH1gO1xuXG4gICAgICAvLyBEZXRlcm1pbmUgY29udHJhY3QgdHlwZSBhbmQgcHJvdmlkZXIgZnJvbSBzZWxlY3RlZCBvZmZlcnNcbiAgICAgIGNvbnN0IHRpcG9sb2dpYUNvbnRyYXR0byA9IGNvbnRyYWN0RGF0YS5vZmZlcnRlLnNvbWUob2ZmZXIgPT5cbiAgICAgICAgb2ZmZXIuc2VydmljZVR5cGUgPT09IFwiTHVjZVwiIHx8IG9mZmVyLnNlcnZpY2VUeXBlID09PSBcIkdhc1wiXG4gICAgICApID8gXCJlbmVyZ2lhXCIgOiBcInRlbGVmb25pYVwiO1xuXG4gICAgICBjb25zdCBnZXN0b3JlID0gY29udHJhY3REYXRhLm9mZmVydGVbMF0/LmJyYW5kIHx8IFwiVU5LTk9XTlwiO1xuXG4gICAgICAvLyBDcmVhdGUgY29udHJhY3QgZG9jdW1lbnQgd2l0aCBwcm9wZXIgc3RydWN0dXJlXG4gICAgICBjb25zdCBjb250cmFjdEZvckZpcmViYXNlID0ge1xuICAgICAgICBjb2RpY2VVbml2b2NvT2ZmZXJ0YSxcbiAgICAgICAgZGF0YUNyZWF6aW9uZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF0sIC8vIFlZWVktTU0tREQgZm9ybWF0XG4gICAgICAgIGNyZWF0b0RhOiB7XG4gICAgICAgICAgaWQ6IHVzZXJJZCxcbiAgICAgICAgICBub21lOiB1c2VyTmFtZSxcbiAgICAgICAgICBjb2dub21lOiB1c2VyU3VybmFtZVxuICAgICAgICB9LFxuICAgICAgICBjb250YXR0bzoge1xuICAgICAgICAgIG5vbWU6IGNvbnRyYWN0RGF0YS5jbGllbnRlLm5vbWUsXG4gICAgICAgICAgY29nbm9tZTogY29udHJhY3REYXRhLmNsaWVudGUuY29nbm9tZSxcbiAgICAgICAgICBjb2RpY2VGaXNjYWxlOiBjb250cmFjdERhdGEuY2xpZW50ZS5jb2RpY2VGaXNjYWxlXG4gICAgICAgIH0sXG4gICAgICAgIGlzQnVzaW5lc3M6IGZhbHNlLCAvLyBEZWZhdWx0IHRvIHJlc2lkZW50aWFsXG4gICAgICAgIHN0YXRvT2ZmZXJ0YTogJ0NhcmljYXRvJyxcbiAgICAgICAgbm90ZVN0YXRvT2ZmZXJ0YTogJ0NvbnRyYXR0byBhcHBlbmEgY3JlYXRvJyxcbiAgICAgICAgZ2VzdG9yZSxcbiAgICAgICAgbWFzdGVyUmVmZXJlbmNlOiBtYXN0ZXJSZWZlcmVuY2UgfHwgJycsXG4gICAgICAgIHRpcG9sb2dpYUNvbnRyYXR0byxcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGRldGFpbGVkIGRhdGFcbiAgICAgICAgZGV0dGFnbGlDbGllbnRlOiB7XG4gICAgICAgICAgY2VsbHVsYXJlOiBjb250cmFjdERhdGEuY2xpZW50ZS5jZWxsdWxhcmUsXG4gICAgICAgICAgZW1haWw6IGNvbnRyYWN0RGF0YS5jbGllbnRlLmVtYWlsLFxuICAgICAgICAgIGliYW46IGNvbnRyYWN0RGF0YS5jbGllbnRlLmliYW4gfHwgbnVsbFxuICAgICAgICB9LFxuICAgICAgICBkb2N1bWVudG86IGNvbnRyYWN0RGF0YS5kb2N1bWVudG8sXG4gICAgICAgIGluZGlyaXp6aTogY29udHJhY3REYXRhLmluZGlyaXp6aSxcbiAgICAgICAgZGF0aVRlY25pY2k6IHtcbiAgICAgICAgICBwb2Q6IGNvbnRyYWN0RGF0YS5wb2QgfHwgbnVsbCxcbiAgICAgICAgICBwZHI6IGNvbnRyYWN0RGF0YS5wZHIgfHwgbnVsbCxcbiAgICAgICAgICBwb3RlbnphSW1wZWduYXRhS3c6IGNvbnRyYWN0RGF0YS5wb3RlbnphSW1wZWduYXRhS3cgfHwgbnVsbCxcbiAgICAgICAgICB1c2lHYXM6IGNvbnRyYWN0RGF0YS51c2lHYXMgfHwgW10sXG4gICAgICAgICAgcmVzaWRlbnppYWxlOiBjb250cmFjdERhdGEucmVzaWRlbnppYWxlIHx8IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmZXJ0ZTogY29udHJhY3REYXRhLm9mZmVydGUgfHwgW10sXG5cbiAgICAgICAgLy8gVGltZXN0YW1wc1xuICAgICAgICBjcmVhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpLFxuICAgICAgICB1cGRhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpXG4gICAgICB9O1xuXG4gICAgICAvLyBDbGVhbiB1bmRlZmluZWQgdmFsdWVzXG4gICAgICBjb25zdCBjbGVhbmVkQ29udHJhY3QgPSB0aGlzLmNsZWFuVW5kZWZpbmVkVmFsdWVzKGNvbnRyYWN0Rm9yRmlyZWJhc2UpO1xuXG4gICAgICBjb25zb2xlLmxvZygnXHVGRkZEXHVGRkZEXHVGRkZEIFNhdmluZyBjb250cmFjdCB2aWEgQWRtaW4gU0RLOicsIGNsZWFuZWRDb250cmFjdCk7XG5cbiAgICAgIGNvbnN0IGRvY1JlZiA9IGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuYWRkKGNsZWFuZWRDb250cmFjdCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgQ29udHJhY3Qgc2F2ZWQgc3VjY2Vzc2Z1bGx5IHdpdGggSUQ6JywgZG9jUmVmLmlkKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgY29udHJhY3RJZDogZG9jUmVmLmlkLFxuICAgICAgICBjb2RpY2VVbml2b2NvT2ZmZXJ0YVxuICAgICAgfTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3Igc2F2aW5nIGNvbnRyYWN0IHZpYSBBZG1pbiBTREs6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9LFxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjbGVhbiB1bmRlZmluZWQgdmFsdWVzXG4gIGNsZWFuVW5kZWZpbmVkVmFsdWVzKG9iajogYW55KTogYW55IHtcbiAgICBpZiAob2JqID09PSBudWxsIHx8IG9iaiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICByZXR1cm4gb2JqLm1hcChpdGVtID0+IHRoaXMuY2xlYW5VbmRlZmluZWRWYWx1ZXMoaXRlbSkpLmZpbHRlcihpdGVtID0+IGl0ZW0gIT09IHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBjbGVhbmVkOiBhbnkgPSB7fTtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9iaikpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjbGVhbmVkW2tleV0gPSB0aGlzLmNsZWFuVW5kZWZpbmVkVmFsdWVzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNsZWFuZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICAvLyBEZWxldGUgY29udHJhY3Qgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIGRlbGV0ZUNvbnRyYWN0KGNvbnRyYWN0SWQ6IHN0cmluZykge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIENhbm5vdCBkZWxldGUgY29udHJhY3QuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuZG9jKGNvbnRyYWN0SWQpLmRlbGV0ZSgpO1xuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDb250cmFjdCBkZWxldGVkOicsIGNvbnRyYWN0SWQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciBkZWxldGluZyBjb250cmFjdDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn07XG4iLCAiaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCJAbmV0bGlmeS9mdW5jdGlvbnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgKHJlcXVlc3Q6IFJlcXVlc3QsIGNvbnRleHQ6IENvbnRleHQpID0+IHtcbiAgLy8gU2V0IENPUlMgaGVhZGVyc1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULCBPUFRJT05TJyxcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gIH07XG5cbiAgLy8gSGFuZGxlIHByZWZsaWdodCByZXF1ZXN0c1xuICBpZiAocmVxdWVzdC5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwgeyBzdGF0dXM6IDIwMCwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIC8vIE9ubHkgYWxsb3cgUE9TVCBtZXRob2RcbiAgaWYgKHJlcXVlc3QubWV0aG9kICE9PSAnUE9TVCcpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGVycm9yOiAnTWV0aG9kIG5vdCBhbGxvd2VkJ1xuICAgIH0pLCB7IHN0YXR1czogNDA1LCBoZWFkZXJzIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBjb25zdCByZXF1ZXN0Qm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuICAgIFxuICAgIGNvbnN0IHtcbiAgICAgIGNvbnRyYWN0RGF0YSxcbiAgICAgIHVzZXJJZCxcbiAgICAgIHVzZXJOYW1lLFxuICAgICAgdXNlclN1cm5hbWUsXG4gICAgICBtYXN0ZXJSZWZlcmVuY2VcbiAgICB9ID0gcmVxdWVzdEJvZHk7XG5cbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICBpZiAoIWNvbnRyYWN0RGF0YSB8fCAhdXNlcklkIHx8ICF1c2VyTmFtZSB8fCAhdXNlclN1cm5hbWUpIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBjb250cmFjdERhdGEsIHVzZXJJZCwgdXNlck5hbWUsIHVzZXJTdXJuYW1lJ1xuICAgICAgfSksIHsgc3RhdHVzOiA0MDAsIGhlYWRlcnMgfSk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgY29udHJhY3QgZGF0YSBzdHJ1Y3R1cmVcbiAgICBpZiAoIWNvbnRyYWN0RGF0YS5jbGllbnRlIHx8ICFjb250cmFjdERhdGEuY2xpZW50ZS5ub21lIHx8ICFjb250cmFjdERhdGEuY2xpZW50ZS5jb2dub21lKSB7XG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgZXJyb3I6ICdJbnZhbGlkIGNvbnRyYWN0IGRhdGE6IG1pc3NpbmcgY2xpZW50IGluZm9ybWF0aW9uJ1xuICAgICAgfSksIHsgc3RhdHVzOiA0MDAsIGhlYWRlcnMgfSk7XG4gICAgfVxuXG4gICAgLy8gRHluYW1pY2FsbHkgaW1wb3J0IEZpcmViYXNlIEFkbWluIHRvIGF2b2lkIGluaXRpYWxpemF0aW9uIGlzc3Vlc1xuICAgIGNvbnN0IHsgYWRtaW5PcGVyYXRpb25zIH0gPSBhd2FpdCBpbXBvcnQoJy4uLy4uL3NlcnZlci9maXJlYmFzZS1hZG1pbicpO1xuXG4gICAgLy8gU2F2ZSBjb250cmFjdCB1c2luZyBhZG1pbiBwcml2aWxlZ2VzXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYWRtaW5PcGVyYXRpb25zLnNhdmVDb250cmFjdChcbiAgICAgIGNvbnRyYWN0RGF0YSxcbiAgICAgIHVzZXJJZCxcbiAgICAgIHVzZXJOYW1lLFxuICAgICAgdXNlclN1cm5hbWUsXG4gICAgICBtYXN0ZXJSZWZlcmVuY2VcbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgbWVzc2FnZTogJ0NvbnRyYWN0IHNhdmVkIHN1Y2Nlc3NmdWxseScsXG4gICAgICBkYXRhOiByZXN1bHRcbiAgICB9KSwgeyBzdGF0dXM6IDIwMCwgaGVhZGVycyB9KTtcblxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignXHUyNzRDIFNhdmUgY29udHJhY3QgQVBJIGVycm9yOicsIGVycm9yKTtcbiAgICBcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcbiAgICAgIGRldGFpbHM6IGVycm9yLm1lc3NhZ2VcbiAgICB9KSwgeyBzdGF0dXM6IDUwMCwgaGVhZGVycyB9KTtcbiAgfVxufTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsb0JBQW9CO0FBQzdCLFlBQVksVUFBVTtBQUN0QixPQUFPLFFBQVE7QUFIZixJQU1JLHVCQTZFUyxTQUNBLFdBQ04sd0JBR00scUJBR0E7QUEzRmI7QUFBQTtBQU1BLElBQUksd0JBQXdCO0FBRzVC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
