import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
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
    if (!req.user) {
      return res.status(401).json({ error: "Can't send email. User not authenticated." });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // TODO: Is there a more efficient way to type this?
    const accessToken = req.user.accessToken;
    const to = req.body.to;
    const subject = req.body.subject;
    const html = req.body.html || '';
    const workerNum = req.body.workerNum;
    const workerName = req.body.workerName;
    const senderName = req.body.senderName;
    const senderEmail = req.body.senderEmail;

    // The file buffer is already an ArrayBuffer-like object
    const attachment = req.file.buffer;
    const filename = req.file.originalname;

    const now = new Date();
    const date = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const timeSent = now.toLocaleString(); 
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
      date: date,
      timeSent: timeSent,
      subject: subject,
      successful: success
    }

    try {
      await cosmosDbService.createEmailLog(emailLog);
      console.log('Email log created successfully:', emailLog);
    } catch (error) {
      console.error('Failed to create email log:', error);
    }

    if (success) {
      res.status(200).json({ 
        success: false,
        message: 'Email sent and logged successfully.' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: 'Failed to send email. Logged attempt.' 
      });
    }
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