import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { sendTestEmail } from '../services/microsoftGraphService';

const router = express.Router();

// Test Microsoft Graph Email (requires authentication)

router.post('/email/send-test-graph-email', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Can't send email. User not authenticated." });
    }

    const accessToken = req.user.accessToken;
    //TODO: Do the recipient dynamically.
    const recipient = req.body.email || 'enrique.lejano@outlook.com';
    const result = await sendTestEmail(accessToken, req.body.email);

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${recipient}`,
      details: result
    })
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

export default router;