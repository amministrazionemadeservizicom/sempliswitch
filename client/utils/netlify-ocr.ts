import { detectDocType, parseFieldsByType, type ParsedFields } from './id-parsers';

const OCR_ENDPOINT = 'https://sempliswitch.it/.netlify/functions/ocr';

// Convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// OCR for identity documents
export async function processDocumentOCR(files: File[]): Promise<{
  text: string;
  detectedType: string;
  parsed: ParsedFields;
  previews: string[];
}> {
  try {
    // Convert first file to base64
    const file = files[0];
    const base64Data = await fileToBase64(file);
    
    // Create previews for all files
    const previews = await Promise.all(
      files.map(f => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result as string);
        });
      })
    );

    console.log('📤 Inviando documento a Netlify OCR...');
    
    // Call Netlify function
    const response = await fetch(`${OCR_ENDPOINT}?type=doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: base64Data
      })
    });

    if (!response.ok) {
      throw new Error(`OCR request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 Risposta Netlify OCR:', result);

    if (result.error) {
      throw new Error(result.error);
    }

    const { text, detectedType, parsedFields } = result;

    return {
      text: text || '',
      detectedType: detectedType || 'UNKNOWN',
      parsed: parsedFields || {},
      previews
    };

  } catch (error) {
    console.error('❌ Errore OCR Netlify:', error);
    throw error;
  }
}

// OCR for bills/invoices
export async function processBillOCR(files: File[]): Promise<{
  text: string;
  data: any;
  previews: string[];
}> {
  try {
    // Convert first file to base64
    const file = files[0];
    const base64Data = await fileToBase64(file);
    
    // Create previews for all files
    const previews = await Promise.all(
      files.map(f => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result as string);
        });
      })
    );

    console.log('📤 Inviando fattura a Netlify OCR...');
    
    // Call Netlify function
    const response = await fetch(`${OCR_ENDPOINT}?type=bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: base64Data
      })
    });

    if (!response.ok) {
      throw new Error(`OCR request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 Risposta Netlify OCR fattura:', result);

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      text: result.text || '',
      data: result.data || {},
      previews
    };

  } catch (error) {
    console.error('❌ Errore OCR Netlify fattura:', error);
    throw error;
  }
}
