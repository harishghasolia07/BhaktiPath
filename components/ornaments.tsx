// Authored SVG ornaments: the toran over the doorway, the diya beside each
// darshan time, and the peacock feather (mor pankh) mark.

/** A ruffled marigold head: a circle whose edge ripples like petals. */
function marigoldPath(cx: number, cy: number, r: number, petals: number, depth: number) {
  const pts: string[] = [];
  const steps = petals * 6;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const rr = r + depth * Math.sin(t * petals) + depth * 0.4 * Math.sin(t * petals * 2 + 1);
    pts.push(`${(cx + rr * Math.cos(t)).toFixed(2)},${(cy + rr * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const BLOOM_OUTER = marigoldPath(24, 16, 11, 14, 1.4);
const BLOOM_INNER = marigoldPath(24, 16, 7, 11, 1.1);
const BLOOM_OUTER_2 = marigoldPath(72, 16, 10, 13, 1.3);
const BLOOM_INNER_2 = marigoldPath(72, 16, 6.4, 10, 1);

/** Mango leaves and marigolds strung across the top of every page. */
export function Toran() {
  return (
    <svg className="block h-[38px] w-full sm:h-[46px]" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id="toran" width="96" height="46" patternUnits="userSpaceOnUse">
          {/* the cord */}
          <path d="M0 6 Q48 12 96 6" fill="none" stroke="#7a5414" strokeWidth="2" />
          {/* mango leaves hanging between the flowers */}
          <path d="M48 8 C40 18 42 34 48 44 C54 34 56 18 48 8Z" fill="#2f6427" />
          <path d="M48 10 L48 42" stroke="#5d9a45" strokeWidth="1" />
          <path d="M0 6 C-6 16 -5 30 0 40 C5 30 6 16 0 6Z" fill="#3f7a35" />
          <path d="M96 6 C90 16 91 30 96 40 C101 30 102 16 96 6Z" fill="#3f7a35" />
          {/* marigolds */}
          <path d={BLOOM_OUTER} fill="#ef8a0c" />
          <path d={BLOOM_INNER} fill="#ffb21f" />
          <circle cx="24" cy="16" r="2.6" fill="#c25a05" />
          <path d={BLOOM_OUTER_2} fill="#f7b51c" />
          <path d={BLOOM_INNER_2} fill="#ffd34d" />
          <circle cx="72" cy="16" r="2.3" fill="#d17708" />
        </pattern>
      </defs>
      <rect width="100%" height="46" fill="url(#toran)" style={{ filter: "drop-shadow(0 3px 3px rgb(0 0 0 / 0.45))" }} />
    </svg>
  );
}

/** A clay diya. Lit = this bhajan has been heard on this device. */
export function Diya({ lit, className = "" }: { lit: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      {lit ? (
        <>
          <ellipse cx="14" cy="9" rx="7" ry="8" fill="#f29d16" opacity="0.18" />
          <path className="flame" d="M14 3 C17 7 17.5 10 14 13 C10.5 10 11 7 14 3Z" fill="#ffc94a" />
          <path className="flame" d="M14 6.5 C15.4 8.4 15.5 10 14 11.6 C12.5 10 12.6 8.4 14 6.5Z" fill="#fff1b8" />
        </>
      ) : (
        <path d="M14 11 L14 13" stroke="#8a6b4a" strokeWidth="1.4" strokeLinecap="round" />
      )}
      <path d="M3 15 Q14 14 25 15 Q22 23 14 23 Q6 23 3 15Z" fill={lit ? "#c8752a" : "#6b4630"} />
      <path d="M3 15 Q14 17.5 25 15" fill="none" stroke={lit ? "#f3c27a" : "#8a6b4a"} strokeWidth="1" />
    </svg>
  );
}

/** Mor pankh: Krishna's peacock feather. */
export function Feather({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 64" className={className} aria-hidden="true">
      <path d="M20 62 C19 44 19.5 30 20 12" stroke="#c9962c" strokeWidth="1.6" fill="none" />
      <path
        d="M20 4 C34 10 36 30 26 44 C23 48 21 52 20 56 C19 52 17 48 14 44 C4 30 6 10 20 4Z"
        fill="#1f6b4f"
      />
      <ellipse cx="20" cy="22" rx="10.5" ry="13" fill="#2f9a6a" />
      <ellipse cx="20" cy="21" rx="7.6" ry="9.4" fill="#d9a441" />
      <ellipse cx="20" cy="20.5" rx="5.6" ry="7" fill="#1d6fa3" />
      <ellipse cx="20" cy="20" rx="3.3" ry="4.4" fill="#10204f" />
    </svg>
  );
}
