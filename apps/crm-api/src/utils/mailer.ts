import nodemailer from "nodemailer";
import logger from "../lib/logger.js";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@example.com";
const APP_URL = process.env.APP_URL || "http://localhost:5173"; // frontend dev default
const SMTP_SECURE_RAW = (process.env.SMTP_SECURE || "")
  .toString()
  .toLowerCase();

let transporter: nodemailer.Transporter | null = null;
let isJsonTransport = false;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (SMTP_HOST) {
    // Interpret SMTP_SECURE:
    // - "true"/"ssl": SMTPS (secure=true)
    // - "starttls": use STARTTLS upgrade (secure=false, requireTLS=true)
    // - otherwise default based on port (465 => secure)
    const isSSL = SMTP_SECURE_RAW === "true" || SMTP_SECURE_RAW === "ssl";
    const isStartTLS = SMTP_SECURE_RAW === "starttls";
    const secure = isSSL || (!isStartTLS && SMTP_PORT === 465);

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure,
      requireTLS: isStartTLS ? true : undefined,
      ...(SMTP_USER && SMTP_PASS
        ? { auth: { user: SMTP_USER, pass: SMTP_PASS } }
        : {}),
    });
    isJsonTransport = false;
  } else {
    // Fallback: a json transport that logs the message (useful in dev without SMTP)
    transporter = nodemailer.createTransport({ jsonTransport: true });
    isJsonTransport = true;
  }
  return transporter;
}

export async function sendInviteEmail(to: string, name: string, token: string) {
  const acceptUrl = `${APP_URL}/invite/accept?token=${encodeURIComponent(token)}`;

  const html = `
    <div>
      <p>Hi ${name || "there"},</p>
      <p>You have been invited to Gaston CRM. Click the button below to set your password and activate your account.</p>
      <p>
        <a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Accept Invite</a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${acceptUrl}">${acceptUrl}</a></p>
      <p>If you did not expect this email, you can ignore it.</p>
    </div>
  `;

  const text = `Hi ${name || "there"},\n\nYou have been invited to Gaston CRM. Open this link to set your password and activate your account:\n${acceptUrl}\n\nIf you did not expect this email, you can ignore it.`;

  const mail = {
    from: SMTP_FROM,
    to,
    subject: "Your Gaston CRM invite",
    text,
    html,
  };

  const t = getTransporter();
  const info = await t.sendMail(mail);
  logger.info({ to, messageId: info.messageId }, "invite email sent");

  // Log Ethereal preview URL for development
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info({ previewUrl }, "email preview available");
  }

  // If json transport, log the output to help devs see content
  if (isJsonTransport) {
    logger.debug({ emailContent: info.message }, "email json transport output");
  }

  return info;
}
