// Clip shape and validation, shared by the app, the admin page and the CLI.
import { z } from "zod";
import { isVideoId, parseTime } from "./youtube";

export const CATEGORIES = ["bhajan", "kirtan", "katha"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, { en: string; hi: string }> = {
  bhajan: { en: "Bhajan", hi: "भजन" },
  kirtan: { en: "Kirtan", hi: "कीर्तन" },
  katha: { en: "Katha", hi: "कथा" },
};

export type Clip = {
  id: string;
  slug: string;
  title: string;
  videoId: string;
  start: number;
  end: number;
  category: Category;
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
    category: z.enum(CATEGORIES, { message: "Pick Bhajan, Kirtan or Katha." }),
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
  .refine((c) => c.end > c.start, { message: "The end time must be after the start time.", path: ["end"] });

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
