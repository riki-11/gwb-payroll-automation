import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getAccessToken, getUserInfo } from '../services/authService';
import { sendEmailWithAttachment } from '../services/microsoftGraphService';
import { EmailLog } from '../models/EmailLog';
import multer from 'multer';
import cosmosDbService from '../services/cosmosDbService';

const router = express.Router();

// Configure multer storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Send payslip email with attachment using Microsoft Graph API
router.post('/email/send-payslip', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Use authService to get access token instead of req.user
    const accessToken = await getAccessToken(req);
    if (!accessToken) {
      return res.status(401).json({ error: "Can't send email. No access token." });
    }

    // Get user info for logging purposes
    const userInfo = await getUserInfo(req);
    if (!userInfo) {
      return res.status(401).json({ error: "Can't send email. User not authenticated." });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract request body parameters
    const to = req.body.to;
    const subject = req.body.subject;
    const html = req.body.html || '';
    const workerNum = req.body.workerNum;
    const workerName = req.body.workerName;
    const senderName = req.body.senderName;
    const senderEmail = req.body.senderEmail;
    const batchId = req.body.batchId;
    const batchItemNum = req.body.batchItemNum;
    const batchSize = req.body.batchSize;

    // The file buffer is already an ArrayBuffer-like object
    const attachment = req.file.buffer;
    const filename = req.file.originalname;

    const now = new Date();
    const date = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const timeSent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let success = false;

    try {
      const result = await sendEmailWithAttachment(
        accessToken,
        to,
        subject,
        html,
        attachment, // This is already an ArrayBuffer-like type
        filename
      );

      success = result.success;
    } catch (error) {
      console.error('Error sending email:', error);
    }

    // Log send email details to Cosmos DB.
    const emailLog: EmailLog = {
      senderName: senderName,
      senderEmail: senderEmail,
      recipientName: workerName,
      recipientEmail: to,
      recipientWorkerNum: workerNum,
      recipientPayslipFile: filename,
      batchId: batchId,
      batchItemNum: batchItemNum,
      batchSize: batchSize,
      date: date,
      timeSent: timeSent,
      subject: subject,
      successful: success
    }

    try {
      await cosmosDbService.createEmailLog(emailLog);
    } catch (error) {
      console.error('Failed to create email log:', error);
    }

    if (success) {
      res.status(200).json({ 
        success: true,
        message: 'Email sent and logged successfully.' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: 'Failed to send email. Logged attempt.'
      });
    }
  } catch (error) {
    console.error('Error in send-payslip route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;