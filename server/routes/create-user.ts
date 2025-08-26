import { Request, Response } from "express";

export async function handleCreateUser(req: Request, res: Response) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const userData = req.body;

    // Dynamically import Firebase Admin to avoid initialization issues
    const { adminOperations } = await import('../../server/firebase-admin');

    const result = await adminOperations.createUserWithRole(userData);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('❌ Create user API error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
