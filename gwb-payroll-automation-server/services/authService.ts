import { Request } from 'express';
import cosmosDbService from './cosmosDbService';
import { UserSession } from '../models/UserSession';

/**
 * Get the current user session from the request
 * @param req Express request object
 * @returns UserSession or null if not authenticated
 */
export const getCurrentUser = async (req: Request): Promise<UserSession | null> => {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    return null;
  }
  
  try {
    const userSession = await cosmosDbService.getUserSessionById(sessionId);
    
    if (!userSession) {
      return null;
    }
    
    // Check if session has expired
    if (userSession.expiresOn < Date.now()) {
      // Clean up expired session
      await cosmosDbService.deleteUserSession(sessionId);
      return null;
    }
    
    return userSession;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};

/**
 * Get the access token for the current user
 * @param req Express request object
 * @returns Access token or null if not available
 */
export const getAccessToken = async (req: Request): Promise<string | null> => {
  const userSession = await getCurrentUser(req);
  return userSession?.accessToken || null;
};

/**
 * Get basic user info (without sensitive data like tokens)
 * @param req Express request object
 * @returns Basic user info or null
 */
export const getUserInfo = async (req: Request): Promise<{ id: string; email: string; name: string } | null> => {
  const userSession = await getCurrentUser(req);
  
  if (!userSession) {
    return null;
  }
  
  return {
    id: userSession.id,
    email: userSession.email,
    name: userSession.name
  };
};

/**
 * Check if the current request is authenticated
 * @param req Express request object
 * @returns boolean indicating authentication status
 */
export const isAuthenticated = async (req: Request): Promise<boolean> => {
  const userSession = await getCurrentUser(req);
  return userSession !== null;
};

/**
 * Get the session ID from the request
 * @param req Express request object
 * @returns Session ID or null
 */
export const getSessionId = (req: Request): string | null => {
  return req.cookies?.sessionId || null;
};