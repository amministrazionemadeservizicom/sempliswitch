import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { handleDemo } from "./routes/demo";
import { handleDocumentOCR, handleBillOCR } from "./routes/ocr";

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

  return app;
}
