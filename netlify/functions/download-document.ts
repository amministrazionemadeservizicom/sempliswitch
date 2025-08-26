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
    const { documentId, filename } = await request.json();

    if (!documentId || !filename) {
      return new Response(JSON.stringify({
        error: 'DocumentId e filename sono richiesti'
      }), { status: 400, headers });
    }

    // Simula la generazione di un PDF/documento
    // In produzione, qui ci sarebbe:
    // 1. Verifica delle autorizzazioni utente
    // 2. Recupero del file dal storage (S3, filesystem, ecc.)
    // 3. Streaming del file al client

    // Per il mock, generiamo un PDF semplice
    const mockPdfContent = generateMockPDF(filename);
    
    return new Response(mockPdfContent, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': mockPdfContent.length.toString()
      }
    });

  } catch (error: any) {
    console.error('❌ Download document error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { status: 500, headers });
  }
};

// Genera un PDF mock per il testing
function generateMockPDF(filename: string): ArrayBuffer {
  // PDF header semplificato
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
100 700 Td
(Documento Mock: ${filename}) Tj
100 680 Td
(Generato il: ${new Date().toLocaleDateString('it-IT')}) Tj
100 660 Td
(Questo è un documento di esempio per il testing.) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000265 00000 n 
0000000414 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
497
%%EOF`;

  // Converte la stringa in ArrayBuffer
  const encoder = new TextEncoder();
  return encoder.encode(pdfContent).buffer;
}
