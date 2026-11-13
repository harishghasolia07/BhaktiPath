import { NextResponse } from "next/server";
import { getClip } from "@/lib/clips";
import { recordPlay } from "@/lib/play-log";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/user-session";

/**
 * The real start/end of one public clip, only for a signed-in listener who is about to play it.
 * Playback asks one clip at a time; the curated times are never part of a page or a public list.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/play/[slug]">) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "signed-out" }, { status: 401 });

  const { slug } = await ctx.params;
  if (!/^[\w-]{1,120}$/.test(slug)) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const clip = (await getClip(slug)) ?? (await getStore().getBySlug(slug));
  if (!clip) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const gate = await recordPlay(user.id, slug);
  if (!gate.ok) {
    const res = NextResponse.json({ error: "rate-limited" }, { status: 429 });
    res.headers.set("retry-after", String(gate.retryAfter));
    res.headers.set("cache-control", "private, no-store");
    return res;
  }

  const res = NextResponse.json({ start: clip.start, end: clip.end });
  res.headers.set("cache-control", "private, no-store");
  return res;
}
