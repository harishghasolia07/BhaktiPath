import { NextResponse } from "next/server";
import { getLyrics } from "@/lib/lyrics-store";

/** Synced lyrics for one public clip: [] when there are none. Cached briefly at the edge. */
export async function GET(_req: Request, ctx: RouteContext<"/api/lyrics/[slug]">) {
  const { slug } = await ctx.params;
  const l = /^[\w-]{1,120}$/.test(slug) ? await getLyrics(slug) : null;
  const res = NextResponse.json({ lines: l?.lines ?? [], start: l?.start ?? null, end: l?.end ?? null });
  res.headers.set("cache-control", "public, s-maxage=300, stale-while-revalidate=86400");
  return res;
}
