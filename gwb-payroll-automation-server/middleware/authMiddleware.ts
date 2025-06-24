import { Request, Response, NextFunction } from 'express';
import { getSessionId, isAuthenticated } from '../services/authService';

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
 * No longer stores user data in req.user - uses AuthService for just-in-time lookups
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session ID from cookie
    const sessionId = getSessionId(req);
    
    if (!sessionId) {
      console.log('No session ID found in cookies');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user is authenticated using authService
    const userIsAuthenticated = await isAuthenticated(req);
    
    if (!userIsAuthenticated) {
      console.log('Session not found or expired');
      // Clear the invalid cookie
      clearCookie(res, 'sessionId');
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // User is authenticated - continue to the next middleware or route handler
    // No need to store anything in req.user
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};