// The rules for playlists, free of storage and browser code so they can be tested.
// A playlist holds "keys": a public clip's slug, or "my-<id>" for one of the owner's own videos.

export const PLAYLIST_LIMITS = { playlists: 100, items: 500, name: 60 } as const;

export type Playlist = {
  id: string;
  ownerId: string;
  name: string;
  items: string[];
  /** anyone with the link can open it (the owner's private videos are skipped for others) */
  public: boolean;
  createdAt: string;
  updatedAt: string;
};

export const isItemKey = (k: unknown): k is string => typeof k === "string" && /^[\w-]{1,120}$/.test(k);

/** A tidy name, or "" if there is nothing usable. */
export function cleanName(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, PLAYLIST_LIMITS.name) : "";
}

/** Adds the key at the end unless it is already there or the list is full. */
export function addItem(items: string[], key: string): { items: string[]; added: boolean } {
  if (items.includes(key) || items.length >= PLAYLIST_LIMITS.items) return { items, added: false };
  return { items: [...items, key], added: true };
}

export const removeItem = (items: string[], key: string): string[] => items.filter((k) => k !== key);

/** Moves the key one place earlier ("up") or later ("down"); at an end it stays put. */
export function moveItem(items: string[], key: string, dir: "up" | "down"): string[] {
  const i = items.indexOf(key);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= items.length) return items;
  const out = [...items];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** The playlist's items that the viewer may see: everything for the owner, only public clips for anyone else. */
export function visibleKeys(items: string[], isOwner: boolean): string[] {
  return isOwner ? items : items.filter((k) => !k.startsWith("my-"));
}
