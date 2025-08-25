// Admin API utilities for Firebase operations

export const adminApi = {
  // Get all contracts using admin privileges
  async getAllContracts() {
    try {
      const response = await fetch('/.netlify/functions/admin-contracts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.contracts || [];
    } catch (error: any) {
      console.error('❌ Error fetching contracts via admin API:', error);
      throw error;
    }
  },

  // Update contract status using admin privileges
  async updateContractStatus(contractId: string, status: string, notes?: string) {
    try {
      const response = await fetch(`/.netlify/functions/admin-contracts?id=${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          notes: notes || ''
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('❌ Error updating contract status:', error);
      throw error;
    }
  },

  // Update full contract using admin privileges
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
      const response = await fetch(`/.netlify/functions/admin-contracts?id=${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'updateFull',
          ...updateData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('❌ Error updating contract:', error);
      throw error;
    }
  },

  // Delete contract using admin privileges
  async deleteContract(contractId: string) {
    try {
      const response = await fetch(`/.netlify/functions/admin-contracts?id=${contractId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('❌ Error deleting contract:', error);
      throw error;
    }
  },

  // Create user using admin privileges
  async createUser(userData: {
    nome: string;
    email: string;
    password: string;
    ruolo: string;
    stato: boolean;
    pianoCompensi?: string;
    gestoriAssegnati?: string[];
    master?: string;
  }) {
    try {
      const response = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('❌ Error creating user via admin API:', error);
      throw error;
    }
  },

  // Test Firebase Admin SDK
  async testFirebaseAdmin() {
    try {
      const response = await fetch('/.netlify/functions/test-firebase-admin');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('❌ Error testing Firebase Admin:', error);
      throw error;
    }
  }
};

export default adminApi;
