
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

// netlify/functions/upload-document.ts
var upload_document_default = async (request, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const formData = await request.formData();
    const file = formData.get("file");
    const contractId = formData.get("contractId");
    const tipo = formData.get("tipo");
    if (!file || !contractId || !tipo) {
      return new Response(JSON.stringify({
        error: "File, contractId e tipo sono richiesti"
      }), { status: 400, headers });
    }
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg"
    ];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({
        error: "Tipo di file non supportato. Supportati: PDF, JPEG, PNG"
      }), { status: 400, headers });
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({
        error: "File troppo grande. Dimensione massima: 10MB"
      }), { status: 400, headers });
    }
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${contractId}_${tipo}_${Date.now()}_${file.name}`;
    const filePath = `/documents/contracts/${contractId}/${fileName}`;
    console.log(`\u{1F4C4} Uploading document: ${fileName} (${file.size} bytes) for contract ${contractId}`);
    try {
      const { adminOperations: adminOperations2 } = await Promise.resolve().then(() => (init_firebase_admin(), firebase_admin_exports));
      await adminOperations2.updateContract(contractId, {
        statoOfferta: "Integrazione",
        noteStatoOfferta: `Documento ${tipo} integrato: ${file.name}`,
        dataUltimaIntegrazione: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`\u2705 Contract ${contractId} updated to Integrazione status`);
    } catch (error) {
      console.warn("\u26A0\uFE0F Could not update contract status:", error);
    }
    return new Response(JSON.stringify({
      success: true,
      documentId,
      fileName,
      url: filePath,
      message: "Documento caricato con successo. Il contratto \xE8 stato rimesso in lavorazione.",
      metadata: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }), { status: 200, headers });
  } catch (error) {
    console.error("\u274C Upload document error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), { status: 500, headers });
  }
};
export {
  upload_document_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic2VydmVyL2ZpcmViYXNlLWFkbWluLnRzIiwgIm5ldGxpZnkvZnVuY3Rpb25zL3VwbG9hZC1kb2N1bWVudC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IGFkbWluIGZyb20gJ2ZpcmViYXNlLWFkbWluJztcbmltcG9ydCB7IGdldEZpcmVzdG9yZSB9IGZyb20gJ2ZpcmViYXNlLWFkbWluL2ZpcmVzdG9yZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IENvbnRyYWN0IH0gZnJvbSAnLi4vY2xpZW50L3R5cGVzL2NvbnRyYWN0cyc7XG5cbmxldCBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuLy8gSW5pdGlhbGl6ZSBGaXJlYmFzZSBBZG1pbiBTREsgaWYgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcbmlmICghYWRtaW4uYXBwcy5sZW5ndGgpIHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnXHVEODNEXHVERDI1IEluaXRpYWxpemluZyBGaXJlYmFzZSBBZG1pbiBTREsuLi4nKTtcblxuICAgIC8vIE1ldGhvZCAxOiBUcnkgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZpcnN0IChtb3N0IHNlY3VyZSlcbiAgICBpZiAocHJvY2Vzcy5lbnYuRklSRUJBU0VfUFJJVkFURV9LRVkgJiYgcHJvY2Vzcy5lbnYuRklSRUJBU0VfQ0xJRU5UX0VNQUlMKSB7XG4gICAgICBjb25zb2xlLmxvZygnXHVEODNEXHVEQ0NCIFVzaW5nIEZpcmViYXNlIGNyZWRlbnRpYWxzIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLi4uJyk7XG5cbiAgICAgIGNvbnN0IHNlcnZpY2VBY2NvdW50ID0ge1xuICAgICAgICBwcm9qZWN0SWQ6IHByb2Nlc3MuZW52LkZJUkVCQVNFX1BST0pFQ1RfSUQgfHwgJ3NlbXBsaXN3aXRjaCcsXG4gICAgICAgIGNsaWVudEVtYWlsOiBwcm9jZXNzLmVudi5GSVJFQkFTRV9DTElFTlRfRU1BSUwsXG4gICAgICAgIHByaXZhdGVLZXk6IHByb2Nlc3MuZW52LkZJUkVCQVNFX1BSSVZBVEVfS0VZLnJlcGxhY2UoL1xcXFxuL2csICdcXG4nKSxcbiAgICAgIH07XG5cbiAgICAgIGFkbWluLmluaXRpYWxpemVBcHAoe1xuICAgICAgICBjcmVkZW50aWFsOiBhZG1pbi5jcmVkZW50aWFsLmNlcnQoc2VydmljZUFjY291bnQpLFxuICAgICAgICBwcm9qZWN0SWQ6ICdzZW1wbGlzd2l0Y2gnXG4gICAgICB9KTtcblxuICAgICAgaXNGaXJlYmFzZUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgRmlyZWJhc2UgQWRtaW4gU0RLIGluaXRpYWxpemVkIHdpdGggZW52aXJvbm1lbnQgdmFyaWFibGVzJyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTWV0aG9kIDI6IFRyeSBzZXJ2aWNlIGFjY291bnQgZmlsZSAoZmFsbGJhY2spXG4gICAgICBjb25zdCBzZXJ2aWNlQWNjb3VudFBhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ2NyZWRlbnRpYWxzJywgJ2ZpcmViYXNlLWFkbWluLWNyZWRlbnRpYWxzLmpzb24nKTtcbiAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0RcdURDQzEgVHJ5aW5nIHNlcnZpY2UgYWNjb3VudCBmaWxlOicsIHNlcnZpY2VBY2NvdW50UGF0aCk7XG5cbiAgICAgIC8vIENoZWNrIGlmIGZpbGUgZXhpc3RzIGFuZCBpcyB2YWxpZFxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoc2VydmljZUFjY291bnRQYXRoKSkge1xuICAgICAgICBjb25zdCBzZXJ2aWNlQWNjb3VudENvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc2VydmljZUFjY291bnRQYXRoLCAndXRmOCcpO1xuICAgICAgICBjb25zdCBzZXJ2aWNlQWNjb3VudCA9IEpTT04ucGFyc2Uoc2VydmljZUFjY291bnRDb250ZW50KTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHByaXZhdGUga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgIGlmIChzZXJ2aWNlQWNjb3VudC5wcml2YXRlX2tleSAmJiBzZXJ2aWNlQWNjb3VudC5wcml2YXRlX2tleS5sZW5ndGggPiAxMDApIHtcbiAgICAgICAgICBhZG1pbi5pbml0aWFsaXplQXBwKHtcbiAgICAgICAgICAgIGNyZWRlbnRpYWw6IGFkbWluLmNyZWRlbnRpYWwuY2VydChzZXJ2aWNlQWNjb3VudFBhdGgpLFxuICAgICAgICAgICAgcHJvamVjdElkOiAnc2VtcGxpc3dpdGNoJ1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaXNGaXJlYmFzZUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnXHUyNzA1IEZpcmViYXNlIEFkbWluIFNESyBpbml0aWFsaXplZCB3aXRoIHNlcnZpY2UgYWNjb3VudCBmaWxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdcdTI2QTBcdUZFMEYgU2VydmljZSBhY2NvdW50IGZpbGUgaGFzIGluY29tcGxldGUgcHJpdmF0ZSBrZXknKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29tcGxldGUgcHJpdmF0ZSBrZXkgaW4gc2VydmljZSBhY2NvdW50IGZpbGUnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdcdTI2QTBcdUZFMEYgU2VydmljZSBhY2NvdW50IGZpbGUgbm90IGZvdW5kOicsIHNlcnZpY2VBY2NvdW50UGF0aCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2VydmljZSBhY2NvdW50IGZpbGUgbm90IGZvdW5kJyk7XG4gICAgICB9XG4gICAgfVxuXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignXHUyNzRDIEZhaWxlZCB0byBpbml0aWFsaXplIEZpcmViYXNlIEFkbWluIFNESzonLCBlcnJvcik7XG4gICAgY29uc29sZS5sb2coYFxuXHVEODNEXHVERDI3IFRvIGZpeCB0aGlzIEZpcmViYXNlIEFkbWluIGF1dGhlbnRpY2F0aW9uIGlzc3VlOlxuXG5NRVRIT0QgMSAtIEVudmlyb25tZW50IFZhcmlhYmxlcyAoUmVjb21tZW5kZWQpOlxuU2V0IHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlczpcbi0gRklSRUJBU0VfUFJPSkVDVF9JRD1zZW1wbGlzd2l0Y2hcbi0gRklSRUJBU0VfQ0xJRU5UX0VNQUlMPWZpcmViYXNlLWFkbWluc2RrLWZic3ZjQHNlbXBsaXN3aXRjaC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbVxuLSBGSVJFQkFTRV9QUklWQVRFX0tFWT1cIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxcXFxuWW91clxcXFxuQ29tcGxldGVcXFxcblByaXZhdGVcXFxcbktleVxcXFxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxcXFxuXCJcblxuTUVUSE9EIDIgLSBGaXggU2VydmljZSBBY2NvdW50IEZpbGU6XG5FbnN1cmUgdGhlIGNyZWRlbnRpYWxzL2ZpcmViYXNlLWFkbWluLWNyZWRlbnRpYWxzLmpzb24gZmlsZSBoYXMgYSBjb21wbGV0ZSBwcml2YXRlX2tleSBmaWVsZFxuXG5Gb3Igbm93LCB0aGUgc3lzdGVtIHdpbGwgb3BlcmF0ZSBpbiBmYWxsYmFjayBtb2RlIHdpdGggbGltaXRlZCBmdW5jdGlvbmFsaXR5LlxuICAgIGApO1xuXG4gICAgLy8gRG9uJ3QgdGhyb3cgZXJyb3IgLSBhbGxvdyBzeXN0ZW0gdG8gY29udGludWUgd2l0aCBmYWxsYmFja3NcbiAgICBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxufVxuXG4vLyBFeHBvcnQgYWRtaW4gaW5zdGFuY2VzIChjb25kaXRpb25hbCBiYXNlZCBvbiBpbml0aWFsaXphdGlvbilcbmV4cG9ydCBjb25zdCBhZG1pbkRiID0gaXNGaXJlYmFzZUluaXRpYWxpemVkID8gZ2V0RmlyZXN0b3JlKCkgOiBudWxsO1xuZXhwb3J0IGNvbnN0IGFkbWluQXV0aCA9IGlzRmlyZWJhc2VJbml0aWFsaXplZCA/IGFkbWluLmF1dGgoKSA6IG51bGw7XG5leHBvcnQgZGVmYXVsdCBhZG1pbjtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNoZWNrIGlmIEZpcmViYXNlIGlzIGF2YWlsYWJsZVxuZXhwb3J0IGNvbnN0IGlzRmlyZWJhc2VBdmFpbGFibGUgPSAoKSA9PiBpc0ZpcmViYXNlSW5pdGlhbGl6ZWQ7XG5cbi8vIEhlbHBlciBmdW5jdGlvbnMgZm9yIGNvbW1vbiBvcGVyYXRpb25zXG5leHBvcnQgY29uc3QgYWRtaW5PcGVyYXRpb25zID0ge1xuICAvLyBDcmVhdGUgdXNlciB3aXRoIGN1c3RvbSBjbGFpbXNcbiAgYXN5bmMgY3JlYXRlVXNlcldpdGhSb2xlKHVzZXJEYXRhOiB7XG4gICAgZW1haWw6IHN0cmluZztcbiAgICBwYXNzd29yZDogc3RyaW5nO1xuICAgIG5vbWU6IHN0cmluZztcbiAgICBjb2dub21lPzogc3RyaW5nO1xuICAgIHJ1b2xvOiBzdHJpbmc7XG4gICAgW2tleTogc3RyaW5nXTogYW55O1xuICB9KSB7XG4gICAgaWYgKCFpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgfHwgIWFkbWluQXV0aCB8fCAhYWRtaW5EYikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJlYmFzZSBBZG1pbiBTREsgbm90IHByb3Blcmx5IGluaXRpYWxpemVkLiBQbGVhc2UgY2hlY2sgY3JlZGVudGlhbHMuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIENyZWF0ZSB1c2VyIGluIEF1dGhlbnRpY2F0aW9uXG4gICAgICBjb25zdCB1c2VyUmVjb3JkID0gYXdhaXQgYWRtaW5BdXRoLmNyZWF0ZVVzZXIoe1xuICAgICAgICBlbWFpbDogdXNlckRhdGEuZW1haWwsXG4gICAgICAgIHBhc3N3b3JkOiB1c2VyRGF0YS5wYXNzd29yZCxcbiAgICAgICAgZGlzcGxheU5hbWU6IHVzZXJEYXRhLmNvZ25vbWUgPyBgJHt1c2VyRGF0YS5ub21lfSAke3VzZXJEYXRhLmNvZ25vbWV9YCA6IHVzZXJEYXRhLm5vbWUsXG4gICAgICB9KTtcblxuICAgICAgLy8gU2V0IGN1c3RvbSBjbGFpbXMgZm9yIHJvbGVcbiAgICAgIGF3YWl0IGFkbWluQXV0aC5zZXRDdXN0b21Vc2VyQ2xhaW1zKHVzZXJSZWNvcmQudWlkLCB7XG4gICAgICAgIHJvbGU6IHVzZXJEYXRhLnJ1b2xvXG4gICAgICB9KTtcblxuICAgICAgLy8gU2F2ZSB1c2VyIGRhdGEgaW4gRmlyZXN0b3JlXG4gICAgICBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ3V0ZW50aScpLmRvYyh1c2VyUmVjb3JkLnVpZCkuc2V0KHtcbiAgICAgICAgdWlkOiB1c2VyUmVjb3JkLnVpZCxcbiAgICAgICAgZW1haWw6IHVzZXJEYXRhLmVtYWlsLFxuICAgICAgICBub21lOiB1c2VyRGF0YS5ub21lLFxuICAgICAgICBjb2dub21lOiB1c2VyRGF0YS5jb2dub21lIHx8ICcnLFxuICAgICAgICBydW9sbzogdXNlckRhdGEucnVvbG8sXG4gICAgICAgIGF0dGl2bzogdHJ1ZSxcbiAgICAgICAgY3JlYXRlZEF0OiBhZG1pbi5maXJlc3RvcmUuRmllbGRWYWx1ZS5zZXJ2ZXJUaW1lc3RhbXAoKSxcbiAgICAgICAgLi4udXNlckRhdGFcbiAgICAgIH0pO1xuXG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IFVzZXIgY3JlYXRlZCBzdWNjZXNzZnVsbHk6JywgdXNlclJlY29yZC51aWQpO1xuICAgICAgcmV0dXJuIHVzZXJSZWNvcmQ7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciBjcmVhdGluZyB1c2VyOicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSxcblxuICAvLyBHZXQgYWxsIGNvbnRyYWN0cyB3aXRoIGFkbWluIHByaXZpbGVnZXNcbiAgYXN5bmMgZ2V0QWxsQ29udHJhY3RzKCk6IFByb21pc2U8Q29udHJhY3RbXT4ge1xuICAgIGlmICghaXNGaXJlYmFzZUluaXRpYWxpemVkIHx8ICFhZG1pbkRiKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1x1MjZBMFx1RkUwRiBGaXJlYmFzZSBub3QgYXZhaWxhYmxlLCByZXR1cm5pbmcgZW1wdHkgY29udHJhY3RzIGxpc3QnKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qgc25hcHNob3QgPSBhd2FpdCBhZG1pbkRiLmNvbGxlY3Rpb24oJ2NvbnRyYWN0cycpLmdldCgpO1xuICAgICAgcmV0dXJuIHNuYXBzaG90LmRvY3MubWFwKGRvYyA9PiAoe1xuICAgICAgICBpZDogZG9jLmlkLFxuICAgICAgICAuLi5kb2MuZGF0YSgpXG4gICAgICB9IGFzIENvbnRyYWN0KSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciBmZXRjaGluZyBjb250cmFjdHM6JywgZXJyb3IpO1xuICAgICAgLy8gUmV0dXJuIGVtcHR5IGFycmF5IGluc3RlYWQgb2YgdGhyb3dpbmcgdG8gcHJldmVudCBicmVha2luZyB0aGUgVUlcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVXBkYXRlIGNvbnRyYWN0IHN0YXR1cyB3aXRoIGFkbWluIHByaXZpbGVnZXNcbiAgYXN5bmMgdXBkYXRlQ29udHJhY3RTdGF0dXMoY29udHJhY3RJZDogc3RyaW5nLCBzdGF0dXM6IHN0cmluZywgbm90ZXM/OiBzdHJpbmcpIHtcbiAgICBpZiAoIWlzRmlyZWJhc2VJbml0aWFsaXplZCB8fCAhYWRtaW5EYikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJlYmFzZSBBZG1pbiBTREsgbm90IHByb3Blcmx5IGluaXRpYWxpemVkLiBDYW5ub3QgdXBkYXRlIGNvbnRyYWN0IHN0YXR1cy4nKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCdjb250cmFjdHMnKS5kb2MoY29udHJhY3RJZCkudXBkYXRlKHtcbiAgICAgICAgc3RhdG9PZmZlcnRhOiBzdGF0dXMsXG4gICAgICAgIG5vdGVTdGF0b09mZmVydGE6IG5vdGVzIHx8ICcnLFxuICAgICAgICB1cGRhdGVkQXQ6IGFkbWluLmZpcmVzdG9yZS5GaWVsZFZhbHVlLnNlcnZlclRpbWVzdGFtcCgpXG4gICAgICB9KTtcblxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDb250cmFjdCBzdGF0dXMgdXBkYXRlZDonLCBjb250cmFjdElkKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3IgdXBkYXRpbmcgY29udHJhY3Q6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9LFxuXG4gIC8vIFVwZGF0ZSBmdWxsIGNvbnRyYWN0IHdpdGggYWRtaW4gcHJpdmlsZWdlc1xuICBhc3luYyB1cGRhdGVDb250cmFjdChjb250cmFjdElkOiBzdHJpbmcsIHVwZGF0ZURhdGE6IFBhcnRpYWw8Q29udHJhY3Q+KSB7XG4gICAgaWYgKCFpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgfHwgIWFkbWluRGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgQWRtaW4gU0RLIG5vdCBwcm9wZXJseSBpbml0aWFsaXplZC4gQ2Fubm90IHVwZGF0ZSBjb250cmFjdC4nKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdXBkYXRlRmllbGRzOiBhbnkgPSB7XG4gICAgICAgIHVwZGF0ZWRBdDogYWRtaW4uZmlyZXN0b3JlLkZpZWxkVmFsdWUuc2VydmVyVGltZXN0YW1wKClcbiAgICAgIH07XG5cbiAgICAgIC8vIEhhbmRsZSBhbGwgcG9zc2libGUgQ29udHJhY3QgcHJvcGVydGllc1xuICAgICAgaWYgKHVwZGF0ZURhdGEuc3RhdG9PZmZlcnRhKSB1cGRhdGVGaWVsZHMuc3RhdG9PZmZlcnRhID0gdXBkYXRlRGF0YS5zdGF0b09mZmVydGE7XG4gICAgICBpZiAodXBkYXRlRGF0YS5ub3RlU3RhdG9PZmZlcnRhICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5ub3RlU3RhdG9PZmZlcnRhID0gdXBkYXRlRGF0YS5ub3RlU3RhdG9PZmZlcnRhO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuY29udGF0dG8pIHVwZGF0ZUZpZWxkcy5jb250YXR0byA9IHVwZGF0ZURhdGEuY29udGF0dG87XG4gICAgICBpZiAodXBkYXRlRGF0YS5yYWdpb25lU29jaWFsZSAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMucmFnaW9uZVNvY2lhbGUgPSB1cGRhdGVEYXRhLnJhZ2lvbmVTb2NpYWxlO1xuICAgICAgaWYgKHVwZGF0ZURhdGEubG9jayAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMubG9jayA9IHVwZGF0ZURhdGEubG9jaztcbiAgICAgIGlmICh1cGRhdGVEYXRhLmNyb25vbG9naWFTdGF0aSkgdXBkYXRlRmllbGRzLmNyb25vbG9naWFTdGF0aSA9IHVwZGF0ZURhdGEuY3Jvbm9sb2dpYVN0YXRpO1xuICAgICAgaWYgKHVwZGF0ZURhdGEuZGF0YVVsdGltYUludGVncmF6aW9uZSAhPT0gdW5kZWZpbmVkKSB1cGRhdGVGaWVsZHMuZGF0YVVsdGltYUludGVncmF6aW9uZSA9IHVwZGF0ZURhdGEuZGF0YVVsdGltYUludGVncmF6aW9uZTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLm51b3ZpUG9kQWdnaXVudGkgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLm51b3ZpUG9kQWdnaXVudGkgPSB1cGRhdGVEYXRhLm51b3ZpUG9kQWdnaXVudGk7XG4gICAgICBpZiAodXBkYXRlRGF0YS5kb2N1bWVudGkpIHVwZGF0ZUZpZWxkcy5kb2N1bWVudGkgPSB1cGRhdGVEYXRhLmRvY3VtZW50aTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLnBvZCkgdXBkYXRlRmllbGRzLnBvZCA9IHVwZGF0ZURhdGEucG9kO1xuICAgICAgaWYgKHVwZGF0ZURhdGEucGRyKSB1cGRhdGVGaWVsZHMucGRyID0gdXBkYXRlRGF0YS5wZHI7XG4gICAgICBpZiAodXBkYXRlRGF0YS5nZXN0b3JlKSB1cGRhdGVGaWVsZHMuZ2VzdG9yZSA9IHVwZGF0ZURhdGEuZ2VzdG9yZTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLnRpcG9sb2dpYUNvbnRyYXR0bykgdXBkYXRlRmllbGRzLnRpcG9sb2dpYUNvbnRyYXR0byA9IHVwZGF0ZURhdGEudGlwb2xvZ2lhQ29udHJhdHRvO1xuICAgICAgaWYgKHVwZGF0ZURhdGEubWFzdGVyUmVmZXJlbmNlICE9PSB1bmRlZmluZWQpIHVwZGF0ZUZpZWxkcy5tYXN0ZXJSZWZlcmVuY2UgPSB1cGRhdGVEYXRhLm1hc3RlclJlZmVyZW5jZTtcbiAgICAgIGlmICh1cGRhdGVEYXRhLmlzQnVzaW5lc3MgIT09IHVuZGVmaW5lZCkgdXBkYXRlRmllbGRzLmlzQnVzaW5lc3MgPSB1cGRhdGVEYXRhLmlzQnVzaW5lc3M7XG5cbiAgICAgIGF3YWl0IGFkbWluRGIuY29sbGVjdGlvbignY29udHJhY3RzJykuZG9jKGNvbnRyYWN0SWQpLnVwZGF0ZSh1cGRhdGVGaWVsZHMpO1xuXG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IENvbnRyYWN0IHVwZGF0ZWQ6JywgY29udHJhY3RJZCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIHVwZGF0aW5nIGNvbnRyYWN0OicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSxcblxuICAvLyBTYXZlIG5ldyBjb250cmFjdCB3aXRoIGFkbWluIHByaXZpbGVnZXNcbiAgYXN5bmMgc2F2ZUNvbnRyYWN0KGNvbnRyYWN0RGF0YToge1xuICAgIGNsaWVudGU6IHtcbiAgICAgIG5vbWU6IHN0cmluZztcbiAgICAgIGNvZ25vbWU6IHN0cmluZztcbiAgICAgIGNvZGljZUZpc2NhbGU6IHN0cmluZztcbiAgICAgIGNlbGx1bGFyZTogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIGliYW4/OiBzdHJpbmc7XG4gICAgfTtcbiAgICBkb2N1bWVudG86IHtcbiAgICAgIHRpcG86IHN0cmluZztcbiAgICAgIG51bWVybz86IHN0cmluZztcbiAgICAgIHJpbGFzY2lhdG9EYTogc3RyaW5nO1xuICAgICAgZGF0YVJpbGFzY2lvOiBzdHJpbmc7XG4gICAgICBkYXRhU2NhZGVuemE6IHN0cmluZztcbiAgICB9O1xuICAgIGluZGlyaXp6aToge1xuICAgICAgcmVzaWRlbnphOiB7XG4gICAgICAgIHZpYTogc3RyaW5nO1xuICAgICAgICBjaXZpY286IHN0cmluZztcbiAgICAgICAgY2l0dGE6IHN0cmluZztcbiAgICAgICAgY2FwOiBzdHJpbmc7XG4gICAgICB9O1xuICAgICAgZm9ybml0dXJhOiB7XG4gICAgICAgIHZpYTogc3RyaW5nO1xuICAgICAgICBjaXZpY286IHN0cmluZztcbiAgICAgICAgY2l0dGE6IHN0cmluZztcbiAgICAgICAgY2FwOiBzdHJpbmc7XG4gICAgICB9O1xuICAgIH07XG4gICAgcG9kPzogc3RyaW5nO1xuICAgIHBkcj86IHN0cmluZztcbiAgICBwb3RlbnphSW1wZWduYXRhS3c/OiBudW1iZXI7XG4gICAgdXNpR2FzPzogc3RyaW5nW107XG4gICAgcmVzaWRlbnppYWxlPzogc3RyaW5nO1xuICAgIG9mZmVydGU6IGFueVtdO1xuICB9LCB1c2VySWQ6IHN0cmluZywgdXNlck5hbWU6IHN0cmluZywgdXNlclN1cm5hbWU6IHN0cmluZywgbWFzdGVyUmVmZXJlbmNlPzogc3RyaW5nKSB7XG4gICAgaWYgKCFpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgfHwgIWFkbWluRGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgQWRtaW4gU0RLIG5vdCBwcm9wZXJseSBpbml0aWFsaXplZC4gQ2Fubm90IHNhdmUgY29udHJhY3QuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEdlbmVyYXRlIHVuaXF1ZSBjb250cmFjdCBjb2RlXG4gICAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgICAgY29uc3QgY29kaWNlVW5pdm9jb09mZmVydGEgPSBgQ09OLSR7dGltZXN0YW1wfWA7XG5cbiAgICAgIC8vIERldGVybWluZSBjb250cmFjdCB0eXBlIGFuZCBwcm92aWRlciBmcm9tIHNlbGVjdGVkIG9mZmVyc1xuICAgICAgY29uc3QgdGlwb2xvZ2lhQ29udHJhdHRvID0gY29udHJhY3REYXRhLm9mZmVydGUuc29tZShvZmZlciA9PlxuICAgICAgICBvZmZlci5zZXJ2aWNlVHlwZSA9PT0gXCJMdWNlXCIgfHwgb2ZmZXIuc2VydmljZVR5cGUgPT09IFwiR2FzXCJcbiAgICAgICkgPyBcImVuZXJnaWFcIiA6IFwidGVsZWZvbmlhXCI7XG5cbiAgICAgIGNvbnN0IGdlc3RvcmUgPSBjb250cmFjdERhdGEub2ZmZXJ0ZVswXT8uYnJhbmQgfHwgXCJVTktOT1dOXCI7XG5cbiAgICAgIC8vIENyZWF0ZSBjb250cmFjdCBkb2N1bWVudCB3aXRoIHByb3BlciBzdHJ1Y3R1cmVcbiAgICAgIGNvbnN0IGNvbnRyYWN0Rm9yRmlyZWJhc2UgPSB7XG4gICAgICAgIGNvZGljZVVuaXZvY29PZmZlcnRhLFxuICAgICAgICBkYXRhQ3JlYXppb25lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXSwgLy8gWVlZWS1NTS1ERCBmb3JtYXRcbiAgICAgICAgY3JlYXRvRGE6IHtcbiAgICAgICAgICBpZDogdXNlcklkLFxuICAgICAgICAgIG5vbWU6IHVzZXJOYW1lLFxuICAgICAgICAgIGNvZ25vbWU6IHVzZXJTdXJuYW1lXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhdHRvOiB7XG4gICAgICAgICAgbm9tZTogY29udHJhY3REYXRhLmNsaWVudGUubm9tZSxcbiAgICAgICAgICBjb2dub21lOiBjb250cmFjdERhdGEuY2xpZW50ZS5jb2dub21lLFxuICAgICAgICAgIGNvZGljZUZpc2NhbGU6IGNvbnRyYWN0RGF0YS5jbGllbnRlLmNvZGljZUZpc2NhbGVcbiAgICAgICAgfSxcbiAgICAgICAgaXNCdXNpbmVzczogZmFsc2UsIC8vIERlZmF1bHQgdG8gcmVzaWRlbnRpYWxcbiAgICAgICAgc3RhdG9PZmZlcnRhOiAnQ2FyaWNhdG8nLFxuICAgICAgICBub3RlU3RhdG9PZmZlcnRhOiAnQ29udHJhdHRvIGFwcGVuYSBjcmVhdG8nLFxuICAgICAgICBnZXN0b3JlLFxuICAgICAgICBtYXN0ZXJSZWZlcmVuY2U6IG1hc3RlclJlZmVyZW5jZSB8fCAnJyxcbiAgICAgICAgdGlwb2xvZ2lhQ29udHJhdHRvLFxuXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgZGV0YWlsZWQgZGF0YVxuICAgICAgICBkZXR0YWdsaUNsaWVudGU6IHtcbiAgICAgICAgICBjZWxsdWxhcmU6IGNvbnRyYWN0RGF0YS5jbGllbnRlLmNlbGx1bGFyZSxcbiAgICAgICAgICBlbWFpbDogY29udHJhY3REYXRhLmNsaWVudGUuZW1haWwsXG4gICAgICAgICAgaWJhbjogY29udHJhY3REYXRhLmNsaWVudGUuaWJhbiB8fCBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIGRvY3VtZW50bzogY29udHJhY3REYXRhLmRvY3VtZW50byxcbiAgICAgICAgaW5kaXJpenppOiBjb250cmFjdERhdGEuaW5kaXJpenppLFxuICAgICAgICBkYXRpVGVjbmljaToge1xuICAgICAgICAgIHBvZDogY29udHJhY3REYXRhLnBvZCB8fCBudWxsLFxuICAgICAgICAgIHBkcjogY29udHJhY3REYXRhLnBkciB8fCBudWxsLFxuICAgICAgICAgIHBvdGVuemFJbXBlZ25hdGFLdzogY29udHJhY3REYXRhLnBvdGVuemFJbXBlZ25hdGFLdyB8fCBudWxsLFxuICAgICAgICAgIHVzaUdhczogY29udHJhY3REYXRhLnVzaUdhcyB8fCBbXSxcbiAgICAgICAgICByZXNpZGVuemlhbGU6IGNvbnRyYWN0RGF0YS5yZXNpZGVuemlhbGUgfHwgbnVsbFxuICAgICAgICB9LFxuICAgICAgICBvZmZlcnRlOiBjb250cmFjdERhdGEub2ZmZXJ0ZSB8fCBbXSxcblxuICAgICAgICAvLyBUaW1lc3RhbXBzXG4gICAgICAgIGNyZWF0ZWRBdDogYWRtaW4uZmlyZXN0b3JlLkZpZWxkVmFsdWUuc2VydmVyVGltZXN0YW1wKCksXG4gICAgICAgIHVwZGF0ZWRBdDogYWRtaW4uZmlyZXN0b3JlLkZpZWxkVmFsdWUuc2VydmVyVGltZXN0YW1wKClcbiAgICAgIH07XG5cbiAgICAgIC8vIENsZWFuIHVuZGVmaW5lZCB2YWx1ZXNcbiAgICAgIGNvbnN0IGNsZWFuZWRDb250cmFjdCA9IHRoaXMuY2xlYW5VbmRlZmluZWRWYWx1ZXMoY29udHJhY3RGb3JGaXJlYmFzZSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdcdUZGRkRcdUZGRkRcdUZGRkQgU2F2aW5nIGNvbnRyYWN0IHZpYSBBZG1pbiBTREs6JywgY2xlYW5lZENvbnRyYWN0KTtcblxuICAgICAgY29uc3QgZG9jUmVmID0gYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCdjb250cmFjdHMnKS5hZGQoY2xlYW5lZENvbnRyYWN0KTtcblxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDb250cmFjdCBzYXZlZCBzdWNjZXNzZnVsbHkgd2l0aCBJRDonLCBkb2NSZWYuaWQpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBjb250cmFjdElkOiBkb2NSZWYuaWQsXG4gICAgICAgIGNvZGljZVVuaXZvY29PZmZlcnRhXG4gICAgICB9O1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciBzYXZpbmcgY29udHJhY3QgdmlhIEFkbWluIFNESzonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNsZWFuIHVuZGVmaW5lZCB2YWx1ZXNcbiAgY2xlYW5VbmRlZmluZWRWYWx1ZXMob2JqOiBhbnkpOiBhbnkge1xuICAgIGlmIChvYmogPT09IG51bGwgfHwgb2JqID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgIHJldHVybiBvYmoubWFwKGl0ZW0gPT4gdGhpcy5jbGVhblVuZGVmaW5lZFZhbHVlcyhpdGVtKSkuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPT0gdW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IGNsZWFuZWQ6IGFueSA9IHt9O1xuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob2JqKSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNsZWFuZWRba2V5XSA9IHRoaXMuY2xlYW5VbmRlZmluZWRWYWx1ZXModmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gY2xlYW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIC8vIERlbGV0ZSBjb250cmFjdCB3aXRoIGFkbWluIHByaXZpbGVnZXNcbiAgYXN5bmMgZGVsZXRlQ29udHJhY3QoY29udHJhY3RJZDogc3RyaW5nKSB7XG4gICAgaWYgKCFpc0ZpcmViYXNlSW5pdGlhbGl6ZWQgfHwgIWFkbWluRGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgQWRtaW4gU0RLIG5vdCBwcm9wZXJseSBpbml0aWFsaXplZC4gQ2Fubm90IGRlbGV0ZSBjb250cmFjdC4nKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgYWRtaW5EYi5jb2xsZWN0aW9uKCdjb250cmFjdHMnKS5kb2MoY29udHJhY3RJZCkuZGVsZXRlKCk7XG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IENvbnRyYWN0IGRlbGV0ZWQ6JywgY29udHJhY3RJZCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIGRlbGV0aW5nIGNvbnRyYWN0OicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufTtcbiIsICJpbXBvcnQgeyBDb250ZXh0IH0gZnJvbSBcIkBuZXRsaWZ5L2Z1bmN0aW9uc1wiO1xuaW1wb3J0IGJ1c2JveSBmcm9tICdidXNib3knO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxdWVzdDogUmVxdWVzdCwgY29udGV4dDogQ29udGV4dCkgPT4ge1xuICAvLyBTZXQgQ09SUyBoZWFkZXJzXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nLFxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCwgT1BUSU9OUycsXG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHQgcmVxdWVzdHNcbiAgaWYgKHJlcXVlc3QubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiAyMDAsIGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxdWVzdC5tZXRob2QgIT09ICdQT1NUJykge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnXG4gICAgfSksIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIFBhcnNlIG11bHRpcGFydCBmb3JtIGRhdGFcbiAgICBjb25zdCBmb3JtRGF0YSA9IGF3YWl0IHJlcXVlc3QuZm9ybURhdGEoKTtcbiAgICBcbiAgICBjb25zdCBmaWxlID0gZm9ybURhdGEuZ2V0KCdmaWxlJykgYXMgRmlsZTtcbiAgICBjb25zdCBjb250cmFjdElkID0gZm9ybURhdGEuZ2V0KCdjb250cmFjdElkJykgYXMgc3RyaW5nO1xuICAgIGNvbnN0IHRpcG8gPSBmb3JtRGF0YS5nZXQoJ3RpcG8nKSBhcyBzdHJpbmc7XG5cbiAgICBpZiAoIWZpbGUgfHwgIWNvbnRyYWN0SWQgfHwgIXRpcG8pIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogJ0ZpbGUsIGNvbnRyYWN0SWQgZSB0aXBvIHNvbm8gcmljaGllc3RpJ1xuICAgICAgfSksIHsgc3RhdHVzOiA0MDAsIGhlYWRlcnMgfSk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhemlvbmUgZGVsIGZpbGVcbiAgICBjb25zdCBhbGxvd2VkVHlwZXMgPSBbXG4gICAgICAnYXBwbGljYXRpb24vcGRmJyxcbiAgICAgICdpbWFnZS9qcGVnJyxcbiAgICAgICdpbWFnZS9wbmcnLFxuICAgICAgJ2ltYWdlL2pwZydcbiAgICBdO1xuXG4gICAgaWYgKCFhbGxvd2VkVHlwZXMuaW5jbHVkZXMoZmlsZS50eXBlKSkge1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGVycm9yOiAnVGlwbyBkaSBmaWxlIG5vbiBzdXBwb3J0YXRvLiBTdXBwb3J0YXRpOiBQREYsIEpQRUcsIFBORydcbiAgICAgIH0pLCB7IHN0YXR1czogNDAwLCBoZWFkZXJzIH0pO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXppb25lIGRpbWVuc2lvbmUgKG1heCAxME1CKVxuICAgIGNvbnN0IG1heFNpemUgPSAxMCAqIDEwMjQgKiAxMDI0OyAvLyAxME1CXG4gICAgaWYgKGZpbGUuc2l6ZSA+IG1heFNpemUpIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogJ0ZpbGUgdHJvcHBvIGdyYW5kZS4gRGltZW5zaW9uZSBtYXNzaW1hOiAxME1CJ1xuICAgICAgfSksIHsgc3RhdHVzOiA0MDAsIGhlYWRlcnMgfSk7XG4gICAgfVxuXG4gICAgLy8gU2ltdWxhIGlsIHNhbHZhdGFnZ2lvIGRlbCBmaWxlXG4gICAgLy8gSW4gcHJvZHV6aW9uZSwgcXVpIGNpIHNhcmViYmU6XG4gICAgLy8gMS4gVmFsaWRhemlvbmUgZGVsbGUgYXV0b3JpenphemlvbmkgdXRlbnRlXG4gICAgLy8gMi4gU2NhbnNpb25lIGFudGl2aXJ1cyBkZWwgZmlsZVxuICAgIC8vIDMuIFNhbHZhdGFnZ2lvIHN1IHN0b3JhZ2Ugc2ljdXJvIChTMywgZmlsZXN5c3RlbSBjcmlwdGF0bywgZWNjLilcbiAgICAvLyA0LiBBZ2dpb3JuYW1lbnRvIGRlbCBkYXRhYmFzZSBjb24gaSBtZXRhZGF0aSBkZWwgZmlsZVxuICAgIC8vIDUuIE5vdGlmaWNhIGFnbGkgb3BlcmF0b3JpIGJhY2sgb2ZmaWNlIHNlIG5lY2Vzc2FyaW9cblxuICAgIC8vIEdlbmVyYSB1biBJRCB1bml2b2NvIHBlciBpbCBkb2N1bWVudG9cbiAgICBjb25zdCBkb2N1bWVudElkID0gYGRvY18ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XG4gICAgXG4gICAgLy8gU2ltdWxhIGlsIHBlcmNvcnNvIGRpIHNhbHZhdGFnZ2lvXG4gICAgY29uc3QgZmlsZU5hbWUgPSBgJHtjb250cmFjdElkfV8ke3RpcG99XyR7RGF0ZS5ub3coKX1fJHtmaWxlLm5hbWV9YDtcbiAgICBjb25zdCBmaWxlUGF0aCA9IGAvZG9jdW1lbnRzL2NvbnRyYWN0cy8ke2NvbnRyYWN0SWR9LyR7ZmlsZU5hbWV9YDtcblxuICAgIC8vIFNpbXVsYSBpbCBzYWx2YXRhZ2dpb1xuICAgIGNvbnNvbGUubG9nKGBcdUQ4M0RcdURDQzQgVXBsb2FkaW5nIGRvY3VtZW50OiAke2ZpbGVOYW1lfSAoJHtmaWxlLnNpemV9IGJ5dGVzKSBmb3IgY29udHJhY3QgJHtjb250cmFjdElkfWApO1xuICAgIFxuICAgIC8vIEluIHByb2R1emlvbmUsIHNhbHZhcmUgaWwgZmlsZTpcbiAgICAvLyBhd2FpdCBzYXZlRmlsZVRvU3RvcmFnZShmaWxlLCBmaWxlUGF0aCk7XG4gICAgLy8gYXdhaXQgdXBkYXRlQ29udHJhY3REb2N1bWVudHMoY29udHJhY3RJZCwgZG9jdW1lbnRJZCwgZmlsZU5hbWUsIHRpcG8pO1xuXG4gICAgLy8gU2ltdWxhIGwnYWdnaW9ybmFtZW50byBkZWwgY29udHJhdHRvIHBlciByaWNoaWVkZXJlIG51b3ZhIHZlcmlmaWNhXG4gICAgdHJ5IHtcbiAgICAgIC8vIEltcG9ydGEgZGluYW1pY2FtZW50ZSBsJ2FkbWluIG9wZXJhdGlvbnNcbiAgICAgIGNvbnN0IHsgYWRtaW5PcGVyYXRpb25zIH0gPSBhd2FpdCBpbXBvcnQoJy4uLy4uL3NlcnZlci9maXJlYmFzZS1hZG1pbicpO1xuICAgICAgXG4gICAgICBhd2FpdCBhZG1pbk9wZXJhdGlvbnMudXBkYXRlQ29udHJhY3QoY29udHJhY3RJZCwge1xuICAgICAgICBzdGF0b09mZmVydGE6ICdJbnRlZ3JhemlvbmUnLFxuICAgICAgICBub3RlU3RhdG9PZmZlcnRhOiBgRG9jdW1lbnRvICR7dGlwb30gaW50ZWdyYXRvOiAke2ZpbGUubmFtZX1gLFxuICAgICAgICBkYXRhVWx0aW1hSW50ZWdyYXppb25lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZyhgXHUyNzA1IENvbnRyYWN0ICR7Y29udHJhY3RJZH0gdXBkYXRlZCB0byBJbnRlZ3JhemlvbmUgc3RhdHVzYCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUud2FybignXHUyNkEwXHVGRTBGIENvdWxkIG5vdCB1cGRhdGUgY29udHJhY3Qgc3RhdHVzOicsIGVycm9yKTtcbiAgICAgIC8vIE5vbiBmYWxsaXJlIGwndXBsb2FkIHNlIG5vbiByaXVzY2lhbW8gYWQgYWdnaW9ybmFyZSBsbyBzdGF0b1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGRvY3VtZW50SWQsXG4gICAgICBmaWxlTmFtZSxcbiAgICAgIHVybDogZmlsZVBhdGgsXG4gICAgICBtZXNzYWdlOiAnRG9jdW1lbnRvIGNhcmljYXRvIGNvbiBzdWNjZXNzby4gSWwgY29udHJhdHRvIFx1MDBFOCBzdGF0byByaW1lc3NvIGluIGxhdm9yYXppb25lLicsXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBvcmlnaW5hbE5hbWU6IGZpbGUubmFtZSxcbiAgICAgICAgc2l6ZTogZmlsZS5zaXplLFxuICAgICAgICB0eXBlOiBmaWxlLnR5cGUsXG4gICAgICAgIHVwbG9hZGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgfVxuICAgIH0pLCB7IHN0YXR1czogMjAwLCBoZWFkZXJzIH0pO1xuXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgVXBsb2FkIGRvY3VtZW50IGVycm9yOicsIGVycm9yKTtcbiAgICBcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcbiAgICAgIGRldGFpbHM6IGVycm9yLm1lc3NhZ2VcbiAgICB9KSwgeyBzdGF0dXM6IDUwMCwgaGVhZGVycyB9KTtcbiAgfVxufTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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
