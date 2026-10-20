// Clip shape and validation, shared by the app, the admin page and the CLI.
import { z } from "zod";
import { isVideoId, parseTime } from "./youtube";

/** The sections a clip can be in. A clip is in one, two or all three. (Display order: Bhajan, Kirtan, Katha.) */
export const CATEGORIES = ["bhajan", "kirtan", "katha"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, { en: string; hi: string }> = {
  bhajan: { en: "Bhajan", hi: "भजन" },
  kirtan: { en: "Kirtan", hi: "कीर्तन" },
  katha: { en: "Katha", hi: "कथा" },
};

/**
 * The sections of a saved clip. Clips saved before a clip could be in several sections carry one `category`;
 * for those, "bhajan" and "kirtan" both meant what the site then called Kirtan, so they read as Kirtan.
 */
export function catsOf(doc: { categories?: unknown; category?: unknown }): Category[] {
  if (Array.isArray(doc.categories)) {
    const ok = CATEGORIES.filter((c) => (doc.categories as unknown[]).includes(c));
    if (ok.length) return ok;
  }
  return [doc.category === "katha" ? "katha" : "kirtan"];
}

/** "Kirtan · Bhajan": the sections as people read them. */
export const sectionsText = (c: { categories: Category[] }): string => c.categories.map((x) => CATEGORY_LABELS[x].en).join(" · ");
/** "कीर्तन, भजन" */
export const sectionsHi = (c: { categories: Category[] }): string => c.categories.map((x) => CATEGORY_LABELS[x].hi).join(", ");

export type Clip = {
  /** Set on a signed-in person's own video (private to them); absent on the public collection. */
  owner?: string;
  /** On a person's own video: whether they asked for it to be added to the public collection. */
  submission?: "pending" | "approved" | "rejected" | null;
  id: string;
  slug: string;
  title: string;
  videoId: string;
  start: number;
  end: number;
  /** One to three of Bhajan, Kirtan, Katha. */
  categories: Category[];
  tags: string[];
  /** The source video's own YouTube title, kept for context ("Day 5 … Dhuri"). */
  videoTitle: string;
  /** Optional lyrics shown beside the player. */
  lyrics: string;
  /** Overrides of what the video's YouTube title says; empty/null = use the title. */
  place: string;
  day: number | null;
  /** Sample clips exist only while the site is being built. */
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};

const time = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = parseTime(v);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Use a time like 21:31, 1:05:20 or 1291." });
      return z.NEVER;
    }
    return n;
  });

/** What a person (or the CLI) submits. */
export const clipInputSchema = z
  .object({
    title: z.string().trim().min(1, "Give the clip a name.").max(140, "Keep the name under 140 characters."),
    videoId: z.string().trim().refine(isVideoId, "That isn't a YouTube video ID."),
    start: time,
    end: time,
    /** the sections (one to three of bhajan, kirtan, katha) */
    categories: z.array(z.string()).optional(),
    /** one section: the older way of saying it, still accepted by scripts */
    category: z.string().optional(),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(12)
      .default([])
      .transform((t) => [...new Set(t)]),
    videoTitle: z.string().trim().max(300).default(""),
    lyrics: z.string().max(8000, "Lyrics are limited to 8000 characters.").default(""),
    place: z.string().trim().max(80).default(""),
    day: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .transform((v, ctx) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 99) {
          ctx.addIssue({ code: "custom", message: "Day must be a number from 1 to 99." });
          return z.NEVER;
        }
        return n;
      }),
    sample: z.boolean().default(false),
  })
  .refine((c) => c.end > c.start, { message: "The end time must be after the start time.", path: ["end"] })
  .superRefine((c, ctx) => {
    if (sectionsOf(c).length === 0) ctx.addIssue({ code: "custom", message: "Pick at least one section: Bhajan, Kirtan or Katha.", path: ["categories"] });
  })
  .transform(({ categories: _c, category: _o, ...rest }) => ({ ...rest, categories: sectionsOf({ categories: _c, category: _o }) }));

/** What was asked for, as the sections that exist (in the usual order, no repeats). */
function sectionsOf(c: { categories?: string[]; category?: string }): Category[] {
  const asked = [...(c.categories ?? []), ...(c.category ? [c.category] : [])];
  return CATEGORIES.filter((x) => asked.includes(x));
}

export type ClipInput = z.input<typeof clipInputSchema>;
export type ClipData = z.output<typeof clipInputSchema>;

/** "Radhe Radhe Japo" -> "radhe-radhe-japo". Devanagari-only titles fall back to the video and start time. */
export function makeSlug(title: string, videoId: string, start: number): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : `${videoId.toLowerCase().replace(/[^a-z0-9]/g, "")}-${start}`;
}

/** Comma- or newline-separated tag text -> tag list. */
export function parseTags(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}
