import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

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

interface EmailRequest {
  to: string;
  subject: string;
  text: string;
}

app.post('/send-email', (req: Request<{}, {}, EmailRequest>, res: Response) => {
  const { to, subject, text } = req.body;

  const mailOptions = {
    from: process.env.OUTLOOK_EMAIL,
    to,
    subject,
    text,
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
