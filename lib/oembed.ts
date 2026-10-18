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

/** The video's length in seconds, read from its public watch page; 0 when YouTube won't say. */
export async function fetchVideoLength(videoId: string): Promise<number> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(7000),
      headers: { "accept-language": "en", "user-agent": "Mozilla/5.0 (compatible; ShravanamKirtanam/1.0)" },
    });
    if (!res.ok) return 0;
    const m = (await res.text()).match(/"lengthSeconds":"(\d{1,6})"/);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}
