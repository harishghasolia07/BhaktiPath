// Search that works across scripts: "radhe" finds "राधे" and "राधे" finds "Radhe".
// Both sides are reduced to a consonant skeleton ("rdh"), which is close enough for a small collection.

const DEV: Record<string, string> = {
  क: "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
  च: "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  ट: "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  त: "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  प: "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  य: "y", "र": "r", "ल": "l", "ळ": "l", "व": "v",
  श: "sh", "ष": "sh", "स": "s", "ह": "h",
  ऋ: "r", "ृ": "r", "ं": "n", "ँ": "n", "\u093C": "",
};
const DEV_RE = /[ऀ-ॿ]/;

/** "Radhe Radhe" and "राधे राधे" both become "rdhrdh". */
export function skeleton(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const m = DEV[ch];
    if (m !== undefined) out += m;
    else if (/[a-z]/i.test(ch)) out += ch.toLowerCase();
  }
  return out
    .replace(/[aeiouy]/g, "")
    .replace(/w/g, "v")
    .replace(/(.)\1+/g, "$1");
}

function fold(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Plain substring match, or (for queries of 3+ characters) a match across scripts. */
export function matchesQuery(text: string, query: string): boolean {
  const needle = fold(query.trim());
  if (!needle) return true;
  if (fold(text).includes(needle)) return true;
  if (needle.length < 3 && !DEV_RE.test(needle)) return false;
  const sk = skeleton(query);
  return sk.length >= 2 && skeleton(text).includes(sk);
}
