import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import cosmosDbService from '../services/cosmosDbService';
import { EmailLog } from '../models/EmailLog';

const router = express.Router();

router.get('/logs/get-payslip-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    // Get limit parameter from query string, default to 100 if not provided
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    // Validate limit parameter
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ 
        error: 'Invalid limit parameter',
        message: 'Limit must be a positive number'
      });
    }
    
    // Get all email logs using the service
    const logs = await cosmosDbService.getAllEmailLogs(limit);
    
    // Return the logs
    return res.status(200).json(logs);
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    return res.status(500).json({
      error: 'Failed to fetch email logs',
      message: error.message || 'Unknown error occurred'
    });
  }
});

export default router;