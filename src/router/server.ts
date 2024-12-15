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


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {  
    cb(null, file.originalname);
  }
})
const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: process.env.OUTLOOK_EMAIL, 
    pass: process.env.OUTLOOK_PASSWORD, 
  },
});

interface EmailRequest {
  to: string;
  subject: string;
  text: string;
}

app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    console.log(`File uploaded: ${req.file}`)
    res.send('Uploaded successfully!')
  } else {
    res.status(400).send('No file uploaded');
  }
})


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
