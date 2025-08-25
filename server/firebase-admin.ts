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
      const snapshot = await adminDb.collection('contratti').get();
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
      await adminDb.collection('contratti').doc(contractId).update({
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

  // Delete contract with admin privileges
  async deleteContract(contractId: string) {
    try {
      await adminDb.collection('contratti').doc(contractId).delete();
      console.log('✅ Contract deleted:', contractId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting contract:', error);
      throw error;
    }
  }
};
