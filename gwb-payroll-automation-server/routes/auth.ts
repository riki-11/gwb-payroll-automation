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

    // Set the access token as a secure, HTTP-only cookie
    res.cookie('accessToken', accessToken, {
      //  TODO: double check if this can be seen in production
      httpOnly: true, // Protects against XSS attacks
      secure: isProduction, // Only sent over HTTPS in production
      sameSite: 'strict', // Helps prevent CSRF attacks
      maxAge: 60 * 60 * 1000, // Token expiration (e.g., 1 hour in milliseconds)
    });

    // Need username and email in frontend
    res.cookie('username', username, {
      httpOnly: false, // Accessible to frontend JavaScript
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('userEmail', userEmail, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });

    // Redirect to the frontend
    res.redirect(`${frontendOrigin}`);
  } catch (error) {
    console.error('Error during token acquisition:', error);
    res.status(500).send('Authentication failed');
  }
});

// Logout 
router.get('/auth/logout', async (req: Request, res: Response) => {
  try {
    // Clear cookies on logout
    res.clearCookie('accessToken');
    res.clearCookie('username');
    res.clearCookie('userEmail');

    // logout endpoint
    const logoutUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/logout`;

    // redirect to Microsoft logout endpoint, then back to homepage.
    res.redirect(`${logoutUrl}?post_logout_redirect_uri=${frontendOrigin}`);
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).send('Logout failed');
  }
});

// Verify session route
router.get('/auth/verify-session', async (req: Request, res: Response) => {
  console.log('Cookies:', req.cookies); // Debugging line
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    console.error('No access token found');
    // TODO: Maybe don't use this type of error message in production?
    return res.status(401).json({ isLoggedIn: false });
  }

  try {
    // Optionally, validate the token with Microsoft Graph or your service
    res.status(200).json({ isLoggedIn: true });
  } catch (error) {
    res.status(401).json({ isLoggedIn: false });
  }
});


// Route to grab the user authentication info.
router.get('/auth/get-user-info', async (req: Request, res: Response) => {
  try {
    // Get the username and email from the cookies
    const username = req.cookies.username;
    const userEmail = req.cookies.userEmail;

    // Send the username and email back to the frontend
    res.json({ username, userEmail });
  } catch (error) {
    console.error('Error during user retrieval:', error);
    res.status(500).send('User retrieval failed');
  }
})



export default router;

