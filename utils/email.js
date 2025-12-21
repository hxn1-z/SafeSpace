// utils/email.js — nodemailer + email helpers

const nodemailer = require("nodemailer");

// Prefer a real public URL for links in emails (Cloudflare URL or your domain).
// Fallback to API_BASE for older setups.
function getPublicBaseUrl() {
  const raw =
    process.env.PUBLIC_BASE_URL ||
    process.env.API_BASE ||
    "http://localhost:5000";

  return String(raw).replace(/\/$/, "");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email verification
async function sendVerificationEmail(user, token) {
  const base = getPublicBaseUrl();
  const verifyUrl = `${base}/api/verify-email?token=${encodeURIComponent(token)}`;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: "SafeSpace - Verify your email",
    text: `Hi ${user.username},

Welcome to SafeSpace!

Please verify your email using the link below:
${verifyUrl}

If you didn't create this account, ignore this email.

Thanks.`,
  };

  await transporter.sendMail(mailOptions);
}

// Password reset email
async function sendResetEmail(email, token) {
  const base = getPublicBaseUrl();
  const resetUrl = `${base}/reset?token=${encodeURIComponent(token)}`;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "SafeSpace Password Reset",
    text: `A password reset was requested for your SafeSpace account.

Click the link below to reset your password:
${resetUrl}

If you did NOT request this, ignore this email.

This link expires in 15 minutes.`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendResetEmail,
};
