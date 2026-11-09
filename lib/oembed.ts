// The video's own YouTube title, via YouTube's public oEmbed endpoint (no API key).
export async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return "";
    const data = (await res.json()) as { title?: string };
    return (data.title ?? "").slice(0, 300);
  } catch {
    return "";
  }
}

/** A normal browser identity: YouTube serves the full watch page (with the length) to this. */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/** The video's length in seconds; 0 when YouTube won't say (live streams, private or removed videos). */
export async function fetchVideoLength(videoId: string): Promise<number> {
  return (await watchPageLength(videoId)) || (await playerApiLength(videoId));
}

/** The length on the public watch page, behind the consent screen. */
async function watchPageLength(videoId: string): Promise<number> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      signal: AbortSignal.timeout(7000),
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent": BROWSER_UA,
        cookie: "CONSENT=YES+cb; SOCS=CAI",
      },
    });
    if (!res.ok) return 0;
    const m = (await res.text()).match(/"lengthSeconds":"(\d{1,6})"/);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

/** YouTube's player endpoint (no key), for when the watch page doesn't carry the length. */
async function playerApiLength(videoId: string): Promise<number> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      signal: AbortSignal.timeout(7000),
      headers: { "content-type": "application/json", "accept-language": "en", "user-agent": BROWSER_UA },
      body: JSON.stringify({
        videoId,
        context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "en" } },
      }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { videoDetails?: { lengthSeconds?: string } };
    const n = Number(data.videoDetails?.lengthSeconds);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}
