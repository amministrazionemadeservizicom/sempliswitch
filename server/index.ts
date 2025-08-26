import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import dotenv from "dotenv";
import { handleDemo } from "./routes/demo";
import { handleDocumentOCR, handleBillOCR } from "./routes/ocr";
import { handleAdminContracts } from "./routes/admin-contracts";
import { handleSaveContract } from "./routes/save-contract";
import { handleCreateUser } from "./routes/create-user";

// Load environment variables
dotenv.config();

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
    abortOnLimit: true,
    responseOnLimit: 'File size limit exceeded'
  }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // OCR routes
  app.post("/api/ocr/document", handleDocumentOCR);
  app.post("/api/ocr/bill", handleBillOCR);

  // Admin API routes - mimic Netlify functions
  app.all("/.netlify/functions/admin-contracts", handleAdminContracts);
  app.post("/.netlify/functions/save-contract", handleSaveContract);
  app.post("/.netlify/functions/create-user", handleCreateUser);

  // Test Firebase Admin route
  app.get("/.netlify/functions/test-firebase-admin", async (_req, res) => {
    try {
      const { adminOperations } = await import('./firebase-admin');
      const result = await adminOperations.testConnection();
      res.json({ success: true, message: "Firebase Admin SDK is working!", data: result });
    } catch (error: any) {
      res.status(500).json({ error: 'Firebase Admin error', details: error.message });
    }
  });

  // Document download routes
  app.post("/.netlify/functions/download-document", async (req, res) => {
    try {
      const { documentId, filename } = req.body;

      if (!documentId || !filename) {
        return res.status(400).json({
          error: 'DocumentId e filename sono richiesti'
        });
      }

      // Simula la generazione di un PDF/documento
      const mockPdfContent = generateMockPDF(filename);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', mockPdfContent.length.toString());

      res.send(Buffer.from(mockPdfContent));
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  app.post("/.netlify/functions/download-all-documents", async (req, res) => {
    try {
      const { contractId, codiceOfferta } = req.body;

      if (!contractId || !codiceOfferta) {
        return res.status(400).json({
          error: 'ContractId e codiceOfferta sono richiesti'
        });
      }

      // Simula la creazione di un archivio ZIP
      const mockZipContent = generateMockZIP(codiceOfferta);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="Documenti_${codiceOfferta}.zip"`);
      res.setHeader('Content-Length', mockZipContent.length.toString());

      res.send(Buffer.from(mockZipContent));
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  app.post("/.netlify/functions/upload-document", async (req, res) => {
    try {
      // Gestisce upload con express-fileupload
      if (!req.files || !req.files.file) {
        return res.status(400).json({
          error: 'Nessun file caricato'
        });
      }

      const file = req.files.file as any;
      const { contractId, tipo } = req.body;

      if (!contractId || !tipo) {
        return res.status(400).json({
          error: 'ContractId e tipo sono richiesti'
        });
      }

      // Validazione del file
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Tipo di file non supportato. Supportati: PDF, JPEG, PNG'
        });
      }

      // Validazione dimensione (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({
          error: 'File troppo grande. Dimensione massima: 10MB'
        });
      }

      // Genera un ID univoco per il documento
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${contractId}_${tipo}_${Date.now()}_${file.name}`;
      const filePath = `/documents/contracts/${contractId}/${fileName}`;

      console.log(`📄 Uploading document: ${fileName} (${file.size} bytes) for contract ${contractId}`);

      // Simula l'aggiornamento del contratto
      try {
        const { adminOperations } = await import('./firebase-admin');
        await adminOperations.updateContract(contractId, {
          statoOfferta: 'Integrazione',
          noteStatoOfferta: `Documento ${tipo} integrato: ${file.name}`,
          dataUltimaIntegrazione: new Date().toISOString()
        });
      } catch (error) {
        console.warn('⚠��� Could not update contract status:', error);
      }

      res.json({
        success: true,
        documentId,
        fileName,
        url: filePath,
        message: 'Documento caricato con successo. Il contratto è stato rimesso in lavorazione.',
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  return app;

// Helper functions per generazione mock documents
function generateMockPDF(filename: string): ArrayBuffer {
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

  const encoder = new TextEncoder();
  return encoder.encode(pdfContent).buffer;
}

function generateMockZIP(codiceOfferta: string): ArrayBuffer {
  const zipContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00!\x00`;

  const files = [
    `Contratto_${codiceOfferta}.pdf`,
    `Documento_Identita_${codiceOfferta}.pdf`,
    `Bolletta_${codiceOfferta}.pdf`,
    `Fatture_${codiceOfferta}.pdf`
  ];

  let zipData = zipContent;

  files.forEach((filename, index) => {
    zipData += `${filename}\x00`;
    zipData += `Contenuto mock del file ${filename} generato il ${new Date().toISOString()}\x00`;
  });

  zipData += `PK\x05\x06\x00\x00\x00\x00\x04\x00\x04\x00\xff\xff\xff\xff\x00\x00`;

  const encoder = new TextEncoder();
  return encoder.encode(zipData).buffer;
}
}
