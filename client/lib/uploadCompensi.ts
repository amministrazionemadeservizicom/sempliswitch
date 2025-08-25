import Client from "ssh2-sftp-client";
import fs from "fs";
import csv from "csvtojson";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config();

const sftp = new Client();

// FIREBASE INIT
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MSG_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// MAIN FUNCTION
async function uploadAndParseCSV() {
  try {
    // 1. Connetti a Hetzner
    await sftp.connect({
      host: process.env.HETZNER_HOST,
      port: 22,
      username: process.env.HETZNER_USERNAME,
      password: process.env.HETZNER_PASSWORD,
    });

    const localPath = "./csv/piano_terra.csv";
    const remotePath = "/compensi/piano_terra.csv";

    // 2. Upload CSV
    await sftp.put(localPath, remotePath);
    console.log("✅ File caricato su Hetzner");

    // 3. Leggi contenuto del CSV
    const fileContent = fs.readFileSync(localPath, "utf8");
    const jsonArray = await csv().fromString(fileContent);

    // 4. Salva su Firestore
    for (const row of jsonArray) {
      await addDoc(collection(db, "compensi"), row);
    }

    console.log("✅ Compensi salvati su Firestore");

  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    sftp.end();
  }
}

uploadAndParseCSV();