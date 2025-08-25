import { Context } from "@netlify/functions";

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { nome, email, password, ruolo, stato, pianoCompensi, gestoriAssegnati, master } = body;

    // Validate required fields
    if (!nome || !email || !password || !ruolo) {
      return new Response(JSON.stringify({ error: 'Campi obbligatori mancanti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now, we'll use a mock response since we need to set up Firebase Admin SDK
    // In a real implementation, this would use Firebase Admin SDK to create the user
    const mockUid = `user_${Date.now()}`;
    
    // Simulate user creation
    const userData = {
      uid: mockUid,
      nome,
      email,
      ruolo,
      stato: stato ? "attivo" : "non attivo",
      pianoCompensi: pianoCompensi || "",
      gestoriAssegnati: gestoriAssegnati || [],
      master: master || "",
      createdAt: new Date().toISOString()
    };

    console.log("✅ Mock user created:", userData);

    return new Response(JSON.stringify({ 
      success: true, 
      uid: mockUid,
      message: "Utente creato con successo" 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });

  } catch (error: any) {
    console.error("❌ Errore durante la creazione dell'utente:", error.message);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
