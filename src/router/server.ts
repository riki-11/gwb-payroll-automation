import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(cors({
  origin: 'https://gwb-payroll-automation.vercel.app/'
}));
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


app.post('/send-payslip-to-email', upload.single('file'), (req: Request, res: Response) => {
  if (req.file) {
    console.log(`File to be sent: ${req.file.originalname}`);

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


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
