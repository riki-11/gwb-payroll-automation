import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url'; // Needed to define __dirname

// Define __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: process.env.OUTLOOK_EMAIL, 
    pass: process.env.OUTLOOK_PASSWORD, 
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

interface EmailRequest {
  to: string;
  subject: string;
  text: string;
}

app.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (req.file) {
    console.log(`File uploaded: ${req.file.originalname}`);

    // Prepare the email options with the uploaded file as an attachment
    const mailOptions = {
      from: process.env.OUTLOOK_EMAIL,
      to: req.body.to, // Get the recipient email from the request body
      subject: req.body.subject, // Email subject
      text: req.body.text, // Email body text
      attachments: [
        {
          filename: req.file.originalname, // Name of the file as it will appear in the email
          content: req.file.buffer, // The file content (stored in memory)
          encoding: 'base64', // Use base64 encoding for the in-memory file
        },
      ],
    };

    // Send the email with the attachment
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error });
      }
      res.status(200).json({ message: 'File uploaded and email sent successfully!', info });
    });
  } else {
    res.status(400).send('No file uploaded');
  }
});

app.post('/send-email', (req: Request<{}, {}, EmailRequest>, res: Response) => {
  const { to, subject, text } = req.body;

  // TODO: Change this to make it less hassle?
  const pdfPath = path.resolve(__dirname, '..', 'assets', 'lyo-lejano.pdf'); // Going up one level, then into 'assets'

  const mailOptions = {
    from: process.env.OUTLOOK_EMAIL,
    to,
    subject,
    text,
    attachments: [
      {   
        filename: 'lyo-lejano.pdf', // Name of the file as it will appear in the email
        path: pdfPath, // Full path to the file
        contentType: 'application/pdf', // Specify the MIME type for PDF
      },
    ],
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }
    res.status(200).json({ message: 'Email sent successfully', info });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
