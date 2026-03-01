import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<{
  sent: boolean;
  simulated: boolean;
}> {
  const from = process.env.SMTP_FROM;

  if (!process.env.RESEND_API_KEY|| !from) {
    console.warn('[email] Resend (RESEND_API_KEY or SMTP_FROM) not configured; simulating sendEmail', {
      to: params.to,
      subject: params.subject,
    });
    return { sent: false, simulated: true };
  }

  try {
    await resend.emails.send({
      from: from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || "Please view this email in an HTML compatible client.",
    });

    return { sent: true, simulated: false };
  } catch (error) {
    console.error('[email] Resend send error:', error);
    // Rethrow or return sent: false depending on how you want your UI to react
    throw error; 
  }
}
