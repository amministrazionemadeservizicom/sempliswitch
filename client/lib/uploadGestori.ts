import SftpClient from 'ssh2-sftp-client';
import dotenv from 'dotenv';

dotenv.config();

const sftp = new SftpClient();

const config = {
  host: process.env.HETZNER_HOST,
  port: 22,
  username: process.env.HETZNER_USERNAME,
  password: process.env.HETZNER_PASSWORD,
};

/**
 * Carica un file da un buffer in remoto su Hetzner
 */
export async function uploadToHetzner({
  fileBuffer,
  remotePath
}: {
  fileBuffer: Buffer;
  remotePath: string;
}) {
  try {
    await sftp.connect(config);
    console.log("🔌 Connesso a Hetzner via SFTP");
    await sftp.put(fileBuffer, remotePath);
    console.log(`✅ File caricato su Hetzner: ${remotePath}`);
  } catch (err) {
    console.error("❌ Errore nel caricamento SFTP:", err);
  } finally {
    await sftp.end();
  }
}

/**
 * Carica un file da percorso locale (stringa) verso Hetzner
 */
export async function uploadFile(localPath: string, remotePath: string) {
  try {
    await sftp.connect(config);
    console.log("🔌 Connesso a Hetzner via SFTP");
    await sftp.put(localPath, remotePath);
    console.log(`✅ File caricato: ${remotePath}`);
  } catch (err) {
    console.error("❌ Errore nel caricamento:", err);
  } finally {
    await sftp.end();
  }
}

/**
 * Scarica un file da Hetzner verso il percorso locale
 */
export async function downloadFile(remotePath: string, localPath: string) {
  try {
    await sftp.connect(config);
    console.log("🔌 Connesso a Hetzner via SFTP");
    await sftp.get(remotePath, localPath);
    console.log(`✅ File scaricato: ${localPath}`);
  } catch (err) {
    console.error("❌ Errore nel download:", err);
  } finally {
    await sftp.end();
  }
}