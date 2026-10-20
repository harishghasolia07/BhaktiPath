"use server";

import { redirect } from "next/navigation";
import { getAccounts } from "@/lib/accounts";
import { parseTags } from "@/lib/clip-schema";
import { fetchVideoLength, fetchVideoTitle } from "@/lib/oembed";
import { findRepeat } from "@/lib/duplicates";
import { ClipValidationError, getStore } from "@/lib/store";
import { currentUser } from "@/lib/user-session";
import { parseTime, parseVideoId } from "@/lib/youtube";

/** What was typed, sent back so the form keeps it after a warning or an error. */
export type FormValues = Partial<Record<"link" | "title" | "start" | "end" | "categories" | "tags" | "lyrics" | "visibility", string>>;
export type MyState =
  | {
      error?: string;
      fields?: Record<string, string>;
      added?: { id: string; title: string };
      /** the video looks the same as one already there; resubmit with "Add anyway" to add it regardless */
      duplicate?: { title: string; where: "yours" | "public"; href: string; why: string };
      values?: FormValues;
    }
  | undefined;

/** Server Actions are public endpoints: every one checks who is signed in and what they own. */
async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/my");
  return u;
}

/** Add a YouTube video (the whole thing unless a start and end are given). */
export async function addMyVideo(_: MyState, form: FormData): Promise<MyState> {
  const user = await requireUser();
  const values: FormValues = Object.fromEntries(
    (["link", "title", "start", "end", "categories", "tags", "lyrics", "visibility"] as const).map((k) => [k, k === "categories" ? form.getAll(k).map(String).join(",") : String(form.get(k) ?? "")]),
  );
  const videoId = parseVideoId(String(form.get("link") ?? ""));
  if (!videoId) return { error: "Please fix the marked fields.", fields: { link: "That link doesn't contain a YouTube video." }, values };
  const startText = String(form.get("start") ?? "").trim();
  const endText = String(form.get("end") ?? "").trim();
  const start = startText ? parseTime(startText) : 0;
  let end = endText ? parseTime(endText) : null;
  if (start === null) return { error: "Please fix the marked fields.", fields: { start: "Use a time like 21:31 or 1:05:20." }, values };
  if (endText && end === null) return { error: "Please fix the marked fields.", fields: { end: "Use a time like 21:31 or 1:05:20." }, values };
  const [fetchedTitle, length] = await Promise.all([fetchVideoTitle(videoId), end === null ? fetchVideoLength(videoId) : Promise.resolve(0)]);
  if (end === null) {
    if (!length) return { error: "Please fix the marked fields.", fields: { end: "Couldn't read this video's length. Enter where it ends, like 1:52:44." }, values };
    end = length;
  }
  // Is it already there? Same video overlapping or within a minute of one of yours, or of a public clip.
  if (form.get("confirm") !== "1") {
    const [mine, pub] = await Promise.all([getAccounts().listVideos(user.id), getStore().list()]);
    const own = findRepeat({ videoId, start, end }, mine);
    const open = own ?? findRepeat({ videoId, start, end }, pub);
    if (open) {
      const isOwn = Boolean(own);
      const hit = open.with as { id?: string; slug?: string; title: string };
      return {
        duplicate: {
          title: hit.title,
          where: isOwn ? "yours" : "public",
          href: isOwn ? `/my/${hit.id}` : `/clip/${hit.slug}`,
          why: open.reason === "overlap" ? "mostly the same part of the same video" : "the same video, within a minute",
        },
        values,
      };
    }
  }
  const videoTitle = fetchedTitle; // the video's own YouTube title, kept for context (the name below is the person's own)
  try {
    const clip = await getAccounts().createVideo(user.id, {
      title: String(form.get("title") ?? "").trim() || fetchedTitle || "Untitled video",
      videoId,
      start,
      end,
      categories: form.getAll("categories").map(String),
      tags: parseTags(String(form.get("tags") ?? "")),
      videoTitle,
      lyrics: String(form.get("lyrics") ?? "").replace(/\r\n/g, "\n").trim(),
      place: "",
      day: null,
    }, String(form.get("visibility") ?? "") === "public");
    return { added: { id: clip.id, title: clip.title } }; // stay on the page: the form clears and the list shows it
  } catch (err) {
    if (err instanceof ClipValidationError) return { error: "Please fix the marked fields.", fields: err.issues, values };
    throw err; // includes redirect()
  }
}

export async function saveMyVideo(_: MyState, form: FormData): Promise<MyState> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const old = await getAccounts().getVideo(user.id, id);
  if (!old) return { error: "That video isn't in your library." };
  try {
    await getAccounts().updateVideo(user.id, id, {
      title: String(form.get("title") ?? ""),
      videoId: old.videoId, // the video itself can't be swapped; add a new one instead
      start: String(form.get("start") ?? ""),
      end: String(form.get("end") ?? ""),
      categories: form.getAll("categories").map(String),
      tags: parseTags(String(form.get("tags") ?? "")),
      videoTitle: old.videoTitle,
      lyrics: String(form.get("lyrics") ?? "").replace(/\r\n/g, "\n").trim(),
      place: "",
      day: null,
    }, form.has("visibility") ? String(form.get("visibility")) === "public" : undefined);
  } catch (err) {
    if (err instanceof ClipValidationError) return { error: "Please fix the marked fields.", fields: err.issues };
    return { error: (err as Error).message };
  }
  redirect("/my"); // back to the list, like Add
}

export async function deleteMyVideo(form: FormData) {
  const user = await requireUser();
  await getAccounts().removeVideo(user.id, String(form.get("id") ?? ""));
  redirect("/my");
}
