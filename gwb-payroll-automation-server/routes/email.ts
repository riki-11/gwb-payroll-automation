import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { sendTestEmail, sendEmailWithAttachment } from '../services/microsoftGraphService';
import multer from 'multer';

const router = express.Router();

// Configure multer storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Test Microsoft Graph Email (requires authentication)
router.post('/email/send-test-graph-email', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Can't send email. User not authenticated." });
    }

    const accessToken = req.user.accessToken;
    // TODO: Do email recipient dynamically
    const recipient = req.body.email || 'enrique.lejano@outlook.com';
    const result = await sendTestEmail(accessToken, recipient);

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${recipient}`,
      details: result
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);

    // Handle specific error cases
    if (error.statusCode === 401) {
      return res.status(401).json({
        error: 'Authentication error',
        message: 'Your session has expired or you don\'t have permission to send emails.'
      });
    }

    return res.status(500).json({
      error: 'Failed to send test email',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Send payslip email with attachment using Microsoft Graph API
router.post('/email/send-payslip', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Can't send email. User not authenticated." });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const accessToken = req.user.accessToken;
    const to = req.body.to;
    const subject = req.body.subject;
    const html = req.body.html || '';
    
    // The file buffer is already an ArrayBuffer-like object
    const attachment = req.file.buffer;
    const filename = req.file.originalname;

    const result = await sendEmailWithAttachment(
      accessToken,
      to,
      subject,
      html,
      attachment, // This is already an ArrayBuffer-like type
      filename
    );

    return res.status(200).json({
      success: true,
      message: 'Payslip email sent successfully',
      details: result
    });
  } catch (error: any) {
    console.error('Error sending payslip email:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({
        error: 'Authentication error',
        message: 'Your session has expired or you don\'t have permission to send emails.'
      });
    }

    return res.status(500).json({
      error: 'Failed to send payslip email',
      message: error.message || 'Unknown error occurred'
    });
  }
});

export default router;