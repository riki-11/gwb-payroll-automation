import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: process.env.OUTLOOK_EMAIL,
    pass: process.env.OUTLOOK_PASSWORD,
  },
});

export default async (req: VercelRequest, res: VercelResponse) => {
  upload.single('file')(req as any, {} as any, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: 'File upload failed' });
    }

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
          encoding: 'base64',
        },
      ],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'File uploaded and email sent successfully!', info });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send email', details: error });
    }
  });
};
