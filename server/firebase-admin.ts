import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const serviceAccountPath = path.join(process.cwd(), 'credentials', 'firebase-admin-credentials.json');
  
  try {
    console.log('🔥 Initializing Firebase Admin SDK...');
    console.log('📁 Service account path:', serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: 'sempliswitch'
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

// Export admin instances
export const adminDb = getFirestore();
export const adminAuth = admin.auth();
export default admin;

// Helper functions for common operations
export const adminOperations = {
  // Create user with custom claims
  async createUserWithRole(userData: {
    email: string;
    password: string;
    nome: string;
    cognome: string;
    ruolo: string;
    [key: string]: any;
  }) {
    try {
      // Create user in Authentication
      const userRecord = await adminAuth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: `${userData.nome} ${userData.cognome}`,
      });

      // Set custom claims for role
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: userData.ruolo
      });

      // Save user data in Firestore
      await adminDb.collection('utenti').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userData.email,
        nome: userData.nome,
        cognome: userData.cognome,
        ruolo: userData.ruolo,
        attivo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...userData
      });

      console.log('✅ User created successfully:', userRecord.uid);
      return userRecord;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  },

  // Get all contracts with admin privileges
  async getAllContracts() {
    try {
      const snapshot = await adminDb.collection('contracts').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error fetching contracts:', error);
      throw error;
    }
  },

  // Update contract status with admin privileges
  async updateContractStatus(contractId: string, status: string, notes?: string) {
    try {
      await adminDb.collection('contracts').doc(contractId).update({
        statoOfferta: status,
        noteStatoOfferta: notes || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Contract status updated:', contractId);
      return true;
    } catch (error) {
      console.error('❌ Error updating contract:', error);
      throw error;
    }
  },

  // Update full contract with admin privileges
  async updateContract(contractId: string, updateData: {
    statoOfferta?: string;
    noteStatoOfferta?: string;
    contatto?: {
      nome: string;
      cognome: string;
      codiceFiscale: string;
    };
    ragioneSociale?: string;
  }) {
    try {
      const updateFields: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (updateData.statoOfferta) updateFields.statoOfferta = updateData.statoOfferta;
      if (updateData.noteStatoOfferta !== undefined) updateFields.noteStatoOfferta = updateData.noteStatoOfferta;
      if (updateData.contatto) updateFields.contatto = updateData.contatto;
      if (updateData.ragioneSociale !== undefined) updateFields.ragioneSociale = updateData.ragioneSociale;

      await adminDb.collection('contracts').doc(contractId).update(updateFields);

      console.log('✅ Contract updated:', contractId);
      return true;
    } catch (error) {
      console.error('❌ Error updating contract:', error);
      throw error;
    }
  },

  // Save new contract with admin privileges
  async saveContract(contractData: {
    cliente: {
      nome: string;
      cognome: string;
      codiceFiscale: string;
      cellulare: string;
      email: string;
      iban?: string;
    };
    documento: {
      tipo: string;
      numero?: string;
      rilasciatoDa: string;
      dataRilascio: string;
      dataScadenza: string;
    };
    indirizzi: {
      residenza: {
        via: string;
        civico: string;
        citta: string;
        cap: string;
      };
      fornitura: {
        via: string;
        civico: string;
        citta: string;
        cap: string;
      };
    };
    pod?: string;
    pdr?: string;
    potenzaImpegnataKw?: number;
    usiGas?: string[];
    residenziale?: string;
    offerte: any[];
  }, userId: string, userName: string, userSurname: string, masterReference?: string) {
    try {
      // Generate unique contract code
      const timestamp = Date.now();
      const codiceUnivocoOfferta = `CON-${timestamp}`;

      // Determine contract type and provider from selected offers
      const tipologiaContratto = contractData.offerte.some(offer =>
        offer.serviceType === "Luce" || offer.serviceType === "Gas"
      ) ? "energia" : "telefonia";

      const gestore = contractData.offerte[0]?.brand || "UNKNOWN";

      // Create contract document with proper structure
      const contractForFirebase = {
        codiceUnivocoOfferta,
        dataCreazione: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
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
        isBusiness: false, // Default to residential
        statoOfferta: 'Caricato',
        noteStatoOfferta: 'Contratto appena creato',
        gestore,
        masterReference: masterReference || '',
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

      // Clean undefined values
      const cleanedContract = this.cleanUndefinedValues(contractForFirebase);

      console.log('💾 Saving contract via Admin SDK:', cleanedContract);

      const docRef = await adminDb.collection('contracts').add(cleanedContract);

      console.log('✅ Contract saved successfully with ID:', docRef.id);

      return {
        success: true,
        contractId: docRef.id,
        codiceUnivocoOfferta
      };

    } catch (error) {
      console.error('❌ Error saving contract via Admin SDK:', error);
      throw error;
    }
  },

  // Helper function to clean undefined values
  cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item)).filter(item => item !== undefined);
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanUndefinedValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  },

  // Delete contract with admin privileges
  async deleteContract(contractId: string) {
    try {
      await adminDb.collection('contracts').doc(contractId).delete();
      console.log('✅ Contract deleted:', contractId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting contract:', error);
      throw error;
    }
  }
};
