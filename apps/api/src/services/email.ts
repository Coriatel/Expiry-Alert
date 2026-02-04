import nodemailer from 'nodemailer';
import { config } from '../config.js';

let cachedTransporter: nodemailer.Transporter | null = null;

function isEmailConfigured() {
  return Boolean(config.smtp.host && config.smtp.port && config.smtp.user && config.smtp.pass && config.smtp.from);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
  return cachedTransporter;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Email delivery is not configured');
  }

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    html,
  });
}
