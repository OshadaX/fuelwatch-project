import nodemailer from "nodemailer";

export function createMailer() {
  const provider = process.env.EMAIL_PROVIDER || "gmail";
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASS;

  if (!user || !pass) throw new Error("EMAIL_USER / EMAIL_APP_PASS missing in .env");

  // Gmail transport (simple)
  if (provider === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
  }

  // Generic SMTP example (if you switch providers later)
  // return nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: Number(process.env.SMTP_PORT || 587),
  //   secure: false,
  //   auth: { user, pass }
  // });

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}