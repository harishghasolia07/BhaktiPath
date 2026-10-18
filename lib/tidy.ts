// Mechanical clean-up of a bhajan name before it is saved. Spelling that needs listening (a word the
// captions spell differently) is fixed by hand, from the captions, before the clip is saved.

const DEV = /[ऀ-ॿ]/;

function words(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (DEV.test(w) || !/[a-z]/i.test(w) ? w : w.replace(/[A-Za-z]+/g, (p) => p[0].toUpperCase() + p.slice(1).toLowerCase())))
    .join(" ");
}

/** "mix - man bhul mat jaaio, radhe radhe + others" -> "Mix: Man Bhul Mat Jaaio, Radhe Radhe + More". */
export function tidyTitle(name: string, mix: boolean): string {
  let t = name
    .replace(/\s+/g, " ")
    .replace(/\s*([,+])\s*/g, (_, c) => (c === "+" ? " + " : ", "))
    .replace(/\b(?:and )?(?:others?|other bhajans?|etc)\b\.*/gi, "more")
    .replace(/\.{2,}/g, "")
    .replace(/[\s,+\-–—:.]+$/, "")
    .replace(/^[\s,+\-–—:.]+/, "")
    .trim();
  t = words(t);
  if (!mix) return t;
  return t ? `Mix: ${t}` : "Mix";
}
