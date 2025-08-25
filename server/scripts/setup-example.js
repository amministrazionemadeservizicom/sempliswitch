const { updateUser, findUserByEmail, listUsers } = require('./updateUsers.js');

/**
 * Script di esempio per operazioni comuni
 * Modifica questo file per le tue esigenze specifiche
 */

async function setupConsulente() {
  console.log("🎯 Setup Consulente - Esempio");
  
  // 1. Trova master per email
  const masterUid = await findUserByEmail("master@sempliswitch.it");
  if (!masterUid) {
    console.log("❌ Master non trovato. Crealo prima o usa l'UID diretto.");
    return;
  }

  // 2. Trova consulente per email  
  const consulenteUid = await findUserByEmail("consulente@example.com");
  if (!consulenteUid) {
    console.log("❌ Consulente non trovato. Crealo prima o usa l'UID diretto.");
    return;
  }

  // 3. Aggiorna consulente
  await updateUser(consulenteUid, {
    role: "consulente",
    parentId: masterUid,
    attivo: true
  });

  console.log("✅ Setup consulente completato!");
}

async function setupBackoffice() {
  console.log("🎯 Setup Backoffice - Esempio");
  
  const backofficeUid = await findUserByEmail("backoffice@sempliswitch.it");
  if (!backofficeUid) {
    console.log("❌ Utente backoffice non trovato");
    return;
  }

  await updateUser(backofficeUid, {
    role: "backoffice",
    attivo: true
  });

  console.log("✅ Setup backoffice completato!");
}

async function promoteToAdmin() {
  console.log("🎯 Promozione ad Admin - Esempio");
  
  // ATTENZIONE: Sostituisci con email reale
  const adminUid = await findUserByEmail("admin@sempliswitch.it");
  if (!adminUid) {
    console.log("❌ Utente admin non trovato");
    return;
  }

  await updateUser(adminUid, {
    role: "admin",
    attivo: true
  });

  console.log("✅ Promozione ad admin completata!");
}

async function resetUserRole() {
  console.log("🎯 Reset Ruolo Utente - Esempio");
  
  // Sostituisci con UID o email reale
  const uid = "USER_UID_HERE";
  
  await updateUser(uid, {
    role: "consulente", // Reset a consulente
    parentId: null,     // Rimuovi parent
    attivo: false       // Disattiva
  });

  console.log("✅ Reset ruolo completato!");
}

// Menu interattivo
async function showMenu() {
  console.log(`
🎛️  MENU OPERAZIONI UTENTI

Decommentare la funzione desiderata nel codice:

1. setupConsulente()      - Configura un consulente con master
2. setupBackoffice()      - Configura un utente backoffice
3. promoteToAdmin()       - Promuovi un utente ad admin
4. resetUserRole()        - Reset ruolo di un utente
5. listUsers()           - Lista tutti gli utenti

⚠️  IMPORTANTE: Modifica gli UID/email prima di eseguire!
  `);
}

async function main() {
  try {
    // Mostra menu
    await showMenu();
    
    // Lista utenti attuali
    await listUsers(10);
    
    // ==========================================
    // DECOMMENTARE LA FUNZIONE CHE TI SERVE
    // ==========================================
    
    // await setupConsulente();
    // await setupBackoffice(); 
    // await promoteToAdmin();
    // await resetUserRole();
    
    console.log("\n🎉 Operazioni completate!");
    
  } catch (error) {
    console.error("💥 Errore:", error.message);
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  setupConsulente,
  setupBackoffice,
  promoteToAdmin,
  resetUserRole
};
