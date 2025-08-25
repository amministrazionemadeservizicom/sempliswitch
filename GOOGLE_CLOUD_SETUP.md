# Configurazione Google Cloud Vision API

## Prerequisiti

1. **Account Google Cloud Platform**
   - Crea un account su [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un nuovo progetto o seleziona un progetto esistente

2. **Abilita Cloud Vision API**
   - Vai alla [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
   - Clicca su "ABILITA" per abilitare l'API per il tuo progetto

## Configurazione Credenziali

### Metodo 1: Service Account (Raccomandato per produzione)

1. **Crea Service Account**
   ```bash
   # Vai su Console > IAM & Admin > Service Accounts
   # Clicca "CREATE SERVICE ACCOUNT"
   # Nome: ocr-service-account
   # Ruolo: Cloud Vision AI Service Agent
   ```

2. **Scarica chiave JSON**
   - Clicca sui tre punti del service account creato
   - "Manage keys" > "ADD KEY" > "Create new key" > JSON
   - Scarica il file JSON

3. **Configura variabile d'ambiente**
   ```bash
   # Linux/macOS
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"
   
   # Windows
   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\credentials.json
   ```

### Metodo 2: ADC (Application Default Credentials)

```bash
# Installa gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Autentica
gcloud auth application-default login

# Imposta progetto
gcloud config set project YOUR_PROJECT_ID
```

## Configurazione Progetto

### 1. File .env (per sviluppo locale)
```env
# Aggiungi al file .env nella root del progetto
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

### 2. Variabili d'ambiente di produzione
```bash
# Per deploy (Netlify, Vercel, ecc.)
GOOGLE_APPLICATION_CREDENTIALS=base64_encoded_service_account_json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

## Test Configurazione

### 1. Test server locale
```bash
npm run dev
```

### 2. Test endpoint OCR
```bash
# Test documento
curl -X POST http://localhost:8080/api/ocr/document \
  -F "file=@/path/to/document.jpg"

# Test fattura  
curl -X POST http://localhost:8080/api/ocr/bill \
  -F "file=@/path/to/bill.pdf"
```

## Troubleshooting

### Errore: "Could not load the default credentials"
- Verifica che `GOOGLE_APPLICATION_CREDENTIALS` punti al file JSON corretto
- Controlla che il file JSON esista e sia leggibile
- Verifica che il service account abbia i permessi corretti

### Errore: "Cloud Vision API has not been used"
- Abilita Cloud Vision API nel Google Cloud Console
- Attendi qualche minuto per la propagazione

### Errore: "Permission denied"
- Verifica che il service account abbia il ruolo "Cloud Vision AI Service Agent"
- Controlla che l'API sia abilitata per il progetto

## Limiti e Costi

### Quote predefinite
- 1000 richieste/mese gratuite
- Dopo: $1.50 per 1000 richieste

### Ottimizzazioni
- Dimensione immagine ottimale: 1024x1024px
- Formati supportati: JPEG, PNG, GIF, PDF, TIFF
- Dimensione massima: 20MB per immagine, 2000 pagine per PDF

## Fallback

Il sistema è configurato con fallback automatico:
1. **Primo tentativo**: Google Cloud Vision (server-side)
2. **Fallback**: Tesseract.js (client-side)

Se Google Cloud Vision non è configurato o non funziona, il sistema utilizzerà automaticamente Tesseract.js.
