"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CLIPS_TAG } from "@/lib/clips";
import { parseTags } from "@/lib/clip-schema";
import { parseBulk } from "@/lib/bulk";
import { fetchVideoTitle } from "@/lib/oembed";
import { getAccounts } from "@/lib/accounts";
import { checkPassword, endSession, isAdmin, startSession } from "@/lib/session";
import { ClipValidationError, getStore } from "@/lib/store";
import { parseVideoId } from "@/lib/youtube";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

async function requireAdmin() {
  // Server Actions are public endpoints: every one checks the session itself.
  if (!(await isAdmin())) redirect("/admin");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD isn't set on the server yet." };
  if (!(await checkPassword(password))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "That password isn't right." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin");
}

function fromForm(form: FormData) {
  return {
    title: String(form.get("title") ?? ""),
    videoId: parseVideoId(String(form.get("link") ?? "")) ?? "",
    start: String(form.get("start") ?? ""),
    end: String(form.get("end") ?? ""),
    categories: form.getAll("categories").map(String),
    tags: parseTags(String(form.get("tags") ?? "")),
    videoTitle: String(form.get("videoTitle") ?? ""),
    lyrics: String(form.get("lyrics") ?? "").replace(/\r\n/g, "\n").trim(),
    place: String(form.get("place") ?? ""),
    day: String(form.get("day") ?? ""),
    sample: false,
  };
}

export async function saveClip(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const input = fromForm(form);
  if (!input.videoId) return { error: "That link doesn't contain a YouTube video.", fields: { link: "Paste a YouTube link." } };
  if (!input.videoTitle) input.videoTitle = await fetchVideoTitle(input.videoId);
  let slug: string;
  try {
    const store = getStore();
    slug = (id ? await store.update(id, input) : await store.create(input)).slug;
  } catch (err) {
    if (err instanceof ClipValidationError) return { error: "Please fix the marked fields.", fields: err.issues };
    return { error: (err as Error).message };
  }
  updateTag(CLIPS_TAG);
  redirect(`/admin?saved=${encodeURIComponent(slug)}`);
}

export async function deleteClip(form: FormData) {
  await requireAdmin();
  await getStore().remove(String(form.get("id") ?? ""));
  updateTag(CLIPS_TAG);
  redirect("/admin?deleted=1");
}

/** The editor asks for the video's own title when a link is pasted. */
export async function lookupVideo(link: string): Promise<{ videoId: string | null; title: string }> {
  await requireAdmin();
  const videoId = parseVideoId(link);
  return { videoId, title: videoId ? await fetchVideoTitle(videoId) : "" };
}

export type BulkState = { error?: string } | undefined;

/** Saves every valid line of the pasted list; invalid lines are reported back, not saved. */
export async function saveBulk(_: BulkState, form: FormData): Promise<BulkState> {
  await requireAdmin();
  const rows = parseBulk(String(form.get("lines") ?? ""));
  const good = rows.filter((r) => r.clip);
  const bad = rows.filter((r) => r.error);
  if (!good.length) return { error: bad.length ? "Nothing to save yet: fix the marked lines." : "Paste at least one line." };
  if (bad.length) return { error: `${bad.length} line(s) have problems. Fix them or remove them, then save again.` };
  const titles = new Map<string, string>();
  for (const id of new Set(good.map((r) => r.clip!.videoId))) titles.set(id, await fetchVideoTitle(id));
  const store = getStore();
  try {
    for (const r of good) await store.create({ ...r.clip!, videoTitle: titles.get(r.clip!.videoId) ?? "" });
  } catch (err) {
    return { error: (err as Error).message };
  }
  updateTag(CLIPS_TAG);
  redirect(`/admin?bulk=${good.length}`);
}

/** Approve a person's public request: it becomes an ordinary clip in the collection (editable like any other). */
export async function approveSubmission(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const accounts = getAccounts();
  const v = await accounts.getVideoAny(id);
  if (!v || v.submission !== "pending") redirect("/admin/submissions");
  let slug: string;
  try {
    const clip = await getStore().create({
      title: v.title,
      videoId: v.videoId,
      start: v.start,
      end: v.end,
      categories: v.categories,
      tags: v.tags,
      videoTitle: v.videoTitle || (await fetchVideoTitle(v.videoId)),
      lyrics: v.lyrics,
      place: "",
      day: null,
      sample: false,
    });
    slug = clip.slug;
  } catch (err) {
    redirect(`/admin/submissions?error=${encodeURIComponent(err instanceof ClipValidationError ? Object.values(err.issues).join(" ") : (err as Error).message)}`);
  }
  await accounts.reviewVideo(id, "approved", slug);
  updateTag(CLIPS_TAG);
  redirect(`/admin/submissions?approved=${encodeURIComponent(slug)}`);
}

/** Decline a public request. The person keeps their private copy and can change it and ask again. */
export async function rejectSubmission(form: FormData) {
  await requireAdmin();
  await getAccounts().reviewVideo(String(form.get("id") ?? ""), "rejected");
  redirect("/admin/submissions?rejected=1");
}
