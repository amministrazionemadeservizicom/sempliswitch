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

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  return app;
}
