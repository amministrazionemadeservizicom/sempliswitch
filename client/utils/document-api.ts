// API utilities per gestione documenti contratti

export interface DocumentDownload {
  id: string;
  nome: string;
  tipo: 'contratto_pdf' | 'documento_identita' | 'bolletta' | 'fattura' | 'altro';
  url: string;
  size?: number;
  dataCaricamento: string;
  caricatoDa: string;
}

export interface ContractDocuments {
  contractId: string;
  codiceUnivocoOfferta: string;
  documenti: DocumentDownload[];
  contrattoGenerato?: DocumentDownload;
  fattureDisponibili: DocumentDownload[];
}

// Simula il servizio di download documenti
export const documentApi = {
  // Ottieni tutti i documenti per un contratto
  async getContractDocuments(contractId: string): Promise<ContractDocuments> {
    try {
      // Simula chiamata API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data - in produzione sarebbe una chiamata reale
      const mockDocuments: ContractDocuments = {
        contractId,
        codiceUnivocoOfferta: `CTR_${contractId.substring(0, 8)}`,
        documenti: [
          {
            id: '1',
            nome: 'Carta_Identita_Fronte.pdf',
            tipo: 'documento_identita',
            url: `/api/documents/download/${contractId}/documento_identita_fronte.pdf`,
            size: 245760, // 240KB
            dataCaricamento: new Date().toISOString(),
            caricatoDa: 'Mario Rossi'
          },
          {
            id: '2',
            nome: 'Carta_Identita_Retro.pdf',
            tipo: 'documento_identita',
            url: `/api/documents/download/${contractId}/documento_identita_retro.pdf`,
            size: 198340, // 194KB
            dataCaricamento: new Date().toISOString(),
            caricatoDa: 'Mario Rossi'
          },
          {
            id: '3',
            nome: 'Bolletta_Energia_Ultima.pdf',
            tipo: 'bolletta',
            url: `/api/documents/download/${contractId}/bolletta_energia.pdf`,
            size: 567890, // 555KB
            dataCaricamento: new Date().toISOString(),
            caricatoDa: 'Mario Rossi'
          }
        ],
        contrattoGenerato: {
          id: 'contract_1',
          nome: 'Contratto_Finale.pdf',
          tipo: 'contratto_pdf',
          url: `/api/documents/download/${contractId}/contratto_finale.pdf`,
          size: 1245678, // 1.2MB
          dataCaricamento: new Date().toISOString(),
          caricatoDa: 'Sistema'
        },
        fattureDisponibili: [
          {
            id: 'invoice_1',
            nome: 'Fattura_001_2024.pdf',
            tipo: 'fattura',
            url: `/api/documents/download/${contractId}/fattura_001_2024.pdf`,
            size: 345678, // 338KB
            dataCaricamento: new Date(Date.now() - 86400000).toISOString(), // 1 giorno fa
            caricatoDa: 'Sistema Fatturazione'
          },
          {
            id: 'invoice_2',
            nome: 'Fattura_002_2024.pdf',
            tipo: 'fattura',
            url: `/api/documents/download/${contractId}/fattura_002_2024.pdf`,
            size: 367890, // 359KB
            dataCaricamento: new Date(Date.now() - 172800000).toISOString(), // 2 giorni fa
            caricatoDa: 'Sistema Fatturazione'
          }
        ]
      };
      
      return mockDocuments;
    } catch (error) {
      console.error('Errore nel recupero documenti:', error);
      throw new Error('Impossibile recuperare i documenti del contratto');
    }
  },

  // Download singolo documento
  async downloadDocument(documentId: string, filename: string): Promise<void> {
    try {
      // Simula il download del file
      // In produzione, questo farebbe una chiamata al server per ottenere il file
      const response = await fetch(`/.netlify/functions/download-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId,
          filename
        })
      });

      if (!response.ok) {
        throw new Error(`Errore nel download: ${response.status}`);
      }

      // Converte la risposta in blob per il download
      const blob = await response.blob();
      
      // Crea un URL temporaneo per il blob
      const url = window.URL.createObjectURL(blob);
      
      // Crea un link di download temporaneo
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Simula il click per iniziare il download
      document.body.appendChild(link);
      link.click();
      
      // Pulisce il DOM e l'URL temporaneo
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Errore nel download del documento:', error);
      
      // Fallback: simula il download con un URL fittizio
      const link = document.createElement('a');
      link.href = '#';
      link.download = filename;
      link.onclick = (e) => {
        e.preventDefault();
        console.log(`Simulando download di: ${filename}`);
        alert(`Download simulato: ${filename}\n\nIn produzione, il file verrebbe scaricato automaticamente.`);
      };
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  // Download multiplo (ZIP)
  async downloadAllDocuments(contractId: string, codiceOfferta: string): Promise<void> {
    try {
      const response = await fetch(`/.netlify/functions/download-all-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractId,
          codiceOfferta
        })
      });

      if (!response.ok) {
        throw new Error(`Errore nel download: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Documenti_${codiceOfferta}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Errore nel download di tutti i documenti:', error);
      
      // Fallback simulation
      alert(`Download simulato: Documenti_${codiceOfferta}.zip\n\nIn produzione, tutti i documenti verrebbero compressi in un file ZIP e scaricati.`);
    }
  },

  // Upload nuovo documento (per integrazioni)
  async uploadDocument(contractId: string, file: File, tipo: DocumentDownload['tipo']): Promise<DocumentDownload> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contractId', contractId);
      formData.append('tipo', tipo);

      const response = await fetch('/.netlify/functions/upload-document', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Errore nell'upload: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        id: result.documentId,
        nome: file.name,
        tipo,
        url: result.url,
        size: file.size,
        dataCaricamento: new Date().toISOString(),
        caricatoDa: 'Utente corrente'
      };
      
    } catch (error) {
      console.error('Errore nell\'upload del documento:', error);
      throw new Error('Impossibile caricare il documento');
    }
  }
};

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getDocumentIcon = (tipo: DocumentDownload['tipo']): string => {
  switch (tipo) {
    case 'contratto_pdf':
      return '📄';
    case 'documento_identita':
      return '🪪';
    case 'bolletta':
      return '📊';
    case 'fattura':
      return '🧾';
    default:
      return '📎';
  }
};

export const getDocumentTypeLabel = (tipo: DocumentDownload['tipo']): string => {
  switch (tipo) {
    case 'contratto_pdf':
      return 'Contratto PDF';
    case 'documento_identita':
      return 'Documento di Identità';
    case 'bolletta':
      return 'Bolletta';
    case 'fattura':
      return 'Fattura';
    default:
      return 'Altro Documento';
  }
};
