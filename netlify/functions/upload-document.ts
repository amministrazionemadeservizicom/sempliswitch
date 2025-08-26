import { Context } from "@netlify/functions";
import busboy from 'busboy';

export default async (request: Request, context: Context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), { status: 405, headers });
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const contractId = formData.get('contractId') as string;
    const tipo = formData.get('tipo') as string;

    if (!file || !contractId || !tipo) {
      return new Response(JSON.stringify({
        error: 'File, contractId e tipo sono richiesti'
      }), { status: 400, headers });
    }

    // Validazione del file
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({
        error: 'Tipo di file non supportato. Supportati: PDF, JPEG, PNG'
      }), { status: 400, headers });
    }

    // Validazione dimensione (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({
        error: 'File troppo grande. Dimensione massima: 10MB'
      }), { status: 400, headers });
    }

    // Simula il salvataggio del file
    // In produzione, qui ci sarebbe:
    // 1. Validazione delle autorizzazioni utente
    // 2. Scansione antivirus del file
    // 3. Salvataggio su storage sicuro (S3, filesystem criptato, ecc.)
    // 4. Aggiornamento del database con i metadati del file
    // 5. Notifica agli operatori back office se necessario

    // Genera un ID univoco per il documento
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simula il percorso di salvataggio
    const fileName = `${contractId}_${tipo}_${Date.now()}_${file.name}`;
    const filePath = `/documents/contracts/${contractId}/${fileName}`;

    // Simula il salvataggio
    console.log(`📄 Uploading document: ${fileName} (${file.size} bytes) for contract ${contractId}`);
    
    // In produzione, salvare il file:
    // await saveFileToStorage(file, filePath);
    // await updateContractDocuments(contractId, documentId, fileName, tipo);

    // Simula l'aggiornamento del contratto per richiedere nuova verifica
    try {
      // Importa dinamicamente l'admin operations
      const { adminOperations } = await import('../../server/firebase-admin');
      
      await adminOperations.updateContract(contractId, {
        statoOfferta: 'Integrazione',
        noteStatoOfferta: `Documento ${tipo} integrato: ${file.name}`,
        dataUltimaIntegrazione: new Date().toISOString()
      });
      
      console.log(`✅ Contract ${contractId} updated to Integrazione status`);
    } catch (error) {
      console.warn('⚠️ Could not update contract status:', error);
      // Non fallire l'upload se non riusciamo ad aggiornare lo stato
    }

    return new Response(JSON.stringify({
      success: true,
      documentId,
      fileName,
      url: filePath,
      message: 'Documento caricato con successo. Il contratto è stato rimesso in lavorazione.',
      metadata: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      }
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('❌ Upload document error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { status: 500, headers });
  }
};
