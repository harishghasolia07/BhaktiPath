// Cached reads for pages. Every read is tagged "clips"; any change to a clip
// (admin page, CLI via /api/revalidate) expires the tag, so pages refresh
// without a redeploy and the database is only read when something changed.
import { cacheLife, cacheTag } from "next/cache";
import { getStore } from "./store";

export const CLIPS_TAG = "clips";

export async function getClips() {
  "use cache";
  cacheTag(CLIPS_TAG);
  // Refreshes by itself within minutes, so a change made from another place that shares this database (the admin
  // page on another deployment, a script, a local copy) shows up without a redeploy. An edit made here is instant.
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  return getStore().list();
}

export async function getClip(slug: string) {
  "use cache";
  cacheTag(CLIPS_TAG);
  // Refreshes by itself within minutes, so a change made from another place that shares this database (the admin
  // page on another deployment, a script, a local copy) shows up without a redeploy. An edit made here is instant.
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  return getStore().getBySlug(slug);
}
