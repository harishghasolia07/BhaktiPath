// Password hashing with Node's built-in scrypt: a random salt per password, never stored in clear.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password.normalize("NFKC"), salt, KEYLEN, PARAMS, (e, key) => (e ? reject(e) : resolve(key))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${(await derive(password, salt)).toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  // With no stored hash we still do the same work, so the answer takes as long either way.
  const [scheme, saltText, hashText] = (stored ?? DUMMY).split("$");
  const real = Boolean(stored) && scheme === "scrypt" && Boolean(saltText) && Boolean(hashText);
  const [, dSalt, dHash] = DUMMY.split("$");
  const salt = Buffer.from(real ? saltText : dSalt, "base64url");
  const want = Buffer.from(real ? hashText : dHash, "base64url");
  const got = await derive(password, salt);
  return real && got.length === want.length && timingSafeEqual(got, want);
}

const DUMMY = `scrypt$${Buffer.alloc(16, 7).toString("base64url")}$${Buffer.alloc(KEYLEN, 9).toString("base64url")}`;
