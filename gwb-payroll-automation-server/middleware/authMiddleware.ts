// gwb-payroll-automation-server/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import cosmosDbService from '../services/cosmosDbService';

// Extend the Express Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        accessToken: string;
      };
    }
  }
}

/**
 * Middleware to check if user is authenticated via session cookie
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session ID from cookie
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Find the session in Cosmos DB
    const userSession = await cosmosDbService.getUserSessionById(sessionId);
    
    if (!userSession) {
      // Clear the invalid cookie
      res.clearCookie('sessionId');
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Check if the session has expired
    if (userSession.expiresOn < Date.now()) {
      // Delete expired session from DB
      await cosmosDbService.deleteUserSession(sessionId);
      res.clearCookie('sessionId');
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Add user to request object
    req.user = {
      id: userSession.id,
      email: userSession.email,
      name: userSession.name,
      accessToken: userSession.accessToken
    };
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};