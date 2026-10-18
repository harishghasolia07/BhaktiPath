// Sending email through a Gmail account (an "app password"), so any visitor can get a message.
// Without SMTP_USER and SMTP_PASS nothing is sent; in development the message is printed instead.
import nodemailer from "nodemailer";

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Mail can go out (or, in development, be written to .data/outbox.log). */
export function mailAvailable(): boolean {
  return mailConfigured() || process.env.NODE_ENV !== "production";
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") return false;
    const { appendFile, mkdir } = await import("node:fs/promises");
    await mkdir(".data", { recursive: true });
    await appendFile(".data/outbox.log", `\n=== to: ${to} | ${subject}\n${text}\n`);
    return true;
  }
  try {
    const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS!.replace(/\s+/g, "") } });
    await transport.sendMail({ from: `Shravanam Kirtanam <${process.env.SMTP_USER}>`, to, subject, text });
    return true;
  } catch (err) {
    console.error("mail failed:", (err as Error).message);
    return false;
  }
}
