import express, { Request, Response } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';

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

    // Extract access token
    const accessToken = tokenResponse.accessToken;

    // Fetch user details from Microsoft Graph API
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });


    const userData = await userResponse.json();
    // Redirect to the frontend with the access token
    res.redirect(`${frontendOrigin}/?token=${accessToken}`);
  } catch (error) {
    console.error('Error during token acquisition:', error);
    res.status(500).send('Authentication failed');
  }
});

// Logout 
router.get('/auth/logout', async (req: Request, res: Response) => {
  try {
    // logout endpoint
    const logoutUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/logout`;

    // Optionally clear session on your side if you're maintaining one
    // For example:
    // req.session.destroy();

    // redirect to Microsoft logout endpoint, then back to homepage.
    res.redirect(`${logoutUrl}?post_logout_redirect_uri=${frontendOrigin}`);
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).send('Logout failed');
  }
});

router.get('/auth/get-current-user', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Unauthorized');
  } 

  const accessToken = authHeader.split(' ')[1];

  try {
    // Fetch details from Microsoft Graph API
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}`},
    });

    if (!userResponse.ok) {
      return res.status(userResponse.status).json({ error: 'Failed to fetch user details' });
    }

    const userData = await userResponse.json();
    res.json({
      accessToken: accessToken,
      name: userData.displayName,
      email: userData.mail
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).send('Error fetching user details');
  }
});

export default router;

