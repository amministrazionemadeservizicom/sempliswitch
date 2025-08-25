import fs from 'fs';
import path from 'path';
import { uploadToHetzner } from '../lib/hetzner/sftpClient';

const BASE_DIR = path.join(__dirname, 'offerte-da-caricare');

const uploadOffers = async () => {
  const categories = ['energia', 'telefonia'];

  for (const category of categories) {
    const categoryPath = path.join(BASE_DIR, category);
    if (!fs.existsSync(categoryPath)) {
      console.warn(`❌ Cartella mancante: ${categoryPath}`);
      continue;
    }

    const files = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.json'));

    for (const fileName of files) {
      const fullPath = path.join(categoryPath, fileName);
      const fileBuffer = fs.readFileSync(fullPath);

      const remotePath = `/offerte/${category}/${fileName}`;

      try {
        await uploadToHetzner({
          fileBuffer,
          remotePath,
        });
        console.log(`✅ Offerta caricata: ${remotePath}`);
      } catch (error) {
        console.error(`❌ Errore nel caricamento ${remotePath}:`, error);
      }
    }
  }

  console.log('🎉 Tutte le offerte sono state caricate!');
};

uploadOffers();