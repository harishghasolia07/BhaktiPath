// Cached reads for pages. Every read is tagged "clips"; any change to a clip
// (admin page, CLI via /api/revalidate) expires the tag, so pages refresh
// without a redeploy and the database is only read when something changed.
import { cacheLife, cacheTag } from "next/cache";
import { getStore } from "./store";

export const CLIPS_TAG = "clips";

export async function getClips() {
  "use cache";
  cacheTag(CLIPS_TAG);
  cacheLife("max");
  return getStore().list();
}

export async function getClip(slug: string) {
  "use cache";
  cacheTag(CLIPS_TAG);
  cacheLife("max");
  return getStore().getBySlug(slug);
}
