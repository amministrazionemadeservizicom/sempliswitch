import { createWorker, PSM, OEM, Worker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// @ts-ignore - Disable external worker and use bundled version for reliability
// This avoids CORS issues with external CDNs
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = false;

// Alternative: Use the bundled worker from the node_modules
// (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.js',
//   import.meta.url
// ).toString();

let ocrWorker: Worker | null = null;

// 🔥 Timeout robusto per evitare blocchi infiniti
function runWithTimeout<T>(p: Promise<T>, ms = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`OCR timeout dopo ${ms}ms`)), ms);
    p.then(v => { clearTimeout(id); resolve(v); })
     .catch(e => { clearTimeout(id); reject(e); });
  });
}

// 🔥 Terminazione sicura del worker
export async function safeTerminate() {
  try { 
    if (ocrWorker) await ocrWorker.terminate(); 
  } catch {}
  ocrWorker = null;
}

// 🔥 Wrapper per getOcrWorker
export async function getOcrWorker(lang = "ita+eng") {
  if (ocrWorker) return ocrWorker;

  console.log('🚀 Inizializzazione OCR worker...');

  try {
    ocrWorker = await createWorker({ logger: () => {} });
    console.log('✅ OCR worker creato');

    console.log('📚 Caricamento lingua:', lang);
    await ocrWorker.loadLanguage(lang);
    console.log('✅ Lingua caricata');

    console.log('🔧 Inizializzazione OCR...');
    await ocrWorker.initialize(lang, OEM.LSTM_ONLY);
    console.log('✅ OCR inizializzato');

    console.log('⚙️ Configurazione parametri...');
    await ocrWorker.setParameters({
      user_defined_dpi: "300",
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-. :,;'()[]{}",
    });
    console.log('✅ OCR worker pronto!');

    return ocrWorker;
  } catch (error) {
    console.error('❌ Errore inizializzazione OCR worker:', error);
    throw error;
  }
}

// 🔥 Utility: canvas → Blob
async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), "image/png"));
}

// 🔥 Canvas preprocessing ottimizzato per velocità
function canvasFromImage(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calcola dimensioni ottimali (max 1200px per lato)
      const maxSize = 1200;
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;

      // Disegna immagine ridimensionata
      ctx.drawImage(img, 0, 0, width, height);

      // Preprocessing semplificato per velocità
      const id = ctx.getImageData(0, 0, width, height);
      const d = id.data;

      // Contrasto semplice senza threshold complesso
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round((d[i] + d[i+1] + d[i+2]) / 3);
        const enhanced = gray > 128 ? Math.min(255, gray + 30) : Math.max(0, gray - 30);
        d[i] = d[i+1] = d[i+2] = enhanced;
      }

      ctx.putImageData(id, 0, 0);
      resolve(c);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossibile caricare immagine'));
    };
    img.src = url;
  });
}

// 🔥 Riconoscimento con PSM specifico
async function recognizeOne(blob: Blob, psm: PSM) {
  const worker = await getOcrWorker();
  await worker.setParameters({ tessedit_pageseg_mode: String(psm) as any });
  return worker.recognize(blob);
}

// 🔥 OCR veloce - solo orientamento normale + un PSM
async function fastOCR(canvas: HTMLCanvasElement) {
  try {
    const blob = await canvasToBlob(canvas);
    const worker = await getOcrWorker();

    // Usa solo PSM AUTO per velocità
    await worker.setParameters({ tessedit_pageseg_mode: String(PSM.AUTO) as any });
    const { data } = await worker.recognize(blob);

    return { text: data.text || '', conf: data.confidence || 0 };
  } catch (error) {
    console.warn('OCR failed:', error);
    return { text: '', conf: 0 };
  }
}

// 🔥 Gestione PDF veloce
async function extractFromPDF(file: File) {
  const arrayBuf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuf }).promise;

  let fullText = "";
  const previews: string[] = [];

  // Limita a max 3 pagine per velocità
  const maxPages = Math.min(pdf.numPages, 3);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // Ridotta da 2.0 a 1.5
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx as any, viewport }).promise;

    const url = canvas.toDataURL("image/png");
    previews.push(url);

    const result = await runWithTimeout(fastOCR(canvas), 15000); // Ridotto da 30s a 15s
    fullText += `\n\n[Pagina ${i}]\n${result.text}`;
  }

  return { text: fullText.trim(), previewUrls: previews };
}

// 🔥 Gestione immagini veloce
async function extractFromImage(file: File) {
  console.log('🖼️ extractFromImage start for:', file.name);

  try {
    const url = URL.createObjectURL(file);
    console.log('🖼️ Canvas creation...');
    const canvas = await canvasFromImage(file);
    console.log('🖼️ Canvas created, size:', canvas.width, 'x', canvas.height);

    console.log('🖼️ Running OCR...');
    const result = await runWithTimeout(fastOCR(canvas), 10000); // Ridotto a 10s
    console.log('🖼️ OCR completed, text length:', result.text.length, 'confidence:', result.conf);

    return { text: result.text, previewUrls: [url] };
  } catch (error) {
    console.error('❌ Error in extractFromImage:', error);
    throw error;
  }
}

// 🔥 Funzione principale ottimizzata
export async function extractTextFromFiles(files: File[]) {
  console.log('🔥 Avvio extractTextFromFiles con', files.length, 'file(s)');

  const pages: { filename: string; page: number; text: string; previewUrl: string }[] = [];
  const previewsAll: string[] = [];
  let allText = "";

  // Limitazioni per performance
  if (files.length > 3) {
    throw new Error("Massimo 3 file alla volta per evitare timeout.");
  }

  const maxFileSize = 5 * 1024 * 1024; // 5MB
  for (const file of files) {
    console.log('📁 Controllo file:', file.name, 'Size:', Math.round(file.size/1024/1024), 'MB');
    if (file.size > maxFileSize) {
      throw new Error(`File "${file.name}" troppo grande (${Math.round(file.size/1024/1024)}MB). Massimo 5MB per file.`);
    }
  }

  try {
    await runWithTimeout((async () => {
      for (const file of files) {
        console.log('📄 Elaborazione file:', file.name);
        const ext = (file.name.split(".").pop() || "").toLowerCase();

        if (ext === "pdf") {
          console.log('📋 PDF processing disabled temporarily due to worker issues');
          console.warn('⚠️ Per elaborare PDF, convertire in immagini JPG/PNG');
          throw new Error(`PDF non supportato al momento. Converti "${file.name}" in immagini JPG/PNG.`);
        } else {
          console.log('🖼️ Processing image...');
          const { text, previewUrls } = await extractFromImage(file);
          console.log('🖼️ Image text length:', text.length);
          console.log('🖼️ First 200 chars:', text.substring(0, 200));
          allText += `\n\n=== ${file.name} ===\n${text}`;
          pages.push({ filename: file.name, page: 1, text, previewUrl: previewUrls[0] });
          previewsAll.push(...previewUrls);
        }
      }
    })(), 25000); // Ridotto da 45s a 25s

    console.log('✅ extractTextFromFiles completato. Total text length:', allText.length);
    return { text: allText.trim(), pages, previews: previewsAll };
  } catch (error: any) {
    console.error('❌ Errore in extractTextFromFiles:', error);
    await safeTerminate();
    if (error.message?.includes("timeout")) {
      throw new Error("OCR timeout: prova con immagini più piccole o meno file.");
    }
    throw error;
  }
}

export { safeTerminate as terminateOcrWorker };
