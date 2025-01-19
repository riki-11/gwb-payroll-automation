import express, { Request, Response } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';
import axios from 'axios';

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

    // Make a request to Microsoft Graph API
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Add access token to request headers
      },
    });

    const user = graphResponse.data;
    const username = user.displayName || 'Unknown User';
    const userEmail = user.mail || user.userPrincipalName || 'Unknown Email';

    // Redirect to the frontend with user info and access token
    res.redirect(`${frontendOrigin}/?username=${encodeURIComponent(username)}&userEmail=${encodeURIComponent(userEmail)}&accessToken=${encodeURIComponent(accessToken)}`);
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

export default router;

