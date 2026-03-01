import * as postmark from "postmark";

/**
 * Note: We use process.env directly for the Postmark Token as it's a single key,
 * but we keep your getRequiredEnv logic for the "From" address and safety checks.
 */
const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
const client = postmarkToken ? new postmark.ServerClient(postmarkToken) : null;

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function getRequiredEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

export async function sendEmail(params: SendEmailParams): Promise<{
  sent: boolean;
  simulated: boolean;
}> {
  // Postmark primarily needs the Server Token and a Verified "From" address
  const from = getRequiredEnv('SMTP_FROM'); // This should now be your verified Postmark email/domain

  // If Postmark isn't configured, simulate the send (keeping your original logic)
  if (!client || !from) {
    console.warn('[email] Postmark (POSTMARK_SERVER_TOKEN or SMTP_FROM) not configured; simulating sendEmail', {
      to: params.to,
      subject: params.subject,
    });
    return { sent: false, simulated: true };
  }

  try {
    // Replace Nodemailer's transporter.sendMail with Postmark's client.sendEmail
    await client.sendEmail({
      "From": from,
      "To": params.to,
      "Subject": params.subject,
      "HtmlBody": params.html,
      "TextBody": params.text || "Please view this email in an HTML compatible client.",
      "MessageStream": "outbound"
    });

    return { sent: true, simulated: false };
  } catch (error) {
    console.error('[email] Postmark send error:', error);
    // Rethrow or return sent: false depending on how you want your UI to react
    throw error; 
  }
}
