// The shrine: a brass mandir arch (cusped, nine lobes) on two temple pillars,
// the video inside its opening, and a velvet pat (curtain) that is drawn
// aside to the pillars. Geometry is authored in a 1000 x 632 box; the element
// keeps that aspect ratio, so every part scales together. The video rectangle
// is never covered: the opened pat hangs only over the pillars.

const W = 1000;
const H = 632;
const OPEN = { x: 44, y: 18, w: 912, h: 587 }; // box around the cusped opening
const VIDEO = { x: 44, y: 92, w: 912, h: 513 }; // 16:9

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export const SHRINE_ASPECT = `${W} / ${H}`;
/** Headroom above the arch for the kalash crown, as a share of the width. */
const CROWN = 0.04;
/** Width of the shrine so that it (crown included) plus `reserve` fits the room under the header. */
export const shrineMaxWidth = (reserve: string) =>
  `min(100%, calc((var(--fit-h) - ${reserve}) * ${(1 / (H / W + CROWN)).toFixed(4)}))`;

/* ---------- geometry ---------- */

type Pt = [number, number];
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};
/** A point along a symmetric two-cubic arch from (x0, ySpring) over (500, yApex), u in 0..1. */
function archPoint(x0: number, ySpring: number, yShoulder: number, yApex: number, u: number): Pt {
  const l: [Pt, Pt, Pt, Pt] = [[x0, ySpring], [x0, yShoulder], [x0 + (500 - x0) * 0.48, yApex], [500, yApex]];
  if (u <= 0.5) return bez(...l, u * 2);
  const [x, y] = bez(...l, (1 - u) * 2);
  return [1000 - x, y];
}

