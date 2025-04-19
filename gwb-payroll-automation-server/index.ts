import express, { Request, Response } from 'express';
import authRouter from './routes/auth';
import nodemailer from 'nodemailer';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = 3000;

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Get the frontend origin from environment variables
const allowedOrigins = [
  // TODO: Hide the frontend origins in production?
  process.env.FRONTEND_ORIGIN_PROD || "https://gwb-payroll-automation-client.vercel.app/",
  process.env.FRONTEND_ORIGIN_LOCAL || "http://localhost:5173"
];

// Enable CORS for all routes based on environment
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(authRouter);

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: process.env.OUTLOOK_EMAIL,
    pass: process.env.OUTLOOK_PASSWORD,
  },
});

app.post('/api/send-payslip-to-email', upload.single('file'), async (req: Request, res: Response) => {
  
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  // Create mail options object
  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.OUTLOOK_EMAIL,
    to: req.body.to,
    subject: req.body.subject,
    attachments: [
      {
        filename: req.file.originalname,
        content: req.file.buffer,
      },
    ],
  };

  // Check if HTML content was provided
  if (req.body.html) {
    mailOptions.html = req.body.html;
    
    // Also include plaintext version as fallback for email clients that don't support HTML
    if (req.body.text) {
      mailOptions.text = req.body.text;
    } else {
      // Create a basic text version by stripping HTML tags
      mailOptions.text = req.body.html.replace(/<[^>]*>/g, '');
    }
  } else if (req.body.text) {
    // If only text was provided, use that
    mailOptions.text = req.body.text;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully!', info });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email', details: error });
  }
});

app.listen(port, () => {
  console.log(`Local API running at http://localhost:${port}`);
});