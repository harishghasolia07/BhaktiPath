import { NextResponse } from "next/server";
import { getLyrics } from "@/lib/lyrics-store";
import { currentUser } from "@/lib/user-session";

/**
 * A public clip's lyric text. Signed out, every line's time is 0: the words stay readable, but the
 * clip's bounds and the absolute second of each line are not handed to a scraper. A signed-in
 * listener gets the line times relative to the clip's start, which is all the highlighter needs.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/lyrics/[slug]">) {
  const { slug } = await ctx.params;
  const l = /^[\w-]{1,120}$/.test(slug) ? await getLyrics(slug) : null;
  const user = await currentUser();
  const lines = (l?.lines ?? []).map((line) => ({
    ...line,
    t: user && l ? Math.max(0, line.t - l.start) : 0,
  }));
  const res = NextResponse.json({ lines, source: l?.source ?? null });
  // Timed lyrics are for one signed-in browser; never let a shared cache keep them.
  res.headers.set("cache-control", "private, no-store");
  return res;
}
