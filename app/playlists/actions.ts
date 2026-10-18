"use server";

import { getAccounts } from "@/lib/accounts";
import { addItem, cleanName, isItemKey, moveItem, removeItem } from "@/lib/playlists";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/user-session";

export type Result = { ok: boolean; error?: string; id?: string; added?: boolean };

/** Server Actions are public endpoints: each one checks who is signed in and that the playlist is theirs. */
async function mine(playlistId: string) {
  const user = await currentUser();
  if (!user) return null;
  const list = await getAccounts().getPlaylist(playlistId);
  return list && list.ownerId === user.id ? { user, list } : null;
}

const NOT_YOURS: Result = { ok: false, error: "That playlist isn't yours." };

export async function createPlaylist(name: string): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to make playlists." };
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Give the playlist a name." };
  try {
    return { ok: true, id: (await getAccounts().createPlaylist(user.id, clean)).id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Adds a public bhajan (its slug) or one of your own videos ("my-<id>") to your playlist. */
export async function addToPlaylist(playlistId: string, key: string): Promise<Result> {
  const m = await mine(playlistId);
  if (!m) return NOT_YOURS;
  if (!isItemKey(key)) return { ok: false, error: "That bhajan can't be added." };
  const exists = key.startsWith("my-") ? await getAccounts().getVideo(m.user.id, key.slice(3)) : await getStore().getBySlug(key);
  if (!exists) return { ok: false, error: "That bhajan isn't available any more." };
  const r = addItem(m.list.items, key);
  if (r.added) await getAccounts().savePlaylist(m.user.id, m.list.id, { items: r.items });
  return { ok: true, added: r.added, error: r.added || r.items.includes(key) ? undefined : "This playlist is full." };
}

export async function removeFromPlaylist(playlistId: string, key: string): Promise<Result> {
  const m = await mine(playlistId);
  if (!m) return NOT_YOURS;
  await getAccounts().savePlaylist(m.user.id, m.list.id, { items: removeItem(m.list.items, key) });
  return { ok: true };
}

export async function moveInPlaylist(playlistId: string, key: string, dir: "up" | "down"): Promise<Result> {
  const m = await mine(playlistId);
  if (!m) return NOT_YOURS;
  await getAccounts().savePlaylist(m.user.id, m.list.id, { items: moveItem(m.list.items, key, dir === "up" ? "up" : "down") });
  return { ok: true };
}

export async function renamePlaylist(playlistId: string, name: string): Promise<Result> {
  const m = await mine(playlistId);
  if (!m) return NOT_YOURS;
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Give the playlist a name." };
  await getAccounts().savePlaylist(m.user.id, m.list.id, { name: clean });
  return { ok: true };
}

export async function setPlaylistPublic(playlistId: string, on: boolean): Promise<Result> {
  const m = await mine(playlistId);
  if (!m) return NOT_YOURS;
  await getAccounts().savePlaylist(m.user.id, m.list.id, { public: Boolean(on) });
  return { ok: true };
}

export async function deletePlaylist(playlistId: string): Promise<Result> {
  const m = await mine(playlistId);
  if (!m) return NOT_YOURS;
  await getAccounts().deletePlaylist(m.user.id, m.list.id);
  return { ok: true };
}
