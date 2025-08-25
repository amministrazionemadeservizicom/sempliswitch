import type { Handler } from "@netlify/functions";
import SftpClient from "ssh2-sftp-client";
import formidable from "formidable";
import fs from "fs";
import path from "path";

// Disabilita body parsing automatico di Netlify
export const config = {
  bodyParser: false,
};

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const form = formidable({ multiples: true });
    const parsed = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = parsed;

    const gestore = fields.gestore?.[0];
    const dataCreazione = fields.dataCreazione?.[0]; // formato: YYYY-MM-DD
    const [anno, mese, giorno] = dataCreazione.split("-");
    const filePdf = files.pdf?.[0];
    const fileJson = files.json?.[0];

    if (!gestore || !filePdf || !fileJson || !anno || !mese || !giorno) {
      return {
        statusCode: 400,
        body: "Missing fields",
      };
    }

    const remoteDir = `/contratti/${gestore}/${anno}/${mese}/${giorno}/`;
    const remotePdfPath = `${remoteDir}${filePdf.originalFilename}`;
    const remoteJsonPath = `${remoteDir}${fileJson.originalFilename}`;

    const sftp = new SftpClient();

    await sftp.connect({
      host: "u478817.your-storagebox.de",
      port: 22,
      username: "u478817",
      password: process.env.HETZNER_PASSWORD,
    });

    const exists = await sftp.exists(remoteDir);
    if (!exists) await sftp.mkdir(remoteDir, true);

    await sftp.fastPut(filePdf.filepath, remotePdfPath);
    await sftp.fastPut(fileJson.filepath, remoteJsonPath);

    await sftp.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Upload riuscito", pdf: remotePdfPath, json: remoteJsonPath }),
    };
  } catch (error: any) {
    console.error("Errore durante l’upload:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Errore interno" }),
    };
  }
};

export default handler;