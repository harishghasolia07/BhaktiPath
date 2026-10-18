"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountError, getAccounts } from "@/lib/accounts";
import { mailAvailable, sendMail } from "@/lib/mail";
import { hashPassword, verifyPassword } from "@/lib/password";
import { makeToken, readToken, fingerprint } from "@/lib/tokens";
import { currentUser, startUserSession } from "@/lib/user-session";

const MAIL_GAP_MS = 60_000; // at most one email a minute to the same person

/** This site's own address, for links in emails. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

async function sendVerification(id: string, email: string, name: string): Promise<boolean> {
  const link = `${await origin()}/api/auth/verify?token=${await makeToken("verify", id)}`;
  const sent = await sendMail(email, "Confirm your email · Shravanam Kirtanam", `Hello ${name},\n\nPlease confirm your email address by opening this link (it works for 3 days):\n\n${link}\n\nIf you didn't create an account, you can ignore this message.`);
  if (sent) await getAccounts().touchMail(id, "verify");
  return sent;
}

export type AuthState = { error?: string; fields?: Record<string, string>; email?: string; name?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Create an account with an email and password. */
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fields: Record<string, string> = {};
  if (!name) fields.name = "Tell us what to call you.";
  if (!EMAIL.test(email) || email.length > 254) fields.email = "That doesn't look like an email address.";
  if (password.length < 8) fields.password = "Use at least 8 characters.";
  else if (password.length > 200) fields.password = "That's too long (200 characters at most).";
  if (Object.keys(fields).length) return { error: "Please fix the marked fields.", fields, email, name };
  try {
    const user = await getAccounts().createPasswordUser({ name, email, passwordHash: await hashPassword(password) });
    await startUserSession(user.id);
    await sendVerification(user.id, email, name); // best effort: signing up never fails because of mail
  } catch (err) {
    if (err instanceof AccountError)
      return {
        error: err.code === "google-only" ? "This email is already used with Google. Use “Continue with Google” instead." : "An account with this email already exists. Try signing in.",
        email,
        name,
      };
    throw err;
  }
  redirect("/my");
}

/** Sign in with an email and password. Five wrong tries pause that account for ten minutes. */
export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "").slice(0, 200);
  const wrong: AuthState = { error: "That email and password don't match.", email };
  const acct = EMAIL.test(email) ? await getAccounts().getCredentials(email) : null;
  if (acct && acct.lockedUntil > Date.now()) {
    return { error: `Too many wrong tries. Please wait ${Math.max(1, Math.ceil((acct.lockedUntil - Date.now()) / 60000))} minutes, or use Google.`, email };
  }
  const good = await verifyPassword(password, acct?.passwordHash);
  if (!acct || !good) {
    if (acct?.passwordHash) await getAccounts().recordFailure(acct.id);
    if (acct && !acct.passwordHash) return { error: "This email signs in with Google. Use “Continue with Google”.", email };
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return wrong;
  }
  await getAccounts().clearFailures(acct.id);
  await startUserSession(acct.id);
  redirect("/my");
}

/** "Send it again": the signed-in person's verification email. */
export async function resendVerification(): Promise<{ message: string }> {
  const user = await currentUser();
  if (!user || user.verified) return { message: "Nothing to confirm." };
  if (!mailAvailable()) return { message: "Email isn't set up on this site yet." };
  const c = await getAccounts().getCredentialsById(user.id);
  if (!c) return { message: "Nothing to confirm." };
  if (Date.now() - c.lastMail.verify < MAIL_GAP_MS) return { message: "We just sent one. Please wait a minute and check your inbox and spam." };
  return { message: (await sendVerification(user.id, user.email, user.name)) ? `Sent to ${user.email}. Check your inbox and spam.` : "Couldn't send the email. Please try again later." };
}

export type ForgotState = { done?: boolean; error?: string; email?: string } | undefined;

/** Email a link that sets a new password. The answer is the same whether or not the email has an account. */
export async function forgotPassword(_: ForgotState, form: FormData): Promise<ForgotState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "That doesn't look like an email address.", email };
  if (!mailAvailable()) return { error: "Password reset by email isn't set up on this site yet. Please sign in with Google instead.", email };
  const c = await getAccounts().getCredentials(email);
  if (c?.passwordHash && Date.now() - c.lastMail.reset >= MAIL_GAP_MS) {
    const link = `${await origin()}/my/reset?token=${await makeToken("reset", c.id, c.passwordHash)}`;
    await sendMail(c.email, "Reset your password · Shravanam Kirtanam", `Hello ${c.name},\n\nOpen this link to choose a new password (it works for one hour, once):\n\n${link}\n\nIf you didn't ask for this, ignore this message: your password stays as it is.`);
    await getAccounts().touchMail(c.id, "reset");
  }
  return { done: true, email };
}

export type ResetState = { error?: string; fields?: Record<string, string> } | undefined;

/** Sets the new password from an emailed link, then signs the person in. */
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Please fix the marked fields.", fields: { password: "Use at least 8 characters." } };
  if (password.length > 200) return { error: "Please fix the marked fields.", fields: { password: "That's too long (200 characters at most)." } };
  const t = await readToken(String(form.get("token") ?? ""), "reset");
  const c = t ? await getAccounts().getCredentialsById(t.u) : null;
  if (!t || !c || t.f !== fingerprint(c.passwordHash)) return { error: "This link has expired or was already used. Ask for a new one." };
  await getAccounts().setPassword(c.id, await hashPassword(password));
  await startUserSession(c.id);
  redirect("/my");
}
