// gwb-payroll-automation-server/routes/auth.ts
import express, { Request, Response } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import cosmosDbService, { UserSession } from '../services/cosmosDbService';
import { requireAuth } from '../middleware/authMiddleware';

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

// Define cookie options
const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // true in production, false in development
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
};

// Helper function to set cookies that works in all environments
const setCookie = (res: Response, name: string, value: string, options: any) => {
  // Check if res.cookie function exists (standard Express)
  if (typeof res.cookie === 'function') {
    res.cookie(name, value, options);
  } else {
    // Fallback for environments where res.cookie is not available (like some serverless)
    const cookieValue = `${name}=${value}`;
    const cookieParts = [cookieValue];
    
    if (options.httpOnly) cookieParts.push('HttpOnly');
    if (options.secure) cookieParts.push('Secure');
    if (options.maxAge) cookieParts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
    if (options.path) cookieParts.push(`Path=${options.path}`);
    if (options.sameSite) cookieParts.push(`SameSite=${options.sameSite}`);
    
    const cookieString = cookieParts.join('; ');
    res.setHeader('Set-Cookie', cookieString);
  }
};

// Helper function to clear cookies
const clearCookie = (res: Response, name: string) => {
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(name);
  } else {
    // Expire the cookie immediately
    setCookie(res, name, '', {
      httpOnly: true,
      secure: isProduction,
      maxAge: 0,
      path: '/',
      sameSite: isProduction ? 'none' : 'lax',
    });
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

    // For debugging, output what's happening
    console.log(`Authentication successful for user: ${userData.displayName}`);
    console.log(`Session ID ${sessionId} stored in Cosmos DB`);
    console.log(`Redirecting to frontend: ${frontendOrigin}`);

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
    // Get session ID from cookie
    const sessionId = req.cookies?.sessionId;
    
    // If there's a session ID, delete it from the database
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
    // The user is already set in the request object by the middleware
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Send back user info without exposing tokens
    res.json({
      name: req.user.name,
      email: req.user.email,
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
    // Get session ID from cookie
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      return res.json({ isAuthenticated: false });
    }
    
    // Find the session in Cosmos DB
    const userSession = await cosmosDbService.getUserSessionById(sessionId);
    
    if (!userSession || userSession.expiresOn < Date.now()) {
      // Clear invalid cookie
      clearCookie(res, 'sessionId');
      return res.json({ isAuthenticated: false });
    }
    
    // User is authenticated
    res.json({
      isAuthenticated: true,
      name: userSession.name,
      email: userSession.email
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint (protected route)
router.post('/auth/refresh-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.sessionId;
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