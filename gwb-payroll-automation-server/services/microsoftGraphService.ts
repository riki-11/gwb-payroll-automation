import { Client } from '@microsoft/microsoft-graph-client';
// import 'isomorphic-fetch'; // Required for Microsoft Graph client in Node.js

/**
 * Creates a Microsoft Graph client using the user's access token
 */
export const createUserGraphClient = (accessToken: string) => {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
};

/**
 * Sends a simple test email using Microsoft Graph API
 */
export const sendTestEmail = async (
  accessToken: string,
  to: string
) => {
  try {
    const client = createUserGraphClient(accessToken);
    
    // Create a simple email
    const email = {
      message: {
        subject: 'Test Email from GWB Payroll App',
        body: {
          contentType: 'HTML',
          content: `
            <h1>This is a test email</h1>
            <p>Successfully sent via Microsoft Graph API from the GWB Payroll Automation application.</p>
            <p>If you're seeing this, the integration is working correctly!</p>
          `
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ]
      },
      saveToSentItems: true
    };
    
    // Send the mail through Graph API
    await client.api('/me/sendMail').post(email);
    
    return { success: true, message: 'Test email sent successfully!' };
  } catch (error) {
    console.error('Error sending test email with Microsoft Graph API:', error);
    throw error;
  }
};