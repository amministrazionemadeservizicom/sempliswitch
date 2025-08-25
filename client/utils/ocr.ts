import { createWorker, PSM, OEM, Worker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// @ts-ignore - serve per far caricare il worker di pdf.js in ambiente Vite/CRA
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js";

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

  ocrWorker = await createWorker({ logger: () => {} });

  await ocrWorker.loadLanguage(lang);
  await ocrWorker.initialize(lang, OEM.LSTM_ONLY);

  await ocrWorker.setParameters({
    user_defined_dpi: "300",
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-. :,;'()[]{}",
  });

  return ocrWorker;
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

// 🔥 Prova rotazioni 0°, 90°, 180°, 270° e PSM multipli
async function tryRotations(canvas: HTMLCanvasElement, psms: PSM[]) {
  const angles = [0, 90, 180, 270];
  let best = { text: '', conf: 0 };

  for (const angle of angles) {
    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d')!;
    if (angle % 180 === 0) { 
      tmp.width = canvas.width; tmp.height = canvas.height; 
    } else { 
      tmp.width = canvas.height; tmp.height = canvas.width; 
    }
    tctx.translate(tmp.width/2, tmp.height/2);
    tctx.rotate(angle * Math.PI / 180);
    tctx.drawImage(canvas, -canvas.width/2, -canvas.height/2);

    const blob = await canvasToBlob(tmp);
    
    for (const psm of psms) {
      try {
        const { data } = await recognizeOne(blob, psm);
        const conf = data.confidence || 0;
        const text = data.text || '';
        if (conf > best.conf) best = { text, conf };
        if (best.conf > 70 && best.text.trim().length > 10) return best;
      } catch {}
    }
  }
  return best;
}

// 🔥 Gestione PDF
async function extractFromPDF(file: File) {
  const arrayBuf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuf }).promise;

  let fullText = "";
  const previews: string[] = [];
  const psms = [PSM.SINGLE_BLOCK, PSM.AUTO, PSM.SPARSE_TEXT];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx as any, viewport }).promise;

    const url = canvas.toDataURL("image/png");
    previews.push(url);

    const result = await runWithTimeout(tryRotations(canvas, psms), 30000);
    fullText += `\n\n[Pagina ${i}]\n${result.text}`;
  }

  return { text: fullText.trim(), previewUrls: previews };
}

// 🔥 Gestione immagini
async function extractFromImage(file: File) {
  const url = URL.createObjectURL(file);
  const canvas = await canvasFromImage(file);
  const psms = [PSM.SINGLE_BLOCK, PSM.AUTO, PSM.SPARSE_TEXT];
  const result = await runWithTimeout(tryRotations(canvas, psms), 30000);
  return { text: result.text, previewUrls: [url] };
}

// 🔥 Funzione principale
export async function extractTextFromFiles(files: File[]) {
  const pages: { filename: string; page: number; text: string; previewUrl: string }[] = [];
  const previewsAll: string[] = [];
  let allText = "";

  try {
    await runWithTimeout((async () => {
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (ext === "pdf") {
          const { text, previewUrls } = await extractFromPDF(file);
          allText += `\n\n=== ${file.name} ===\n${text}`;
          previewUrls.forEach((url, idx) => {
            pages.push({ filename: file.name, page: idx + 1, text: "", previewUrl: url });
          });
          previewsAll.push(...previewUrls);
        } else {
          const { text, previewUrls } = await extractFromImage(file);
          allText += `\n\n=== ${file.name} ===\n${text}`;
          pages.push({ filename: file.name, page: 1, text, previewUrl: previewUrls[0] });
          previewsAll.push(...previewUrls);
        }
      }
    })(), 45000);

    return { text: allText.trim(), pages, previews: previewsAll };
  } catch (error: any) {
    await safeTerminate();
    if (error.message?.includes("timeout")) {
      throw new Error("OCR timeout: elaborazione troppo lenta. Riprova con immagini più piccole.");
    }
    throw error;
  }
}

export { safeTerminate as terminateOcrWorker };
