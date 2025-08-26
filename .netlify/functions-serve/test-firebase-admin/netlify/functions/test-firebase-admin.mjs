
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

// netlify/functions/test-firebase-admin.ts
var test_firebase_admin_default = async (request, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers
    });
  }
  try {
    console.log("\u{1F9EA} Testing Firebase Admin SDK...");
    const { adminDb: adminDb2, adminAuth: adminAuth2, adminOperations: adminOperations2 } = await Promise.resolve().then(() => (init_firebase_admin(), firebase_admin_exports));
    const contractsSnapshot = await adminDb2.collection("contracts").limit(1).get();
    const contractsCount = contractsSnapshot.size;
    const usersResult = await adminAuth2.listUsers(1);
    const usersCount = usersResult.users.length;
    const allContracts = await adminOperations2.getAllContracts();
    return new Response(JSON.stringify({
      success: true,
      message: "Firebase Admin SDK is working correctly",
      tests: {
        firestore: {
          status: "OK",
          contractsInDatabase: allContracts.length
        },
        authentication: {
          status: "OK",
          usersFound: usersCount
        },
        adminOperations: {
          status: "OK",
          operationsAvailable: Object.keys(adminOperations2).length
        }
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), { status: 200, headers });
  } catch (error) {
    console.error("\u274C Firebase Admin test failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Firebase Admin SDK test failed",
      details: error.message,
      code: error.code || "UNKNOWN_ERROR"
    }), { status: 500, headers });
  }
};
export {
  test_firebase_admin_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic2VydmVyL2ZpcmViYXNlLWFkbWluLnRzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL3Rlc3QtZmlyZWJhc2UtYWRtaW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBhZG1pbiBmcm9tICdmaXJlYmFzZS1hZG1pbic7XG5pbXBvcnQgeyBnZXRGaXJlc3RvcmUgfSBmcm9tICdmaXJlYmFzZS1hZG1pbi9maXJlc3RvcmUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBDb250cmFjdCB9IGZyb20gJy4uL2NsaWVudC90eXBlcy9jb250cmFjdHMnO1xuXG5sZXQgaXNGaXJlYmFzZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbi8vIEluaXRpYWxpemUgRmlyZWJhc2UgQWRtaW4gU0RLIGlmIG5vdCBhbHJlYWR5IGluaXRpYWxpemVkXG5pZiAoIWFkbWluLmFwcHMubGVuZ3RoKSB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ1x1RDgzRFx1REQyNSBJbml0aWFsaXppbmcgRmlyZWJhc2UgQWRtaW4gU0RLLi4uJyk7XG5cbiAgICAvLyBNZXRob2QgMTogVHJ5IGVudmlyb25tZW50IHZhcmlhYmxlcyBmaXJzdCAobW9zdCBzZWN1cmUpXG4gICAgaWYgKHByb2Nlc3MuZW52LkZJUkVCQVNFX1BSSVZBVEVfS0VZICYmIHByb2Nlc3MuZW52LkZJUkVCQVNFX0NMSUVOVF9FTUFJTCkge1xuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1RENDQiBVc2luZyBGaXJlYmFzZSBjcmVkZW50aWFscyBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy4uLicpO1xuXG4gICAgICBjb25zdCBzZXJ2aWNlQWNjb3VudCA9IHtcbiAgICAgICAgcHJvamVjdElkOiBwcm9jZXNzLmVudi5GSVJFQkFTRV9QUk9KRUNUX0lEIHx8ICdzZW1wbGlzd2l0Y2gnLFxuICAgICAgICBjbGllbnRFbWFpbDogcHJvY2Vzcy5lbnYuRklSRUJBU0VfQ0xJRU5UX0VNQUlMLFxuICAgICAgICBwcml2YXRlS2V5OiBwcm9jZXNzLmVudi5GSVJFQkFTRV9QUklWQVRFX0tFWS5yZXBsYWNlKC9cXFxcbi9nLCAnXFxuJyksXG4gICAgICB9O1xuXG4gICAgICBhZG1pbi5pbml0aWFsaXplQXBwKHtcbiAgICAgICAgY3JlZGVudGlhbDogYWRtaW4uY3JlZGVudGlhbC5jZXJ0KHNlcnZpY2VBY2NvdW50KSxcbiAgICAgICAgcHJvamVjdElkOiAnc2VtcGxpc3dpdGNoJ1xuICAgICAgfSk7XG5cbiAgICAgIGlzRmlyZWJhc2VJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IEZpcmViYXNlIEFkbWluIFNESyBpbml0aWFsaXplZCB3aXRoIGVudmlyb25tZW50IHZhcmlhYmxlcycpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE1ldGhvZCAyOiBUcnkgc2VydmljZSBhY2NvdW50IGZpbGUgKGZhbGxiYWNrKVxuICAgICAgY29uc3Qgc2VydmljZUFjY291bnRQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdjcmVkZW50aWFscycsICdmaXJlYmFzZS1hZG1pbi1jcmVkZW50aWFscy5qc29uJyk7XG4gICAgICBjb25zb2xlLmxvZygnXHVEODNEXHVEQ0MxIFRyeWluZyBzZXJ2aWNlIGFjY291bnQgZmlsZTonLCBzZXJ2aWNlQWNjb3VudFBhdGgpO1xuXG4gICAgICAvLyBDaGVjayBpZiBmaWxlIGV4aXN0cyBhbmQgaXMgdmFsaWRcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNlcnZpY2VBY2NvdW50UGF0aCkpIHtcbiAgICAgICAgY29uc3Qgc2VydmljZUFjY291bnRDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHNlcnZpY2VBY2NvdW50UGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3Qgc2VydmljZUFjY291bnQgPSBKU09OLnBhcnNlKHNlcnZpY2VBY2NvdW50Q29udGVudCk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCBwcml2YXRlIGtleSBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoc2VydmljZUFjY291bnQucHJpdmF0ZV9rZXkgJiYgc2VydmljZUFjY291bnQucHJpdmF0ZV9rZXkubGVuZ3RoID4gMTAwKSB7XG4gICAgICAgICAgYWRtaW4uaW5pdGlhbGl6ZUFwcCh7XG4gICAgICAgICAgICBjcmVkZW50aWFsOiBhZG1pbi5jcmVkZW50aWFsLmNlcnQoc2VydmljZUFjY291bnRQYXRoKSxcbiAgICAgICAgICAgIHByb2plY3RJZDogJ3NlbXBsaXN3aXRjaCdcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlzRmlyZWJhc2VJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBGaXJlYmFzZSBBZG1pbiBTREsgaW5pdGlhbGl6ZWQgd2l0aCBzZXJ2aWNlIGFjY291bnQgZmlsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2FybignXHUyNkEwXHVGRTBGIFNlcnZpY2UgYWNjb3VudCBmaWxlIGhhcyBpbmNvbXBsZXRlIHByaXZhdGUga2V5Jyk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvbXBsZXRlIHByaXZhdGUga2V5IGluIHNlcnZpY2UgYWNjb3VudCBmaWxlJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybignXHUyNkEwXHVGRTBGIFNlcnZpY2UgYWNjb3VudCBmaWxlIG5vdCBmb3VuZDonLCBzZXJ2aWNlQWNjb3VudFBhdGgpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlcnZpY2UgYWNjb3VudCBmaWxlIG5vdCBmb3VuZCcpO1xuICAgICAgfVxuICAgIH1cblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBGYWlsZWQgdG8gaW5pdGlhbGl6ZSBGaXJlYmFzZSBBZG1pbiBTREs6JywgZXJyb3IpO1xuICAgIGNvbnNvbGUubG9nKGBcblx1RDgzRFx1REQyNyBUbyBmaXggdGhpcyBGaXJlYmFzZSBBZG1pbiBhdXRoZW50aWNhdGlvbiBpc3N1ZTpcblxuTUVUSE9EIDEgLSBFbnZpcm9ubWVudCBWYXJpYWJsZXMgKFJlY29tbWVuZGVkKTpcblNldCB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXM6XG4tIEZJUkVCQVNFX1BST0pFQ1RfSUQ9c2VtcGxpc3dpdGNoXG4tIEZJUkVCQVNFX0NMSUVOVF9FTUFJTD1maXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BzZW1wbGlzd2l0Y2guaWFtLmdzZXJ2aWNlYWNjb3VudC5jb21cbi0gRklSRUJBU0VfUFJJVkFURV9LRVk9XCItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cXFxcbllvdXJcXFxcbkNvbXBsZXRlXFxcXG5Qcml2YXRlXFxcXG5LZXlcXFxcbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cXFxcblwiXG5cbk1FVEhPRCAyIC0gRml4IFNlcnZpY2UgQWNjb3VudCBGaWxlOlxuRW5zdXJlIHRoZSBjcmVkZW50aWFscy9maXJlYmFzZS1hZG1pbi1jcmVkZW50aWFscy5qc29uIGZpbGUgaGFzIGEgY29tcGxldGUgcHJpdmF0ZV9rZXkgZmllbGRcblxuRm9yIG5vdywgdGhlIHN5c3RlbSB3aWxsIG9wZXJhdGUgaW4gZmFsbGJhY2sgbW9kZSB3aXRoIGxpbWl0ZWQgZnVuY3Rpb25hbGl0eS5cbiAgICBgKTtcblxuICAgIC8vIERvbid0IHRocm93IGVycm9yIC0gYWxsb3cgc3lzdGVtIHRvIGNvbnRpbnVlIHdpdGggZmFsbGJhY2tzXG4gICAgaXNGaXJlYmFzZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cbn1cblxuLy8gRXhwb3J0IGFkbWluIGluc3RhbmNlcyAoY29uZGl0aW9uYWwgYmFzZWQgb24gaW5pdGlhbGl6YXRpb24pXG5leHBvcnQgY29uc3QgYWRtaW5EYiA9IGlzRmlyZWJhc2VJbml0aWFsaXplZCA/IGdldEZpcmVzdG9yZSgpIDogbnVsbDtcbmV4cG9ydCBjb25zdCBhZG1pbkF1dGggPSBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgPyBhZG1pbi5hdXRoKCkgOiBudWxsO1xuZXhwb3J0IGRlZmF1bHQgYWRtaW47XG5cbi8vIEhlbHBlciBmdW5jdGlvbiB0byBjaGVjayBpZiBGaXJlYmFzZSBpcyBhdmFpbGFibGVcbmV4cG9ydCBjb25zdCBpc0ZpcmViYXNlQXZhaWxhYmxlID0gKCkgPT4gaXNGaXJlYmFzZUluaXRpYWxpemVkO1xuXG4vLyBIZWxwZXIgZnVuY3Rpb25zIGZvciBjb21tb24gb3BlcmF0aW9uc1xuZXhwb3J0IGNvbnN0IGFkbWluT3BlcmF0aW9ucyA9IHtcbiAgLy8gQ3JlYXRlIHVzZXIgd2l0aCBjdXN0b20gY2xhaW1zXG4gIGFzeW5jIGNyZWF0ZVVzZXJXaXRoUm9sZSh1c2VyRGF0YToge1xuICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgcGFzc3dvcmQ6IHN0cmluZztcbiAgICBub21lOiBzdHJpbmc7XG4gICAgY29nbm9tZT86IHN0cmluZztcbiAgICBydW9sbzogc3RyaW5nO1xuICAgIFtrZXk6IHN0cmluZ106IGFueTtcbiAgfSkge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkF1dGggfHwgIWFkbWluRGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgQWRtaW4gU0RLIG5vdCBwcm9wZXJseSBpbml0aWFsaXplZC4gUGxlYXNlIGNoZWNrIGNyZWRlbnRpYWxzLicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBBdXRoZW50aWNhdGlvblxuICAgICAgY29uc3QgdXNlclJlY29yZCA9IGF3YWl0IGFkbWluQXV0aC5jcmVhdGVVc2VyKHtcbiAgICAgICAgZW1haWw6IHVzZXJEYXRhLmVtYWlsLFxuICAgICAgICBwYXNzd29yZDogdXNlckRhdGEucGFzc3dvcmQsXG4gICAgICAgIGRpc3BsYXlOYW1lOiB1c2VyRGF0YS5jb2dub21lID8gYCR7dXNlckRhdGEubm9tZX0gJHt1c2VyRGF0YS5jb2dub21lfWAgOiB1c2VyRGF0YS5ub21lLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFNldCBjdXN0b20gY2xhaW1zIGZvciByb2xlXG4gICAgICBhd2FpdCBhZG1pbkF1dGguc2V0Q3VzdG9tVXNlckNsYWltcyh1c2VyUmVjb3JkLnVpZCwge1xuICAgICAgICByb2xlOiB1c2VyRGF0YS5ydW9sb1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNhdmUgdXNlciBkYXRhIGluIEZpcmVzdG9yZVxuICAgICAgYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCd1dGVudGknKS5kb2ModXNlclJlY29yZC51aWQpLnNldCh7XG4gICAgICAgIHVpZDogdXNlclJlY29yZC51aWQsXG4gICAgICAgIGVtYWlsOiB1c2VyRGF0YS5lbWFpbCxcbiAgICAgICAgbm9tZTogdXNlckRhdGEubm9tZSxcbiAgICAgICAgY29nbm9tZTogdXNlckRhdGEuY29nbm9tZSB8fCAnJyxcbiAgICAgICAgcnVvbG86IHVzZXJEYXRhLnJ1b2xvLFxuICAgICAgICBhdHRpdm86IHRydWUsXG4gICAgICAgIGNyZWF0ZWRBdDogYWRtaW4uZmlyZXN0b3JlLkZpZWxkVmFsdWUuc2VydmVyVGltZXN0YW1wKCksXG4gICAgICAgIC4uLnVzZXJEYXRhXG4gICAgICB9KTtcblxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBVc2VyIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5OicsIHVzZXJSZWNvcmQudWlkKTtcbiAgICAgIHJldHVybiB1c2VyUmVjb3JkO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3IgY3JlYXRpbmcgdXNlcjonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sXG5cbiAgLy8gR2V0IGFsbCBjb250cmFjdHMgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIGdldEFsbENvbnRyYWN0cygpOiBQcm9taXNlPENvbnRyYWN0W10+IHtcbiAgICBpZiAoIWlzRmlyZWJhc2VJbml0aWFsaXplZCB8fCAhYWRtaW5EYikge1xuICAgICAgY29uc29sZS53YXJuKCdcdTI2QTBcdUZFMEYgRmlyZWJhc2Ugbm90IGF2YWlsYWJsZSwgcmV0dXJuaW5nIGVtcHR5IGNvbnRyYWN0cyBsaXN0Jyk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNuYXBzaG90ID0gYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCdjb250cmFjdHMnKS5nZXQoKTtcbiAgICAgIHJldHVybiBzbmFwc2hvdC5kb2NzLm1hcChkb2MgPT4gKHtcbiAgICAgICAgaWQ6IGRvYy5pZCxcbiAgICAgICAgLi4uZG9jLmRhdGEoKVxuICAgICAgfSBhcyBDb250cmFjdCkpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3IgZmV0Y2hpbmcgY29udHJhY3RzOicsIGVycm9yKTtcbiAgICAgIC8vIFJldHVybiBlbXB0eSBhcnJheSBpbnN0ZWFkIG9mIHRocm93aW5nIHRvIHByZXZlbnQgYnJlYWtpbmcgdGhlIFVJXG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9LFxuXG4gIC8vIFVwZGF0ZSBjb250cmFjdCBzdGF0dXMgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIHVwZGF0ZUNvbnRyYWN0U3RhdHVzKGNvbnRyYWN0SWQ6IHN0cmluZywgc3RhdHVzOiBzdHJpbmcsIG5vdGVzPzogc3RyaW5nKSB7XG4gICAgaWYgKCFpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgfHwgIWFkbWluRGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgQWRtaW4gU0RLIG5vdCBwcm9wZXJseSBpbml0aWFsaXplZC4gQ2Fubm90IHVwZGF0ZSBjb250cmFjdCBzdGF0dXMuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuZG9jKGNvbnRyYWN0SWQpLnVwZGF0ZSh7XG4gICAgICAgIHN0YXRvT2ZmZXJ0YTogc3RhdHVzLFxuICAgICAgICBub3RlU3RhdG9PZmZlcnRhOiBub3RlcyB8fCAnJyxcbiAgICAgICAgdXBkYXRlZEF0OiBhZG1pbi5maXJlc3RvcmUuRmllbGRWYWx1ZS5zZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgQ29udHJhY3Qgc3RhdHVzIHVwZGF0ZWQ6JywgY29udHJhY3RJZCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIHVwZGF0aW5nIGNvbnRyYWN0OicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSxcblxuICAvLyBVcGRhdGUgZnVsbCBjb250cmFjdCB3aXRoIGFkbWluIHByaXZpbGVnZXNcbiAgYXN5bmMgdXBkYXRlQ29udHJhY3QoY29udHJhY3RJZDogc3RyaW5nLCB1cGRhdGVEYXRhOiBQYXJ0aWFsPENvbnRyYWN0Pikge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIENhbm5vdCB1cGRhdGUgY29udHJhY3QuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVwZGF0ZUZpZWxkczogYW55ID0ge1xuICAgICAgICB1cGRhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpXG4gICAgICB9O1xuXG4gICAgICAvLyBIYW5kbGUgYWxsIHBvc3NpYmxlIENvbnRyYWN0IHByb3BlcnRpZXNcbiAgICAgIGlmICh1cGRhdGVEYXRhLnN0YXRvT2ZmZXJ0YSkgdXBkYXRlRmllbGRzLnN0YXRvT2ZmZXJ0YSA9IHVwZGF0ZURhdGEuc3RhdG9PZmZlcnRhO1xuICAgICAgaWYgKHVwZGF0ZURhdGEubm90ZVN0YXRvT2ZmZXJ0YSAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMubm90ZVN0YXRvT2ZmZXJ0YSA9IHVwZGF0ZURhdGEubm90ZVN0YXRvT2ZmZXJ0YTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmNvbnRhdHRvKSB1cGRhdGVGaWVsZHMuY29udGF0dG8gPSB1cGRhdGVEYXRhLmNvbnRhdHRvO1xuICAgICAgaWYgKHVwZGF0ZURhdGEucmFnaW9uZVNvY2lhbGUgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLnJhZ2lvbmVTb2NpYWxlID0gdXBkYXRlRGF0YS5yYWdpb25lU29jaWFsZTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmxvY2sgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLmxvY2sgPSB1cGRhdGVEYXRhLmxvY2s7XG4gICAgICBpZiAodXBkYXRlRGF0YS5jcm9ub2xvZ2lhU3RhdGkpIHVwZGF0ZUZpZWxkcy5jcm9ub2xvZ2lhU3RhdGkgPSB1cGRhdGVEYXRhLmNyb25vbG9naWFTdGF0aTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmRhdGFVbHRpbWFJbnRlZ3JhemlvbmUgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLmRhdGFVbHRpbWFJbnRlZ3JhemlvbmUgPSB1cGRhdGVEYXRhLmRhdGFVbHRpbWFJbnRlZ3JhemlvbmU7XG4gICAgICBpZiAodXBkYXRlRGF0YS5udW92aVBvZEFnZ2l1bnRpICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5udW92aVBvZEFnZ2l1bnRpID0gdXBkYXRlRGF0YS5udW92aVBvZEFnZ2l1bnRpO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuZG9jdW1lbnRpKSB1cGRhdGVGaWVsZHMuZG9jdW1lbnRpID0gdXBkYXRlRGF0YS5kb2N1bWVudGk7XG4gICAgICBpZiAodXBkYXRlRGF0YS5wb2QpIHVwZGF0ZUZpZWxkcy5wb2QgPSB1cGRhdGVEYXRhLnBvZDtcbiAgICAgIGlmICh1cGRhdGVEYXRhLnBkcikgdXBkYXRlRmllbGRzLnBkciA9IHVwZGF0ZURhdGEucGRyO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuZ2VzdG9yZSkgdXBkYXRlRmllbGRzLmdlc3RvcmUgPSB1cGRhdGVEYXRhLmdlc3RvcmU7XG4gICAgICBpZiAodXBkYXRlRGF0YS50aXBvbG9naWFDb250cmF0dG8pIHVwZGF0ZUZpZWxkcy50aXBvbG9naWFDb250cmF0dG8gPSB1cGRhdGVEYXRhLnRpcG9sb2dpYUNvbnRyYXR0bztcbiAgICAgIGlmICh1cGRhdGVEYXRhLm1hc3RlclJlZmVyZW5jZSAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMubWFzdGVyUmVmZXJlbmNlID0gdXBkYXRlRGF0YS5tYXN0ZXJSZWZlcmVuY2U7XG4gICAgICBpZiAodXBkYXRlRGF0YS5pc0J1c2luZXNzICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5pc0J1c2luZXNzID0gdXBkYXRlRGF0YS5pc0J1c2luZXNzO1xuXG4gICAgICBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ2NvbnRyYWN0cycpLmRvYyhjb250cmFjdElkKS51cGRhdGUodXBkYXRlRmllbGRzKTtcblxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDb250cmFjdCB1cGRhdGVkOicsIGNvbnRyYWN0SWQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciB1cGRhdGluZyBjb250cmFjdDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sXG5cbiAgLy8gU2F2ZSBuZXcgY29udHJhY3Qgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIHNhdmVDb250cmFjdChjb250cmFjdERhdGE6IHtcbiAgICBjbGllbnRlOiB7XG4gICAgICBub21lOiBzdHJpbmc7XG4gICAgICBjb2dub21lOiBzdHJpbmc7XG4gICAgICBjb2RpY2VGaXNjYWxlOiBzdHJpbmc7XG4gICAgICBjZWxsdWxhcmU6IHN0cmluZztcbiAgICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgICBpYmFuPzogc3RyaW5nO1xuICAgIH07XG4gICAgZG9jdW1lbnRvOiB7XG4gICAgICB0aXBvOiBzdHJpbmc7XG4gICAgICBudW1lcm8/OiBzdHJpbmc7XG4gICAgICByaWxhc2NpYXRvRGE6IHN0cmluZztcbiAgICAgIGRhdGFSaWxhc2Npbzogc3RyaW5nO1xuICAgICAgZGF0YVNjYWRlbnphOiBzdHJpbmc7XG4gICAgfTtcbiAgICBpbmRpcml6emk6IHtcbiAgICAgIHJlc2lkZW56YToge1xuICAgICAgICB2aWE6IHN0cmluZztcbiAgICAgICAgY2l2aWNvOiBzdHJpbmc7XG4gICAgICAgIGNpdHRhOiBzdHJpbmc7XG4gICAgICAgIGNhcDogc3RyaW5nO1xuICAgICAgfTtcbiAgICAgIGZvcm5pdHVyYToge1xuICAgICAgICB2aWE6IHN0cmluZztcbiAgICAgICAgY2l2aWNvOiBzdHJpbmc7XG4gICAgICAgIGNpdHRhOiBzdHJpbmc7XG4gICAgICAgIGNhcDogc3RyaW5nO1xuICAgICAgfTtcbiAgICB9O1xuICAgIHBvZD86IHN0cmluZztcbiAgICBwZHI/OiBzdHJpbmc7XG4gICAgcG90ZW56YUltcGVnbmF0YUt3PzogbnVtYmVyO1xuICAgIHVzaUdhcz86IHN0cmluZ1tdO1xuICAgIHJlc2lkZW56aWFsZT86IHN0cmluZztcbiAgICBvZmZlcnRlOiBhbnlbXTtcbiAgfSwgdXNlcklkOiBzdHJpbmcsIHVzZXJOYW1lOiBzdHJpbmcsIHVzZXJTdXJuYW1lOiBzdHJpbmcsIG1hc3RlclJlZmVyZW5jZT86IHN0cmluZykge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIENhbm5vdCBzYXZlIGNvbnRyYWN0LicpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBHZW5lcmF0ZSB1bmlxdWUgY29udHJhY3QgY29kZVxuICAgICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICAgIGNvbnN0IGNvZGljZVVuaXZvY29PZmZlcnRhID0gYENPTi0ke3RpbWVzdGFtcH1gO1xuXG4gICAgICAvLyBEZXRlcm1pbmUgY29udHJhY3QgdHlwZSBhbmQgcHJvdmlkZXIgZnJvbSBzZWxlY3RlZCBvZmZlcnNcbiAgICAgIGNvbnN0IHRpcG9sb2dpYUNvbnRyYXR0byA9IGNvbnRyYWN0RGF0YS5vZmZlcnRlLnNvbWUob2ZmZXIgPT5cbiAgICAgICAgb2ZmZXIuc2VydmljZVR5cGUgPT09IFwiTHVjZVwiIHx8IG9mZmVyLnNlcnZpY2VUeXBlID09PSBcIkdhc1wiXG4gICAgICApID8gXCJlbmVyZ2lhXCIgOiBcInRlbGVmb25pYVwiO1xuXG4gICAgICBjb25zdCBnZXN0b3JlID0gY29udHJhY3REYXRhLm9mZmVydGVbMF0/LmJyYW5kIHx8IFwiVU5LTk9XTlwiO1xuXG4gICAgICAvLyBDcmVhdGUgY29udHJhY3QgZG9jdW1lbnQgd2l0aCBwcm9wZXIgc3RydWN0dXJlXG4gICAgICBjb25zdCBjb250cmFjdEZvckZpcmViYXNlID0ge1xuICAgICAgICBjb2RpY2VVbml2b2NvT2ZmZXJ0YSxcbiAgICAgICAgZGF0YUNyZWF6aW9uZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF0sIC8vIFlZWVktTU0tREQgZm9ybWF0XG4gICAgICAgIGNyZWF0b0RhOiB7XG4gICAgICAgICAgaWQ6IHVzZXJJZCxcbiAgICAgICAgICBub21lOiB1c2VyTmFtZSxcbiAgICAgICAgICBjb2dub21lOiB1c2VyU3VybmFtZVxuICAgICAgICB9LFxuICAgICAgICBjb250YXR0bzoge1xuICAgICAgICAgIG5vbWU6IGNvbnRyYWN0RGF0YS5jbGllbnRlLm5vbWUsXG4gICAgICAgICAgY29nbm9tZTogY29udHJhY3REYXRhLmNsaWVudGUuY29nbm9tZSxcbiAgICAgICAgICBjb2RpY2VGaXNjYWxlOiBjb250cmFjdERhdGEuY2xpZW50ZS5jb2RpY2VGaXNjYWxlXG4gICAgICAgIH0sXG4gICAgICAgIGlzQnVzaW5lc3M6IGZhbHNlLCAvLyBEZWZhdWx0IHRvIHJlc2lkZW50aWFsXG4gICAgICAgIHN0YXRvT2ZmZXJ0YTogJ0NhcmljYXRvJyxcbiAgICAgICAgbm90ZVN0YXRvT2ZmZXJ0YTogJ0NvbnRyYXR0byBhcHBlbmEgY3JlYXRvJyxcbiAgICAgICAgZ2VzdG9yZSxcbiAgICAgICAgbWFzdGVyUmVmZXJlbmNlOiBtYXN0ZXJSZWZlcmVuY2UgfHwgJycsXG4gICAgICAgIHRpcG9sb2dpYUNvbnRyYXR0byxcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGRldGFpbGVkIGRhdGFcbiAgICAgICAgZGV0dGFnbGlDbGllbnRlOiB7XG4gICAgICAgICAgY2VsbHVsYXJlOiBjb250cmFjdERhdGEuY2xpZW50ZS5jZWxsdWxhcmUsXG4gICAgICAgICAgZW1haWw6IGNvbnRyYWN0RGF0YS5jbGllbnRlLmVtYWlsLFxuICAgICAgICAgIGliYW46IGNvbnRyYWN0RGF0YS5jbGllbnRlLmliYW4gfHwgbnVsbFxuICAgICAgICB9LFxuICAgICAgICBkb2N1bWVudG86IGNvbnRyYWN0RGF0YS5kb2N1bWVudG8sXG4gICAgICAgIGluZGlyaXp6aTogY29udHJhY3REYXRhLmluZGlyaXp6aSxcbiAgICAgICAgZGF0aVRlY25pY2k6IHtcbiAgICAgICAgICBwb2Q6IGNvbnRyYWN0RGF0YS5wb2QgfHwgbnVsbCxcbiAgICAgICAgICBwZHI6IGNvbnRyYWN0RGF0YS5wZHIgfHwgbnVsbCxcbiAgICAgICAgICBwb3RlbnphSW1wZWduYXRhS3c6IGNvbnRyYWN0RGF0YS5wb3RlbnphSW1wZWduYXRhS3cgfHwgbnVsbCxcbiAgICAgICAgICB1c2lHYXM6IGNvbnRyYWN0RGF0YS51c2lHYXMgfHwgW10sXG4gICAgICAgICAgcmVzaWRlbnppYWxlOiBjb250cmFjdERhdGEucmVzaWRlbnppYWxlIHx8IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmZXJ0ZTogY29udHJhY3REYXRhLm9mZmVydGUgfHwgW10sXG5cbiAgICAgICAgLy8gVGltZXN0YW1wc1xuICAgICAgICBjcmVhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpLFxuICAgICAgICB1cGRhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpXG4gICAgICB9O1xuXG4gICAgICAvLyBDbGVhbiB1bmRlZmluZWQgdmFsdWVzXG4gICAgICBjb25zdCBjbGVhbmVkQ29udHJhY3QgPSB0aGlzLmNsZWFuVW5kZWZpbmVkVmFsdWVzKGNvbnRyYWN0Rm9yRmlyZWJhc2UpO1xuXG4gICAgICBjb25zb2xlLmxvZygnXHVGRkZEXHVGRkZEXHVGRkZEIFNhdmluZyBjb250cmFjdCB2aWEgQWRtaW4gU0RLOicsIGNsZWFuZWRDb250cmFjdCk7XG5cbiAgICAgIGNvbnN0IGRvY1JlZiA9IGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuYWRkKGNsZWFuZWRDb250cmFjdCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgQ29udHJhY3Qgc2F2ZWQgc3VjY2Vzc2Z1bGx5IHdpdGggSUQ6JywgZG9jUmVmLmlkKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgY29udHJhY3RJZDogZG9jUmVmLmlkLFxuICAgICAgICBjb2RpY2VVbml2b2NvT2ZmZXJ0YVxuICAgICAgfTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3Igc2F2aW5nIGNvbnRyYWN0IHZpYSBBZG1pbiBTREs6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9LFxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjbGVhbiB1bmRlZmluZWQgdmFsdWVzXG4gIGNsZWFuVW5kZWZpbmVkVmFsdWVzKG9iajogYW55KTogYW55IHtcbiAgICBpZiAob2JqID09PSBudWxsIHx8IG9iaiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICByZXR1cm4gb2JqLm1hcChpdGVtID0+IHRoaXMuY2xlYW5VbmRlZmluZWRWYWx1ZXMoaXRlbSkpLmZpbHRlcihpdGVtID0+IGl0ZW0gIT09IHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBjbGVhbmVkOiBhbnkgPSB7fTtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9iaikpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjbGVhbmVkW2tleV0gPSB0aGlzLmNsZWFuVW5kZWZpbmVkVmFsdWVzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNsZWFuZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICAvLyBEZWxldGUgY29udHJhY3Qgd2l0aCBhZG1pbiBwcml2aWxlZ2VzXG4gIGFzeW5jIGRlbGV0ZUNvbnRyYWN0KGNvbnRyYWN0SWQ6IHN0cmluZykge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmViYXNlIEFkbWluIFNESyBub3QgcHJvcGVybHkgaW5pdGlhbGl6ZWQuIENhbm5vdCBkZWxldGUgY29udHJhY3QuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuZG9jKGNvbnRyYWN0SWQpLmRlbGV0ZSgpO1xuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDb250cmFjdCBkZWxldGVkOicsIGNvbnRyYWN0SWQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciBkZWxldGluZyBjb250cmFjdDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn07XG4iLCAiaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCJAbmV0bGlmeS9mdW5jdGlvbnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgKHJlcXVlc3Q6IFJlcXVlc3QsIGNvbnRleHQ6IENvbnRleHQpID0+IHtcbiAgLy8gU2V0IENPUlMgaGVhZGVyc1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIE9QVElPTlMnLFxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgfTtcblxuICBpZiAocmVxdWVzdC5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwgeyBzdGF0dXM6IDIwMCwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXF1ZXN0Lm1ldGhvZCAhPT0gJ0dFVCcpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnIH0pLCB7XG4gICAgICBzdGF0dXM6IDQwNSxcbiAgICAgIGhlYWRlcnNcbiAgICB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ1x1RDgzRVx1RERFQSBUZXN0aW5nIEZpcmViYXNlIEFkbWluIFNESy4uLicpO1xuICAgIFxuICAgIC8vIER5bmFtaWNhbGx5IGltcG9ydCBGaXJlYmFzZSBBZG1pblxuICAgIGNvbnN0IHsgYWRtaW5EYiwgYWRtaW5BdXRoLCBhZG1pbk9wZXJhdGlvbnMgfSA9IGF3YWl0IGltcG9ydCgnLi4vLi4vc2VydmVyL2ZpcmViYXNlLWFkbWluJyk7XG4gICAgXG4gICAgLy8gVGVzdCAxOiBDaGVjayBGaXJlc3RvcmUgYWNjZXNzXG4gICAgY29uc3QgY29udHJhY3RzU25hcHNob3QgPSBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ2NvbnRyYWN0cycpLmxpbWl0KDEpLmdldCgpO1xuICAgIGNvbnN0IGNvbnRyYWN0c0NvdW50ID0gY29udHJhY3RzU25hcHNob3Quc2l6ZTtcbiAgICBcbiAgICAvLyBUZXN0IDI6IENoZWNrIEF1dGggYWNjZXNzXG4gICAgY29uc3QgdXNlcnNSZXN1bHQgPSBhd2FpdCBhZG1pbkF1dGgubGlzdFVzZXJzKDEpO1xuICAgIGNvbnN0IHVzZXJzQ291bnQgPSB1c2Vyc1Jlc3VsdC51c2Vycy5sZW5ndGg7XG4gICAgXG4gICAgLy8gVGVzdCAzOiBUZXN0IGFkbWluIG9wZXJhdGlvbnNcbiAgICBjb25zdCBhbGxDb250cmFjdHMgPSBhd2FpdCBhZG1pbk9wZXJhdGlvbnMuZ2V0QWxsQ29udHJhY3RzKCk7XG4gICAgXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgbWVzc2FnZTogJ0ZpcmViYXNlIEFkbWluIFNESyBpcyB3b3JraW5nIGNvcnJlY3RseScsXG4gICAgICB0ZXN0czoge1xuICAgICAgICBmaXJlc3RvcmU6IHtcbiAgICAgICAgICBzdGF0dXM6ICdPSycsXG4gICAgICAgICAgY29udHJhY3RzSW5EYXRhYmFzZTogYWxsQ29udHJhY3RzLmxlbmd0aFxuICAgICAgICB9LFxuICAgICAgICBhdXRoZW50aWNhdGlvbjoge1xuICAgICAgICAgIHN0YXR1czogJ09LJyxcbiAgICAgICAgICB1c2Vyc0ZvdW5kOiB1c2Vyc0NvdW50XG4gICAgICAgIH0sXG4gICAgICAgIGFkbWluT3BlcmF0aW9uczoge1xuICAgICAgICAgIHN0YXR1czogJ09LJyxcbiAgICAgICAgICBvcGVyYXRpb25zQXZhaWxhYmxlOiBPYmplY3Qua2V5cyhhZG1pbk9wZXJhdGlvbnMpLmxlbmd0aFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICB9KSwgeyBzdGF0dXM6IDIwMCwgaGVhZGVycyB9KTtcblxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignXHUyNzRDIEZpcmViYXNlIEFkbWluIHRlc3QgZmFpbGVkOicsIGVycm9yKTtcbiAgICBcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6ICdGaXJlYmFzZSBBZG1pbiBTREsgdGVzdCBmYWlsZWQnLFxuICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSxcbiAgICAgIGNvZGU6IGVycm9yLmNvZGUgfHwgJ1VOS05PV05fRVJST1InXG4gICAgfSksIHsgc3RhdHVzOiA1MDAsIGhlYWRlcnMgfSk7XG4gIH1cbn07XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE9BQU8sV0FBVztBQUNsQixTQUFTLG9CQUFvQjtBQUM3QixZQUFZLFVBQVU7QUFDdEIsT0FBTyxRQUFRO0FBSGYsSUFNSSx1QkE2RVMsU0FDQSxXQUNOLHdCQUdNLHFCQUdBO0FBM0ZiO0FBQUE7QUFNQSxJQUFJLHdCQUF3QjtBQUc1QixRQUFJLENBQUMsTUFBTSxLQUFLLFFBQVE7QUFDdEIsVUFBSTtBQUNGLGdCQUFRLElBQUksOENBQXVDO0FBR25ELFlBQUksUUFBUSxJ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
