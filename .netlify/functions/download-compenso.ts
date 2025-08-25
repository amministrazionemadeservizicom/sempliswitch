import { Handler } from "@netlify/functions";
import SftpClient from "ssh2-sftp-client";
import dotenv from "dotenv";

dotenv.config();

const handler: Handler = async (event) => {
  const { filename } = event.queryStringParameters || {};

  if (!filename) {
    return {
      statusCode: 400,
      body: "❌ Parametro 'filename' mancante.",
    };
  }

  const sftp = new SftpClient();
  const remotePath = `/compensi/${filename}`;

  try {
    await sftp.connect({
      host: process.env.SFTP_HOST!,
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASS!,
      port: Number(process.env.SFTP_PORT || 23),
    });

    const data = await sftp.get(remotePath);
    await sftp.end();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body: data.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("Errore SFTP:", err);
    return {
      statusCode: 500,
      body: `❌ Errore durante il download del file: ${filename}`,
    };
  }
};

export { handler };