import { Client } from '@microsoft/microsoft-graph-client';

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

/**
 * Converts buffer to base64 string using Node.js Buffer
 */
function bufferToBase64(buffer: Buffer | ArrayBuffer | Uint8Array): string {
  // If buffer is ArrayBuffer or Uint8Array, convert to Buffer
  const nodeBuffer = Buffer.isBuffer(buffer) 
    ? buffer 
    : Buffer.from(buffer);
  
  // Convert Buffer to base64 string
  return nodeBuffer.toString('base64');
}

/**
 * Sends an email with attachment using Microsoft Graph API
 * @param accessToken The Microsoft Graph API access token
 * @param from The sender's email address (not used directly as Graph API uses the authenticated user)
 * @param to The recipient's email address
 * @param subject The email subject
 * @param html The HTML content of the email
 * @param attachment The file attachment (as a Buffer, ArrayBuffer, or Uint8Array)
 * @param filename The original filename for the attachment
 */
export const sendEmailWithAttachment = async (
  accessToken: string,
  to: string,
  subject: string,
  html: string,
  attachment: Buffer | ArrayBuffer | Uint8Array,
  filename: string
) => {
  try {
    const client = createUserGraphClient(accessToken);
    
    // Convert buffer to base64
    const base64Attachment = bufferToBase64(attachment);
    
    // Create email with attachment
    const email = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: html
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ],
        attachments: [
          {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: filename,
            contentType: 'application/pdf', // Assuming payslips are PDFs, adjust if needed
            contentBytes: base64Attachment
          }
        ]
      },
      saveToSentItems: true
    };
    
    // Send the mail through Graph API
    await client.api('/me/sendMail').post(email);
    
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    console.error('Error sending email with attachment via Microsoft Graph API:', error);
    throw error;
  }
};