import { Request, Response } from "express";

export async function handleAdminContracts(req: Request, res: Response) {
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
    const method = req.method;
    const contractId = req.query.id as string;

    // Dynamically import Firebase Admin to avoid initialization issues
    const { adminOperations } = await import('../../server/firebase-admin');

    switch (method) {
      case 'GET':
        // Get contracts with optional filtering
        const filters = {
          status: req.query.status as string,
          createdBy: req.query.createdBy as string,
          dateFrom: req.query.dateFrom as string,
          dateTo: req.query.dateTo as string,
          gestore: req.query.gestore as string,
          tipologia: req.query.tipologia as string,
          onlyLocked: req.query.onlyLocked === 'true',
          onlyMine: req.query.onlyMine === 'true',
          userId: req.query.userId as string
        };

        // Get all contracts first
        let contracts = await adminOperations.getAllContracts();

        // Apply filters
        if (filters.status && filters.status !== 'all') {
          contracts = contracts.filter(c => c.statoOfferta === filters.status);
        }

        if (filters.createdBy) {
          contracts = contracts.filter(c => c.creatoDa?.id === filters.createdBy);
        }

        if (filters.gestore) {
          contracts = contracts.filter(c => c.gestore === filters.gestore);
        }

        if (filters.tipologia) {
          contracts = contracts.filter(c => c.tipologiaContratto === filters.tipologia);
        }

        if (filters.onlyLocked) {
          contracts = contracts.filter(c => {
            if (!c.lock) return false;
            const lockTime = new Date(c.lock.dataLock).getTime();
            const now = new Date().getTime();
            const lockDuration = 30 * 60 * 1000; // 30 minuti
            return (now - lockTime) < lockDuration;
          });
        }

        if (filters.onlyMine && filters.userId) {
          contracts = contracts.filter(c =>
            c.creatoDa?.id === filters.userId ||
            (c.lock && c.lock.lockedBy?.id === filters.userId)
          );
        }

        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          contracts = contracts.filter(c => new Date(c.dataCreazione) >= fromDate);
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          contracts = contracts.filter(c => new Date(c.dataCreazione) <= toDate);
        }

        return res.status(200).json({
          success: true,
          contracts,
          count: contracts.length,
          filters: filters
        });

      case 'PUT':
        // Update contract status or full contract
        if (!contractId) {
          return res.status(400).json({
            error: 'Contract ID is required'
          });
        }

        const updateData = req.body;

        if (updateData.action === 'lock') {
          // Lock contract for processing
          await adminOperations.updateContract(contractId, {
            lock: updateData.lock,
            statoOfferta: 'In Lavorazione'
          });
        } else if (updateData.action === 'unlock') {
          // Unlock contract
          await adminOperations.updateContract(contractId, {
            lock: null,
            statoOfferta: 'Caricato' // Reset to previous state
          });
        } else if (updateData.action === 'updateFull') {
          // Full contract update
          await adminOperations.updateContract(contractId, {
            statoOfferta: updateData.statoOfferta,
            noteStatoOfferta: updateData.noteStatoOfferta,
            contatto: updateData.contatto,
            ragioneSociale: updateData.ragioneSociale,
            lock: updateData.lock,
            cronologiaStati: updateData.cronologiaStati,
            dataUltimaIntegrazione: updateData.dataUltimaIntegrazione,
            nuoviPodAggiunti: updateData.nuoviPodAggiunti
          });
        } else {
          // Status update only (backward compatibility)
          await adminOperations.updateContractStatus(
            contractId,
            updateData.status,
            updateData.notes
          );
        }

        return res.status(200).json({
          success: true,
          message: 'Contract updated successfully'
        });

      case 'DELETE':
        // Delete contract
        if (!contractId) {
          return res.status(400).json({
            error: 'Contract ID is required'
          });
        }

        await adminOperations.deleteContract(contractId);

        return res.status(200).json({
          success: true,
          message: 'Contract deleted successfully'
        });

      default:
        return res.status(405).json({
          error: 'Method not allowed'
        });
    }

  } catch (error: any) {
    console.error('❌ Admin contracts API error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
