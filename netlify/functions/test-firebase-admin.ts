import { Context } from "@netlify/functions";

export default async (request: Request, context: Context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    });
  }

  try {
    console.log('🧪 Testing Firebase Admin SDK...');
    
    // Dynamically import Firebase Admin
    const { adminDb, adminAuth, adminOperations } = await import('../../server/firebase-admin');
    
    // Test 1: Check Firestore access
    const contractsSnapshot = await adminDb.collection('contratti').limit(1).get();
    const contractsCount = contractsSnapshot.size;
    
    // Test 2: Check Auth access
    const usersResult = await adminAuth.listUsers(1);
    const usersCount = usersResult.users.length;
    
    // Test 3: Test admin operations
    const allContracts = await adminOperations.getAllContracts();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Firebase Admin SDK is working correctly',
      tests: {
        firestore: {
          status: 'OK',
          contractsInDatabase: allContracts.length
        },
        authentication: {
          status: 'OK',
          usersFound: usersCount
        },
        adminOperations: {
          status: 'OK',
          operationsAvailable: Object.keys(adminOperations).length
        }
      },
      timestamp: new Date().toISOString()
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('❌ Firebase Admin test failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Firebase Admin SDK test failed',
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }), { status: 500, headers });
  }
};
