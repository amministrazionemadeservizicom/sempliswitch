# 🔧 Scripts di Amministrazione Firebase

Questo folder contiene script per gestire gli utenti nel database Firebase.

## 📋 Script Disponibili

- **`updateUsers.ts`** - Versione TypeScript completa con classi e gestione avanzata
- **`updateUsers.js`** - Versione JavaScript semplificata per uso rapido

## 🚀 Setup Iniziale

### 1. Installa Dipendenze

```bash
npm install firebase-admin dotenv
```

### 2. Configura Credenziali Firebase

**Metodo 1: File JSON (Consigliato)**

1. Vai alla [Console Firebase](https://console.firebase.google.com/)
2. Seleziona il progetto "sempliswitch"
3. Vai su **Impostazioni Progetto** → **Account di servizio**
4. Clicca **Genera nuova chiave privata**
5. Salva il file come `firebase-service-account.json` nella root del progetto
6. Aggiungi al file `.env`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

**Metodo 2: Variabili d'Ambiente**

Aggiungi al file `.env`:

```env
FIREBASE_PROJECT_ID=sempliswitch
FIREBASE_CLIENT_EMAIL=your-service-account@sempliswitch.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

### 3. Crea File .env

Copia `.env.example` in `.env` e compila i valori.

## 🎯 Uso Rapido

### Script JavaScript (Semplice)

```bash
node server/scripts/updateUsers.js
```

### Script TypeScript (Avanzato)

```bash
npm run ts-node server/scripts/updateUsers.ts
# oppure
npx ts-node server/scripts/updateUsers.ts
```

## 📝 Esempi di Utilizzo

### 1. Aggiorna Ruolo Utente

```javascript
// Modifica nello script
await updateUser("M4P77GsN0XYZ123", {
  role: "consulente",
  parentId: "MASTER_UID_QUI"
});
```

### 2. Trova Utente per Email

```javascript
const uid = await findUserByEmail("utente@example.com");
if (uid) {
  await updateUser(uid, {
    role: "backoffice",
    attivo: true
  });
}
```

### 3. Aggiorna Più Utenti (Solo TypeScript)

```typescript
await updater.updateUsers([
  {
    uid: "user1",
    role: "consulente", 
    parentId: "master_uid"
  },
  {
    uid: "user2",
    role: "backoffice"
  }
]);
```

## 🏷️ Ruoli Disponibili

- `admin` - Amministratore completo
- `master` - Master account (genitore di consulenti)
- `consulente` - Consulente (figlio di master)
- `backoffice` - Backoffice

## 📊 Campi Aggiornabili

- `role` - Ruolo utente
- `parentId` - UID del genitore (per consulenti)
- `nome` - Nome utente
- `cognome` - Cognome utente  
- `email` - Email utente
- `attivo` - Stato attivo (true/false)

## ⚠️ Note di Sicurezza

1. **Mai commitare** il file JSON delle credenziali
2. **Aggiungi al .gitignore**: `firebase-service-account.json`
3. **Usa variabili d'ambiente** in produzione
4. **Testa sempre** su utenti di test prima

## 🐛 Troubleshooting

### Errore: "Failed to initialize Firebase"

- Verifica che il file JSON esista
- Controlla che le variabili d'ambiente siano corrette
- Assicurati che l'account di servizio abbia i permessi giusti

### Errore: "Permission denied"

- L'account di servizio deve avere il ruolo "Firebase Admin SDK Administrator Service Agent"
- Verifica le regole di sicurezza di Firestore

### Errore: "User not found"

- Controlla che l'UID sia corretto
- Verifica che l'utente esista nella collezione "utenti"

## 📞 Supporto

Per problemi con gli script, controlla:

1. I log della console per dettagli sull'errore
2. Le credenziali Firebase
3. I permessi dell'account di servizio
4. La struttura della collezione "utenti"

---

💡 **Tip**: Usa sempre `listUsers()` per vedere gli utenti esistenti prima di fare aggiornamenti!