const LOBES = 9;
const cusps: Pt[] = Array.from({ length: LOBES + 1 }, (_, i) => archPoint(44, 88, 60, 46, i / LOBES));
const lobeArcs = cusps
  .slice(1)
  .map(([x, y], i) => {
    const [px, py] = cusps[i];
    const r = Math.hypot(x - px, y - py) * 0.72;
    return `A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  })
  .join(" ");
/** The cusped opening: straight jambs, then nine scalloped lobes across the top. */
const OPENING = `M44 605 V88 ${lobeArcs} V605 Z`;
const OUTER = "M0 632 V92 C0 40 250 0 500 0 C750 0 1000 40 1000 92 V632 Z";

/** Lotus petals set along the arch band, each turned to the curve. */
const PETALS = Array.from({ length: 41 }, (_, i) => {
  const u = (i + 0.5) / 41;
  const [x, y] = archPoint(20, 90, 44, 11, u);
  const [x2, y2] = archPoint(20, 90, 44, 11, Math.min(1, u + 0.002));
  const deg = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
  return { x, y, deg };
});

export function Shrine({
  open,
  children,
  behind,
}: {
  open: boolean;
  /** Things laid over the video rectangle (play button, error message). */
  children?: React.ReactNode;
  /** The player or thumbnail, inside the video rectangle. */
  behind?: React.ReactNode;
}) {
  const box = { left: pct(OPEN.x, W), top: pct(OPEN.y, H), width: pct(OPEN.w, W), height: pct(OPEN.h, H), clipPath: "url(#shrine-opening)" };
  return (
    <div className="w-full" style={{ paddingTop: `${CROWN * 100}%` }}>
    <div className="shrine relative w-full" data-pat={open ? "open" : "closed"} style={{ aspectRatio: SHRINE_ASPECT }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id="shrine-opening" clipPathUnits="objectBoundingBox">
            <path d={OPENING} transform={`scale(${1 / OPEN.w} ${1 / OPEN.h}) translate(${-OPEN.x} ${-OPEN.y})`} />
          </clipPath>
        </defs>
      </svg>

      {/* sanctum backdrop and the video */}
      <div className="absolute bg-[radial-gradient(80%_70%_at_50%_30%,#3a0812,#120205)]" style={box} />
      <div
        className="absolute overflow-hidden bg-black"
        style={{ left: pct(VIDEO.x, W), top: pct(VIDEO.y, H), width: pct(VIDEO.w, W), height: pct(VIDEO.h, H) }}
      >
        {behind}
      </div>

      {/* the pat, two halves, clipped to the arch */}
      <div className="pointer-events-none absolute overflow-hidden" style={box} aria-hidden="true">
        <PatHalf side="l" />
        <PatHalf side="r" />
      </div>

      <Frame />
      <Garland />

      {/* when drawn aside, the pat hangs gathered over each pillar */}
      <Drape side="l" />
      <Drape side="r" />

      <div
        className="pointer-events-none absolute z-10 *:pointer-events-auto"
        style={{ left: pct(VIDEO.x, W), top: pct(VIDEO.y, H), width: pct(VIDEO.w, W), height: pct(VIDEO.h, H) }}
      >
        {children}
      </div>
    </div>
    </div>
  );
}

/** One closed half of the curtain: velvet in uneven folds, a zari border, tassels. */
function PatHalf({ side }: { side: "l" | "r" }) {
  const id = `fold-${side}`;
  const HH = OPEN.h;
  return (
    <div className={`pat-half pat-half-${side} absolute inset-y-0 w-[50.6%] ${side === "l" ? "left-0" : "right-0"}`}>
      <svg viewBox={`0 0 456 ${HH}`} preserveAspectRatio="none" className="block h-full w-full">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="1">
            <stop offset="0" stopColor="#33040e" />
            <stop offset="0.22" stopColor="#62101f" />
            <stop offset="0.44" stopColor="#9a2236" />
            <stop offset="0.52" stopColor="#b8404f" />
            <stop offset="0.6" stopColor="#87182b" />
            <stop offset="0.84" stopColor="#4a0815" />
            <stop offset="1" stopColor="#33040e" />
          </linearGradient>
          {/* broad folds, with a narrower second set over them so no two folds match */}
          <pattern id={`${id}-p`} width="46" height={HH} patternUnits="userSpaceOnUse" x={side === "l" ? 0 : 11}>
            <rect width="46" height={HH} fill={`url(#${id}-g)`} />
          </pattern>
          <pattern id={`${id}-q`} width="29" height={HH} patternUnits="userSpaceOnUse" x={side === "l" ? 5 : 0}>
            <rect width="29" height={HH} fill={`url(#${id}-g)`} />
          </pattern>
          <linearGradient id={`${id}-light`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.6" />
            <stop offset="0.16" stopColor="#000" stopOpacity="0.12" />
            <stop offset="0.7" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={`${id}-seam`} x1={side === "l" ? "1" : "0"} x2={side === "l" ? "0.86" : "0.14"}>
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <pattern id={`${id}-zari`} width="32" height="26" patternUnits="userSpaceOnUse" y="503">
            {/* a small four-petal buti, embroidered in gold thread */}
            <path d="M16 6 C19 9 19 11 16 13 C13 11 13 9 16 6Z M16 20 C19 17 19 15 16 13 C13 15 13 17 16 20Z M9 13 C12 10 14 10 16 13 C14 16 12 16 9 13Z M23 13 C20 10 18 10 16 13 C18 16 20 16 23 13Z" fill="#f3cf6c" />
            <circle cx="16" cy="13" r="1.6" fill="#7a5414" />
          </pattern>
        </defs>
        <rect width="456" height={HH} fill={`url(#${id}-p)`} />
        <rect width="456" height={HH} fill={`url(#${id}-q)`} opacity="0.38" />
        <rect width="456" height={HH} fill={`url(#${id}-light)`} />
        <rect width="456" height={HH} fill={`url(#${id}-seam)`} />
        {/* zari border */}
        <rect y="499" width="456" height="3" fill="#e3b04b" />
        <rect y="503" width="456" height="26" fill={`url(#${id}-zari)`} />
        <rect y="530" width="456" height="3" fill="#e3b04b" />
        {/* scalloped hem with tassels hanging from each point */}
        {Array.from({ length: 12 }, (_, i) => {
          const x = i * 38;
          return (
            <g key={i}>
              <path d={`M${x} 533 Q${x + 19} 556 ${x + 38} 533`} fill="#4a0815" stroke="#e3b04b" strokeWidth="2" />
              <path d={`M${x + 38} 533 V552`} stroke="#d9a441" strokeWidth="1.6" />
              <path d={`M${x + 38} 550 C${x + 32} 556 ${x + 33} 568 ${x + 38} 578 C${x + 43} 568 ${x + 44} 556 ${x + 38} 550Z`} fill="#e3b04b" />
              <path d={`M${x + 35} 566 H${x + 41}`} stroke="#7a5414" strokeWidth="1.4" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The gathered pat over a pillar: bunched at the tie-back, falling open below it. */
function Drape({ side }: { side: "l" | "r" }) {
  const x = side === "l" ? 0 : VIDEO.x + VIDEO.w;
  const flip = side === "r";
  return (
    <div
      className={`drape drape-${side} pointer-events-none absolute z-[5]`}
      style={{ left: pct(x, W), top: pct(VIDEO.y - 10, H), width: pct(OPEN.x, W), height: pct(VIDEO.h + 10, H) }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 523" preserveAspectRatio="none" className="block h-full w-full" style={flip ? { transform: "scaleX(-1)" } : undefined}>
        <defs>
          <linearGradient id={`drape-${side}-g`} x1="0" x2="1">
            <stop offset="0" stopColor="#3d0611" />
            <stop offset="0.45" stopColor="#a3243a" />
            <stop offset="0.55" stopColor="#bd4656" />
            <stop offset="1" stopColor="#4d0916" />
          </linearGradient>
          <pattern id={`drape-${side}-p`} width="7" height="523" patternUnits="userSpaceOnUse">
            <rect width="7" height="523" fill={`url(#drape-${side}-g)`} />
          </pattern>
          <pattern id={`drape-${side}-q`} width="11" height="523" patternUnits="userSpaceOnUse" x="3">
            <rect width="11" height="523" fill={`url(#drape-${side}-g)`} />
          </pattern>
        </defs>
        {/* full under the arch, pinched at the tie-back, swagging out below */}
        <path d="M0 0 H44 C41 110 32 230 24 300 C30 360 44 430 44 500 Q22 523 0 512 Z" fill={`url(#drape-${side}-p)`} />
        <path d="M0 0 H44 C41 110 32 230 24 300 C30 360 44 430 44 500 Q22 523 0 512 Z" fill={`url(#drape-${side}-q)`} opacity="0.4" />
        <path d="M0 0 H44 C41 110 32 230 24 300 C30 360 44 430 44 500 Q22 523 0 512 Z" fill="none" stroke="#000" strokeOpacity="0.35" />
        <path d="M2 506 Q22 516 42 498" fill="none" stroke="#e3b04b" strokeWidth="2.5" />
        {/* gold tie-back with a tassel */}
        <path d="M0 290 Q16 284 30 292 Q16 300 0 306 Z" fill="#e3b04b" />
        <path d="M0 294 Q14 290 26 295" stroke="#fff0b0" strokeWidth="1.2" fill="none" opacity="0.7" />
        <path d="M26 300 V330" stroke="#d9a441" strokeWidth="2.2" />
        <path d="M26 326 C20 334 21 350 26 362 C31 350 32 334 26 326Z" fill="#e3b04b" />
      </svg>
    </div>
  );
}

/** Brass mandir frame: cusped arch, lotus-petal moulding, kalash crown, temple pillars. */
function Frame() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      overflow="visible"
      className="pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_22px_30px_rgb(0_0_0/0.55)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f6dc8a" />
          <stop offset="0.14" stopColor="#d4a440" />
          <stop offset="0.5" stopColor="#a8761e" />
          <stop offset="0.86" stopColor="#c9962c" />
          <stop offset="1" stopColor="#6e4a10" />
        </linearGradient>
        <linearGradient id="brass-side" x1="0" x2="1">
          <stop offset="0" stopColor="#7a5414" />
          <stop offset="0.38" stopColor="#f0cd73" />
          <stop offset="0.62" stopColor="#c9962c" />
          <stop offset="1" stopColor="#7a5414" />
        </linearGradient>
      </defs>

      {/* the arch, with the cusped opening cut out of it */}
      <path d={`${OUTER} ${OPENING}`} fill="url(#brass)" fillRule="evenodd" />
      <path d={OPENING} fill="none" stroke="#5c3d0b" strokeOpacity="0.75" strokeWidth="2.5" />
      <path d="M0 92 C0 40 250 0 500 0 C750 0 1000 40 1000 92" fill="none" stroke="#fff0b8" strokeOpacity="0.75" strokeWidth="2.5" />
      {/* cusp tips: small brass buds where the lobes meet */}
      {cusps.slice(1, -1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y + 3} r="3.2" fill="#f6dc8a" stroke="#7a5414" strokeWidth="1" />
      ))}
      {/* lotus-petal moulding along the arch band */}
      {PETALS.map(({ x, y, deg }, i) => (
        <path
          key={i}
          d="M0 5 C-6 1 -5 -6 0 -10 C5 -6 6 1 0 5Z"
          transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`}
          fill="#f3d27e"
          stroke="#8a5a12"
          strokeWidth="1.2"
        />
      ))}

      {/* kalash on the crown: pot, mango leaves, coconut */}
      <g transform="translate(500 2) scale(0.7)">
        <path d="M-15 -4 H15 L11 -10 C20 -14 20 -26 9 -30 L10 -34 H-10 L-9 -30 C-20 -26 -20 -14 -11 -10 Z" fill="#f0cd73" stroke="#7a5414" strokeWidth="1.5" />
        <path d="M-12 -20 H12" stroke="#c25a05" strokeWidth="2" />
        <path d="M-10 -34 C-22 -38 -26 -44 -28 -48 C-20 -46 -14 -42 -6 -36Z M10 -34 C22 -38 26 -44 28 -48 C20 -46 14 -42 6 -36Z" fill="#3f7a35" />
        <ellipse cx="0" cy="-42" rx="8" ry="10" fill="#a0612a" />
        <path d="M-3 -50 C0 -56 1 -56 3 -50" stroke="#3f7a35" strokeWidth="2" fill="none" />
      </g>

      {/* temple pillars: pot (kumbha) base, banded shaft with a lotus medallion, bracket capital */}
      {[0, 956].map((x) => (
        <g key={x} transform={`translate(${x} 0)`}>
          <rect x="9" y="126" width="26" height="410" fill="url(#brass-side)" />
          {[200, 270, 400, 470].map((y) => (
            <rect key={y} x="6" y={y} width="32" height="7" rx="2" fill="#f0cd73" stroke="#7a5414" strokeWidth="1" />
          ))}
          <circle cx="22" cy="335" r="11" fill="#f0cd73" stroke="#7a5414" strokeWidth="1.2" />
          <path d="M22 326 C26 330 26 334 22 337 C18 334 18 330 22 326Z M13 335 C17 331 20 332 22 335 C20 338 17 339 13 335Z M31 335 C27 331 24 332 22 335 C24 338 27 339 31 335Z" fill="#c25a05" opacity="0.8" />
          {/* bracket capital */}
          <path d="M0 92 H44 V102 H40 V110 H36 C36 120 30 124 22 126 C14 124 8 120 8 110 H4 V102 H0 Z" fill="url(#brass-side)" stroke="#7a5414" strokeWidth="1" />
          {/* kumbha base */}
          <path d="M3 605 H41 L39 592 C47 580 46 552 32 544 L34 536 H10 L12 544 C-2 552 -3 580 5 592 Z" fill="url(#brass-side)" stroke="#7a5414" strokeWidth="1" />
          <path d="M6 566 H38" stroke="#7a5414" strokeOpacity="0.6" strokeWidth="1.5" />
        </g>
      ))}

      {/* plinth */}
      <rect x="0" y="605" width="1000" height="27" fill="url(#brass)" />
      <path d="M0 607 H1000" stroke="#5c3d0b" strokeOpacity="0.6" strokeWidth="2" />
      <path d="M0 617 H1000" stroke="#fff0b8" strokeOpacity="0.45" strokeWidth="1.5" />
    </svg>
  );
}

/** Marigold garland in three swags across the arch: in front of the pat, always above the video. */
function Garland() {
  const swags: [Pt, Pt][] = [
    [[56, 72], [354, 72]],
    [[354, 72], [646, 72]],
    [[646, 72], [944, 72]],
  ];
  const d = swags.map(([a, b]) => `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} 108 ${b[0]} ${b[1]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 z-[6] h-full w-full" aria-hidden="true">
      <path d={d} fill="none" stroke="#3f7a35" strokeWidth="3" />
      <path d={d} fill="none" stroke="#e57f09" strokeWidth="12" strokeLinecap="round" strokeDasharray="0 11" />
      <path d={d} fill="none" stroke="#ffc533" strokeWidth="6" strokeLinecap="round" strokeDasharray="0 11" strokeDashoffset="5.5" />
      {[56, 354, 646, 944].map((x) => (
        <g key={x} transform={`translate(${x} 72)`}>
          <path d="M-2 0 C-14 -2 -22 4 -26 10 C-16 10 -8 6 -2 0Z M2 0 C14 -2 22 4 26 10 C16 10 8 6 2 0Z" fill="#2f6427" />
          <circle r="9" fill="#d9700a" />
          <circle r="5" fill="#ffb21f" />
          <path d="M0 9 V19" stroke="#ef8a0c" strokeWidth="6" strokeLinecap="round" strokeDasharray="0 7" />
        </g>
      ))}
    </svg>
  );
}
