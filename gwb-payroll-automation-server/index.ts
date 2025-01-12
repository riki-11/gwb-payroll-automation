import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = 3000;

// Get the frontend origin from environment variables
const isProduction = process.env.NODE_ENV === 'production';

// Enable CORS for all routes based on environment
app.use(cors((req, callback) => {
  const origin = isProduction
    ? process.env.FRONTEND_ORIGIN_PROD
    : process.env.FRONTEND_ORIGIN_LOCAL;

  console.log(`CORS origin set to: ${origin}`);
  callback(null, {
    origin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'multipart/form-data'],
  });
}));

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

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

app.post('/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

app.listen(port, () => {
  console.log(`Local API running at http://localhost:${port}`);
});
