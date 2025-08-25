import { Context } from "@netlify/functions";

export default async (request: Request, context: Context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const url = new URL(request.url);
    const method = request.method;
    const contractId = url.searchParams.get('id');

    // Dynamically import Firebase Admin to avoid initialization issues
    const { adminOperations } = await import('../../server/firebase-admin');

    switch (method) {
      case 'GET':
        // Get all contracts with admin privileges
        const contracts = await adminOperations.getAllContracts();
        return new Response(JSON.stringify({
          success: true,
          contracts,
          count: contracts.length
        }), { status: 200, headers });

      case 'PUT':
        // Update contract status or full contract
        if (!contractId) {
          return new Response(JSON.stringify({
            error: 'Contract ID is required'
          }), { status: 400, headers });
        }

        const updateData = await request.json();

        if (updateData.action === 'updateFull') {
          // Full contract update
          await adminOperations.updateContract(contractId, {
            statoOfferta: updateData.statoOfferta,
            noteStatoOfferta: updateData.noteStatoOfferta,
            contatto: updateData.contatto,
            ragioneSociale: updateData.ragioneSociale
          });
        } else {
          // Status update only (backward compatibility)
          await adminOperations.updateContractStatus(
            contractId,
            updateData.status,
            updateData.notes
          );
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Contract updated successfully'
        }), { status: 200, headers });

      case 'DELETE':
        // Delete contract
        if (!contractId) {
          return new Response(JSON.stringify({
            error: 'Contract ID is required'
          }), { status: 400, headers });
        }

        await adminOperations.deleteContract(contractId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Contract deleted successfully'
        }), { status: 200, headers });

      default:
        return new Response(JSON.stringify({
          error: 'Method not allowed'
        }), { status: 405, headers });
    }

  } catch (error: any) {
    console.error('❌ Admin contracts API error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), { status: 500, headers });
  }
};
