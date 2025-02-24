// import express, { Request, Response } from 'express';
// import authRoutes from './routes/auth';
// import nodemailer from 'nodemailer';
// import multer from 'multer';
// import dotenv from 'dotenv';
// import cors from 'cors';

// dotenv.config();

// const app = express();
// const port = 3000;

// // Get the frontend origin from environment variables
// const isProduction = process.env.NODE_ENV === 'production';
// const allowedOrigins = [
//   process.env.FRONTEND_ORIGIN_PROD || "https://gwb-payroll-automation-client.vercel.app/",
//   process.env.FRONTEND_ORIGIN_LOCAL || "http://localhost:5173"
// ];

// // Enable CORS for all routes based on environment
// app.use(cors({
//   origin: allowedOrigins,
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"]
// }));

// app.use(express.json());
// app.use(authRoutes);

// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// const transporter = nodemailer.createTransport({
//   service: 'hotmail',
//   auth: {
//     user: process.env.OUTLOOK_EMAIL,
//     pass: process.env.OUTLOOK_PASSWORD,
//   },
// });

// app.get("/api/test", (req, res) => {
//   res.json({ message: "API is working!" });
// });

// app.post('/api/send-payslip-to-email', upload.single('file'), async (req: Request, res: Response) => {
  
//   if (!req.file) {
//     return res.status(400).send('No file uploaded');
//   }

//   const mailOptions = {
//     from: process.env.OUTLOOK_EMAIL,
//     to: req.body.to,
//     subject: req.body.subject,
//     text: req.body.text,
//     attachments: [
//       {
//         filename: req.file.originalname,
//         content: req.file.buffer,
//       },
//     ],
//   };

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     res.status(200).json({ message: 'Email sent successfully!', info });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to send email', details: error });
//   }
// });

// app.listen(port, () => {
//   console.log(`Local API running at http://localhost:${port}`);
// });

import express, { Request, Response } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
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

// ✅ Test API endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// ✅ Email Sending API
app.post('/api/send-payslip-to-email', upload.single('file'), async (req: Request, res: Response) => {
  
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const mailOptions = {
    from: process.env.OUTLOOK_EMAIL,
    to: req.body.to,
    subject: req.body.subject,
    text: req.body.text,
    attachments: [
      {
        filename: req.file.originalname,
        content: req.file.buffer,
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully!', info });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email', details: error });
  }
});

// ======================[ AUTHENTICATION ROUTES ]====================== //

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

const redirectUri = isProduction
  ? process.env.OAUTH_REDIRECT_URI_PROD!
  : process.env.OAUTH_REDIRECT_URI_LOCAL!;

const frontendOrigin = isProduction
  ? process.env.FRONTEND_ORIGIN_PROD!
  : process.env.FRONTEND_ORIGIN_LOCAL!;

// // ✅ Auth Test Endpoint
// app.get("/api/auth/test", (req, res) => {
//   res.json({ message: "Auth API is working!" });
// });

// // ✅ Microsoft Login
// app.get('/api/auth/login', async (req: Request, res: Response) => {
//   try {
//     const authUrl = await msalClient.getAuthCodeUrl({
//       scopes: process.env.OAUTH_SCOPES!.split(' '),
//       redirectUri,
//     });
//     res.redirect(authUrl);
//   } catch (error) {
//     console.error("Error generating auth URL:", error);
//     res.status(500).send("Authentication error");
//   }
// });

// // ✅ Auth Callback Handler
// app.get('/api/auth/callback', async (req: Request, res: Response) => {
//   const authCode = req.query.code as string;

//   if (!authCode) {
//     return res.status(400).send('Authorization code missing');
//   }

//   try {
//     const tokenResponse = await msalClient.acquireTokenByCode({
//       code: authCode,
//       scopes: process.env.OAUTH_SCOPES!.split(' '),
//       redirectUri,
//     });

//     // Extract access token
//     const accessToken = tokenResponse.accessToken;
//     res.redirect(`${frontendOrigin}/?token=${accessToken}`);
//   } catch (error) {
//     console.error('Error during token acquisition:', error);
//     res.status(500).send('Authentication failed');
//   }
// });

// // ✅ Logout Endpoint
// app.get('/api/auth/logout', async (req: Request, res: Response) => {
//   try {
//     const logoutUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/logout`;
//     res.redirect(`${logoutUrl}?post_logout_redirect_uri=${frontendOrigin}`);
//   } catch (error) {
//     console.error('Error during logout:', error);
//     res.status(500).send('Logout failed');
//   }
// });

// ======================[ SERVER START ]====================== //
app.listen(port, () => {
  console.log(`Local API running at http://localhost:${port}`);
});

