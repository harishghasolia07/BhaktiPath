// Devanagari → Latin, so a caption line can be read by someone who doesn't read the script:
// "2:11:42 मुरलिया" also prints "(muraliya)", and a spelling in the notes can be compared with it.
// It is not a scholarly transliteration; the inherent "a" is kept where Hindi pronounces it.
const INDEP: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ऋ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au",
};
const CONS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", ळ: "l", व: "v",
  श: "sh", ष: "sh", स: "s", ह: "h",
};
const MATRA: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
};
const NASAL: Record<string, string> = { "ं": "n", "ँ": "n" };
const VIRAMA = "\u094D";

/** "मुरलिया" → "muraliyaa"; Latin text is left as it is. */
export function toLatin(text: string): string {
  let out = "";
  const chars = [...text.normalize("NFC")];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (CONS[ch]) {
      out += CONS[ch];
      const next = chars[i + 1];
      if (next === VIRAMA) {
        i++;
      } else if (next && MATRA[next]) {
        out += MATRA[next];
        i++;
      } else if (next && (/[ऀ-ॿ]/.test(next) || /[a-z]/i.test(next))) {
        // the inherent "a" is not pronounced at the end of a word (गीत = "geet", not "geeta")
        out += "a";
      }
    } else if (INDEP[ch]) {
      out += INDEP[ch];
    } else if (NASAL[ch]) {
      out += NASAL[ch];
    } else {
      out += ch;
    }
  }
  return out;
}
