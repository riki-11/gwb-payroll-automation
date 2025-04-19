// gwb-payroll-automation-server/index.ts
import express, { Request, Response } from 'express';
import authRouter from './routes/auth';
import nodemailer from 'nodemailer';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cosmosDbService from './services/cosmosDbService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Get the frontend origin from environment variables
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN_PROD || "https://gwb-payroll-automation-client.vercel.app",
  process.env.FRONTEND_ORIGIN_LOCAL || "http://localhost:5173"
];

// Enable CORS for all routes based on environment
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true // This is important for cookies
}));

// Parse cookies
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());

// Mount auth routes
app.use(authRouter);

// Initialize multer for file uploads
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

// API route for sending payslips
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

// Schedule cleanup of expired sessions (run once per day)
const scheduleSessionCleanup = () => {
  setInterval(async () => {
    try {
      await cosmosDbService.cleanupExpiredSessions();
    } catch (error) {
      console.error('Error during scheduled session cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
};

// Start the server
const startServer = async () => {
  try {
    // Initialize Cosmos DB service
    await cosmosDbService.init();
    
    // Start session cleanup scheduler
    scheduleSessionCleanup();
    
    // Start the Express server
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();