import { NextResponse } from "next/server";
import { currentUser } from "@/lib/user-session";

/** Who is signed in, with their likes and history; the page's client code reads this once. */
export async function GET() {
  const u = await currentUser();
  const res = NextResponse.json(u ? { user: { name: u.name, email: u.email, picture: u.picture }, favs: u.favs, recent: u.recent, played: u.played } : { user: null });
  res.headers.set("cache-control", "private, no-store");
  return res;
}
