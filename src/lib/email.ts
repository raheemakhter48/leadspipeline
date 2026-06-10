import nodemailer from "nodemailer";

export function smtpConfigured() {
  return Boolean(process.env.OTP_SMTP_HOST && process.env.OTP_SMTP_USER && process.env.OTP_SMTP_PASS);
}

export function messageSmtpConfigured() {
  const config = getMessageSmtpConfig();
  return Boolean(config.host && config.user && config.pass);
}

export async function sendOtpEmail({ code, to }: { code: string; to: string }) {
  if (!smtpConfigured()) return { sent: false };

  const transporter = nodemailer.createTransport({
    auth: {
      pass: process.env.OTP_SMTP_PASS,
      user: process.env.OTP_SMTP_USER,
    },
    host: process.env.OTP_SMTP_HOST,
    port: Number(process.env.OTP_SMTP_PORT ?? 587),
    secure: process.env.OTP_SMTP_SECURE === "true",
  });

  await transporter.sendMail({
    from: process.env.OTP_SMTP_FROM ?? process.env.OTP_SMTP_USER,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px">
        <h2 style="margin:0 0 12px;color:#101418">LeadsPipeline login code</h2>
        <p style="color:#444">Use this OTP to sign in. It expires in 10 minutes.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f4f1ea;padding:16px;text-align:center;border-radius:8px">${code}</div>
        <p style="font-size:12px;color:#777;margin-top:18px">If you did not request this, ignore this email.</p>
      </div>
    `,
    subject: "Your LeadsPipeline login OTP",
    text: `Your LeadsPipeline login OTP is ${code}. It expires in 10 minutes.`,
    to,
  });

  return { sent: true };
}

export async function sendOutboundEmail({ body, subject, to }: { body: string; subject: string; to: string }) {
  const config = getMessageSmtpConfig();

  if (!config.host || !config.user || !config.pass) {
    return { error: "Message SMTP is not configured.", sent: false };
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.pass,
      user: config.user,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    host: config.host,
    port: config.port,
    secure: config.secure,
  });

  await transporter.sendMail({
    from: config.from,
    subject,
    text: body,
    to,
  });

  return { sent: true };
}

function getMessageSmtpConfig() {
  const host = process.env.MESSAGE_SMTP_HOST ?? process.env.SMTP_HOST ?? "";
  const user = process.env.MESSAGE_SMTP_USER ?? process.env.SMTP_USERNAME ?? process.env.SMTP_USER ?? "";
  const pass = process.env.MESSAGE_SMTP_PASS ?? process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS ?? "";
  const from = process.env.MESSAGE_SMTP_FROM ?? process.env.SMTP_FROM ?? user;
  const port = Number(process.env.MESSAGE_SMTP_PORT ?? process.env.SMTP_PORT ?? 587);
  const encryption = (process.env.MESSAGE_SMTP_ENCRYPTION ?? process.env.SMTP_ENCRYPTION ?? "").toLowerCase();
  const secure =
    process.env.MESSAGE_SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "true" ||
    encryption === "ssl" ||
    port === 465;

  return { from, host, pass, port, secure, user };
}
