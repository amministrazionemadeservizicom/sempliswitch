// Admin API utilities for Firebase operations

// Define the interface for adminApi to ensure TypeScript recognizes all methods
interface AdminApiInterface {
  getAllContracts(): Promise<any[]>;
  updateContractStatus(contractId: string, status: string, notes?: string): Promise<any>;
  updateContract(contractId: string, updateData: {
    statoOfferta?: string;
    noteStatoOfferta?: string;
    contatto?: {
      nome: string;
      cognome: string;
      codiceFiscale: string;
    };
    ragioneSociale?: string;
  }): Promise<any>;
  deleteContract(contractId: string): Promise<any>;
  createUser(userData: {
    nome: string;
    email: string;
    password: string;
    ruolo: string;
    stato: boolean;
    pianoCompensi?: string;
    gestoriAssegnati?: string[];
    master?: string;
  }): Promise<any>;
  testFirebaseAdmin(): Promise<any>;
}

export const adminApi: AdminApiInterface = {
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

  // Save contract using admin privileges (SECURE)
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
      const response = await fetch('/.netlify/functions/save-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractData,
          userId,
          userName,
          userSurname,
          masterReference: masterReference || ''
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('❌ Error saving contract via admin API:', error);
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
