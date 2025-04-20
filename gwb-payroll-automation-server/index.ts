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
  process.env.FRONTEND_ORIGIN_PROD || "https://gwb-payroll-automation-client.vercel.app/",
  process.env.FRONTEND_ORIGIN_LOCAL || "http://localhost:5173"
];

console.log('Starting server with the following configuration:');
console.log(`- Environment: ${isProduction ? 'Production' : 'Development'}`);
console.log(`- Allowed Origins: ${allowedOrigins.join(', ')}`);
console.log(`- Cosmos DB Endpoint: ${process.env.COSMOS_DB_ENDPOINT ? 'Set' : 'Not Set'}`);

// Custom middleware to parse cookies if cookie-parser is not available
const customCookieParser = (req: Request, res: Response, next: express.NextFunction) => {
  if (req.cookies) {
    // cookie-parser already did its job
    return next();
  }
  
  const cookies: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[key] = value;
    });
  }
  
  req.cookies = cookies;
  next();
};

// Enable CORS for all routes based on environment
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin} not in allowed list`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
  credentials: true // This is important for cookies
}));

// Try to use cookie-parser, and if it fails, use our custom parser
try {
  app.use(cookieParser());
  console.log('Cookie parser middleware initialized');
} catch (error) {
  console.warn('Failed to initialize cookie-parser, using custom cookie parser:', error);
  app.use(customCookieParser);
}

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    cookies: req.cookies ? 'working' : 'not working'
  });
});

// Debug endpoint to check cookies
app.get('/debug/cookies', (req, res) => {
  res.status(200).json({
    cookies: req.cookies || {},
    hasCookieParser: typeof req.cookies !== 'undefined',
    headers: {
      cookie: req.headers.cookie,
    }
  });
});

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

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred' : err.message
  });
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
    console.log('Initializing Cosmos DB service...');
    // Explicitly initialize Cosmos DB service
    await cosmosDbService.init();
    console.log('Cosmos DB service initialized successfully');
    
    // Start session cleanup scheduler
    scheduleSessionCleanup();
    
    // Start the Express server
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Error details:', error);
    
    // Don't exit in production - let the platform handle restarts
    if (!isProduction) {
      process.exit(1);
    } else {
      console.log('Continuing despite initialization error...');
    }
  }
};

// For options requests (preflight)
app.options('*', cors());

// Start the server
startServer();