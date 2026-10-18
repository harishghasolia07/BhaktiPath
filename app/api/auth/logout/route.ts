import { NextResponse } from "next/server";
import { endUserSession } from "@/lib/user-session";

export async function POST(req: Request) {
  await endUserSession();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
