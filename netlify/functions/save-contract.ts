import { Context } from "@netlify/functions";

export default async (request: Request, context: Context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // Only allow POST method
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), { status: 405, headers });
  }

  try {
    // Parse request body
    const requestBody = await request.json();
    
    const {
      contractData,
      userId,
      userName,
      userSurname,
      masterReference
    } = requestBody;

    // Validate required fields
    if (!contractData || !userId || !userName || !userSurname) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: contractData, userId, userName, userSurname'
      }), { status: 400, headers });
    }

    // Validate contract data structure
    if (!contractData.cliente || !contractData.cliente.nome || !contractData.cliente.cognome) {
      return new Response(JSON.stringify({
        error: 'Invalid contract data: missing client information'
      }), { status: 400, headers });
    }

    // Dynamically import Firebase Admin to avoid initialization issues
    const { adminOperations } = await import('../../server/firebase-admin');

    // Save contract using admin privileges
    const result = await adminOperations.saveContract(
      contractData,
      userId,
      userName,
      userSurname,
      masterReference
    );

    return new Response(JSON.stringify({
      success: true,
      message: 'Contract saved successfully',
      data: result
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('❌ Save contract API error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { status: 500, headers });
  }
};
