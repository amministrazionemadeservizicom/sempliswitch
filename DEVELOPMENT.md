# Development Setup

## Risoluzione Errori Comuni

### Errore: "❌ Error fetching contracts via admin API: SyntaxError: Unexpected token '<'"

Questo errore indica che le Netlify Functions non sono in esecuzione. Segui questi passi:

## Setup Sviluppo Completo

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Avvia il server di sviluppo con Netlify Functions
```bash
# Opzione 1: Comando completo (raccomandato)
npm run dev

# Opzione 2: Se il comando sopra non funziona, installa prima Netlify CLI
npm install -g netlify-cli
netlify dev
```

### 3. Verifica che le functions siano attive
Le Netlify Functions dovrebbero essere disponibili su:
- `http://localhost:8888/.netlify/functions/admin-contracts`
- `http://localhost:8888/.netlify/functions/save-contract`
- `http://localhost:8888/.netlify/functions/test-firebase-admin`

### 4. Test delle funzioni
Puoi testare le funzioni direttamente:
```bash
# Test admin contracts (dovrebbe restituire JSON)
curl http://localhost:8888/.netlify/functions/admin-contracts

# Test Firebase Admin
curl http://localhost:8888/.netlify/functions/test-firebase-admin
```

## Troubleshooting

### Se le functions non funzionano:

1. **Verifica che Netlify CLI sia installato:**
   ```bash
   netlify --version
   ```

2. **Installa Netlify CLI se necessario:**
   ```bash
   npm install -g netlify-cli
   ```

3. **Verifica i file di configurazione:**
   - `netlify.toml` deve esistere
   - `netlify/functions/` deve contenere i file `.ts`
   - `credentials/firebase-admin-credentials.json` deve esistere

4. **Fallback Mode:**
   Se le functions non funzionano, l'app dovrebbe automaticamente passare in "modalità ridotta" usando l'accesso diretto a Firebase (meno sicuro ma funzionale).

## Porte utilizzate

- **Frontend (Vite):** http://localhost:8080
- **Netlify Functions:** http://localhost:8888
- **Proxy Netlify:** http://localhost:8888 (combina frontend + functions)

## Problemi noti

### Button nesting error
Il problema del "button cannot appear as a descendant of button" in `Offers.tsx` è stato risolto separando i button annidati.

### Admin API non disponibile
Se le Netlify Functions non sono attive:
- L'app mostrerà un toast "⚠️ Modalità ridotta"
- I contratti verranno caricati direttamente da Firebase
- Alcune funzionalità admin potrebbero essere limitate
