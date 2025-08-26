import { Context } from "@netlify/functions";

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

  try {
    const { contractId, codiceOfferta } = await request.json();

    if (!contractId || !codiceOfferta) {
      return new Response(JSON.stringify({
        error: 'ContractId e codiceOfferta sono richiesti'
      }), { status: 400, headers });
    }

    // Simula la creazione di un archivio ZIP
    // In produzione, qui ci sarebbe:
    // 1. Verifica delle autorizzazioni utente
    // 2. Recupero di tutti i documenti del contratto
    // 3. Creazione di un file ZIP con tutti i documenti
    // 4. Streaming del ZIP al client

    // Per il mock, generiamo un ZIP semplice
    const mockZipContent = generateMockZIP(codiceOfferta);
    
    return new Response(mockZipContent, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Documenti_${codiceOfferta}.zip"`,
        'Content-Length': mockZipContent.length.toString()
      }
    });

  } catch (error: any) {
    console.error('❌ Download all documents error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { status: 500, headers });
  }
};

// Genera un ZIP mock per il testing
function generateMockZIP(codiceOfferta: string): ArrayBuffer {
  // Simula un file ZIP con struttura minima
  // In produzione si userebbe una libreria come JSZip o simile
  const zipContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00!\x00`;
  
  // Mock dei contenuti del ZIP
  const files = [
    `Contratto_${codiceOfferta}.pdf`,
    `Documento_Identita_${codiceOfferta}.pdf`,
    `Bolletta_${codiceOfferta}.pdf`,
    `Fatture_${codiceOfferta}.pdf`
  ];

  // Simula la struttura ZIP con file entries
  let zipData = zipContent;
  
  files.forEach((filename, index) => {
    zipData += `${filename}\x00`;
    zipData += `Contenuto mock del file ${filename} generato il ${new Date().toISOString()}\x00`;
  });
  
  // ZIP footer
  zipData += `PK\x05\x06\x00\x00\x00\x00\x04\x00\x04\x00\xff\xff\xff\xff\x00\x00`;

  // Converte in ArrayBuffer
  const encoder = new TextEncoder();
  return encoder.encode(zipData).buffer;
}
