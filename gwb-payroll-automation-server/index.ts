import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cosmosDbService from './services/cosmosDbService';
import authRouter from './routes/auth';
import emailRouter from './routes/email';
import logRouter from './routes/logs';

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

app.use(cookieParser());
console.log('Cookie parser middleware initialized');

// Parse JSON request bodies
app.use(express.json());

// Mount additional routes
app.use(authRouter);
app.use(emailRouter);
app.use(logRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred' : err.message
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    cookies: req.cookies ? 'working' : 'not working'
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