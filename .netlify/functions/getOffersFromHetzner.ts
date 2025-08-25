import { Handler } from '@netlify/functions';
import Client from 'ssh2-sftp-client';

const handler: Handler = async () => {
  const sftp = new Client();

  try {
    await sftp.connect({
      host: process.env.HETZNER_HOST!,
      port: 22,
      username: process.env.HETZNER_USERNAME!,
      password: process.env.HETZNER_PASSWORD!,
    });

    const basePath = '/offerte';
    const serviceTypes = ['energia', 'telefonia'];
    const allOffers: any[] = [];

    for (const type of serviceTypes) {
      const brandDirs = await sftp.list(`${basePath}/${type}`);
      
      for (const brand of brandDirs) {
        if (brand.type !== 'd') continue; // salta se non è cartella
        
        const offerFiles = await sftp.list(`${basePath}/${type}/${brand.name}`);

        for (const file of offerFiles) {
          if (!file.name.endsWith('.json')) continue;

          const filePath = `${basePath}/${type}/${brand.name}/${file.name}`;
          const content = await sftp.get(filePath);
          const parsed = JSON.parse(content.toString());

          allOffers.push(parsed);
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(allOffers),
    };
  } catch (error) {
    console.error('Errore nel recupero offerte:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Errore nel recupero delle offerte' }),
    };
  } finally {
    sftp.end();
  }
};

export { handler };