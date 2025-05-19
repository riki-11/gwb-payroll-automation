export interface EmailLog {
    id?: string;           // Cosmos DB will generate this if not provided
    senderName: string;    // Name of user who sent the email
    senderEmail: string;   // Email address of user who sent email
    recipientName: string; // Name of worker recipient
    recipientEmail: string;// Email address of worker recipient
    recipientWorkerNum: string; // Worker no. of recipient
    recipientPayslipFile: string; // Filename of payslip that is sent
    batchId: string;      // Batch ID of payslip
    batchItemNum: string; // Batch item number of payslip
    batchSize: number;    // Total number of payslips in the batch
    date: string;          // Date that email was sent (YYYY-MM-DD format)
    timeSent: string;      // Time that email was sent (including the local timezone)
    subject: string;       // Email subject line
    successful: boolean;   // Whether the email was sent successfully
  }