// gwb-payroll-automation-server/routes/auth.ts
import express, { Request, Response } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import cosmosDbService from '../services/cosmosDbService';
import { requireAuth } from '../middleware/authMiddleware';
import { getSessionId, getUserInfo } from '../services/authService';
import { UserSession } from '../models/UserSession';

dotenv.config();

const router = express.Router();

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

const redirectUri = isProduction
  ? process.env.OAUTH_REDIRECT_URI_PROD!
  : process.env.OAUTH_REDIRECT_URI_LOCAL!;

const frontendOrigin = isProduction
  ? process.env.FRONTEND_ORIGIN_PROD!
  : process.env.FRONTEND_ORIGIN_LOCAL!;

// Define cookie options for production environment
const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // true in production, false in development
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: isProduction ? 'none' : 'lax', // 'none' is required for cross-site cookies in secure contexts
  path: '/',
  domain: isProduction ? undefined : undefined, // Let browser set domain automatically
};

// Helper function to set cookies
const setCookie = (res: Response, name: string, value: string, options: any) => {
  if (typeof res.cookie === 'function') {
    res.cookie(name, value, options);
  } else {
    // Fallback for environments where res.cookie is not available
    const cookieValue = `${name}=${value}; HttpOnly; ${options.secure ? 'Secure; ' : ''}Path=${options.path}; Max-Age=${options.maxAge / 1000}; SameSite=${options.sameSite}`;
    res.setHeader('Set-Cookie', cookieValue);
  }
};

// Helper function to clear cookies
const clearCookie = (res: Response, name: string) => {
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(name);
  } else {
    // Expire the cookie immediately
    const cookieValue = `${name}=; HttpOnly; ${isProduction ? 'Secure; ' : ''}Path=/; Max-Age=0; SameSite=${isProduction ? 'None' : 'Lax'}`;
    res.setHeader('Set-Cookie', cookieValue);
  }
};

// Microsoft login
router.get('/auth/login', async (req: Request, res: Response) => {
  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: process.env.OAUTH_SCOPES!.split(' '),
    redirectUri,
  });

  res.redirect(authUrl);
});

// Handle the callback
router.get('/auth/callback', async (req: Request, res: Response) => {
  const authCode = req.query.code as string;

  if (!authCode) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const tokenResponse = await msalClient.acquireTokenByCode({
      code: authCode,
      scopes: process.env.OAUTH_SCOPES!.split(' '),
      redirectUri,
    });

    // Extract tokens
    const accessToken = tokenResponse.accessToken;
    // Check if we have refresh token information (may be in different properties depending on MSAL version)
    // @ts-ignore - handle potential differences in MSAL types
    const refreshToken = tokenResponse.refreshToken || null;
    const expiresOn = tokenResponse.expiresOn!.getTime();

    // Fetch user details from Microsoft Graph API
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data from Microsoft Graph');
    }

    const userData = await userResponse.json();

    // Create a unique session ID
    const sessionId = uuidv4();

    // Store session in Cosmos DB
    const userSession: UserSession = {
      id: sessionId,
      email: userData.mail || userData.userPrincipalName,
      name: userData.displayName,
      accessToken,
      refreshToken,
      expiresOn,
      createdAt: Date.now()
    };

    await cosmosDbService.createUserSession(userSession);

    // Set a session cookie using our helper function
    setCookie(res, 'sessionId', sessionId, cookieOptions);

    // For debugging, output what's happening (removed sessionId from logs for security)
    console.log(`Authentication successful`);

    // Redirect to the frontend without the token in URL
    res.redirect(frontendOrigin);
  } catch (error) {
    console.error('Error during token acquisition:', error);
    res.status(500).send('Authentication failed');
  }
});

// Logout 
router.get('/auth/logout', async (req: Request, res: Response) => {
  try {
    // Get session ID from cookie and delete from database
    const sessionId = getSessionId(req);
    
    if (sessionId) {
      await cosmosDbService.deleteUserSession(sessionId);
    }
    
    // Clear the session cookie using our helper function
    clearCookie(res, 'sessionId');
    
    // Redirect to Microsoft logout endpoint, then back to homepage
    const logoutUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/logout`;
    res.redirect(`${logoutUrl}?post_logout_redirect_uri=${frontendOrigin}`);
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).send('Logout failed');
  }
});

// Get current user details (protected route)
router.get('/auth/get-current-user', requireAuth, async (req: Request, res: Response) => {
  try {
    // Use authService to get user info
    const userInfo = await getUserInfo(req);
    
    if (!userInfo) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Send back user info without exposing tokens
    res.json({
      name: userInfo.name,
      email: userInfo.email,
      isAuthenticated: true
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});

// Check authentication status (public route)
router.get('/auth/status', async (req: Request, res: Response) => {
  try {
    // Use authService to check authentication
    const userInfo = await getUserInfo(req);
    
    if (!userInfo) {
      // Clear invalid cookie if present
      const sessionId = getSessionId(req);
      if (sessionId) {
        clearCookie(res, 'sessionId');
      }
      return res.json({ isAuthenticated: false });
    }
    
    // User is authenticated
    res.json({
      isAuthenticated: true,
      name: userInfo.name,
      email: userInfo.email
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint (protected route)
router.post('/auth/refresh-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      return res.status(401).json({ error: 'No session found' });
    }
    
    const userSession = await cosmosDbService.getUserSessionById(sessionId);
    if (!userSession || !userSession.refreshToken) {
      return res.status(401).json({ error: 'Invalid session or missing refresh token' });
    }
    
    // Use MSAL to get a new access token using the refresh token
    const tokenResponse = await msalClient.acquireTokenByRefreshToken({
      refreshToken: userSession.refreshToken,
      scopes: process.env.OAUTH_SCOPES!.split(' '),
    });
    
    if (!tokenResponse || !tokenResponse.accessToken) {
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
    
    // Update the session in Cosmos DB with new token
    // @ts-ignore - handle potential differences in MSAL types
    const newRefreshToken = tokenResponse.refreshToken || userSession.refreshToken;
    
    await cosmosDbService.updateUserSession(sessionId, {
      accessToken: tokenResponse.accessToken,
      refreshToken: newRefreshToken,
      expiresOn: tokenResponse.expiresOn!.getTime()
    });
    
    res.json({ success: true, message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;