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

// Helper function to clear cookies similar to the one in auth.ts
const clearCookie = (res: Response, name: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(name);
  } else {
    // Expire the cookie immediately
    const cookieValue = `${name}=; HttpOnly; ${isProduction ? 'Secure; ' : ''}Path=/; Max-Age=0; SameSite=${isProduction ? 'None' : 'Lax'}`;
    res.setHeader('Set-Cookie', cookieValue);
  }
};

/**
 * Middleware to check if user is authenticated via session cookie
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session ID from cookie
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      console.log('No session ID found in cookies');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Find the session in Cosmos DB
    const userSession = await cosmosDbService.getUserSessionById(sessionId);
    
    if (!userSession) {
      console.log(`Session ID ${sessionId} not found in database`);
      // Clear the invalid cookie
      clearCookie(res, 'sessionId');
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Check if the session has expired
    if (userSession.expiresOn < Date.now()) {
      console.log(`Session ID ${sessionId} has expired`);
      // Delete expired session from DB
      await cosmosDbService.deleteUserSession(sessionId);
      clearCookie(res, 'sessionId');
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Add user to request object
    // TODO: should this accessToken be here on the object? doesn't seem like it should...
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