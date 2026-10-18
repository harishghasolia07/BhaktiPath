"use server";

import { redirect } from "next/navigation";
import { AccountError, getAccounts } from "@/lib/accounts";
import { hashPassword, verifyPassword } from "@/lib/password";
import { startUserSession } from "@/lib/user-session";

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
