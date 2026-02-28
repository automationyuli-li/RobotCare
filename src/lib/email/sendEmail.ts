import nodemailer from 'nodemailer';

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
  const host = getRequiredEnv('SMTP_HOST');
  const portRaw = getRequiredEnv('SMTP_PORT');
  const user = getRequiredEnv('SMTP_USER');
  const pass = getRequiredEnv('SMTP_PASS');
  const from = getRequiredEnv('SMTP_FROM');

  // 允许在未配置 SMTP 时“逻辑可用”（账号仍会 pending，无法登录），但实际邮件不会发出。
  if (!host || !portRaw || !user || !pass || !from) {
    console.warn('[email] SMTP not configured; simulating sendEmail', {
      to: params.to,
      subject: params.subject,
    });
    return { sent: false, simulated: true };
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new Error('Invalid SMTP_PORT');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  return { sent: true, simulated: false };
}

