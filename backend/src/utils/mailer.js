const nodemailer = require("nodemailer");

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error(
      "Missing SMTP config. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env"
    );
  }

  return { host, port, user, pass };
}

function createTransport() {
  const { host, port, user, pass } = getSmtpConfig();

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = true, 587 = false
    auth: { user, pass },
  });
}

/**
 * Safe email sender
 * @param {Object} args
 * @param {string|string[]} args.to
 * @param {string} args.subject
 * @param {string} args.html
 * @param {string} [args.text]
 */
async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const mail = {
    from,
    to: Array.isArray(to) ? to.join(",") : to,
    subject: subject || "FuelWatch Alert",
    text: text || (html ? html.replace(/<[^>]*>/g, "") : ""),
    html: html || "",
  };

  const info = await transporter.sendMail(mail);
  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

module.exports = { sendEmail };
