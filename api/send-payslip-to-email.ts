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

// Define a custom type for the request that includes the file property
interface ExtendedVercelRequest extends VercelRequest {
  file?: Express.Multer.File;
}

const handler = async (req: ExtendedVercelRequest, res: VercelResponse) => {
  await new Promise((resolve, reject) =>
    upload.single('file')(req as any, {} as any, (err: any) => {
      if (err) return reject(err);
      resolve(true);
    })
  );

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
};

export default handler;