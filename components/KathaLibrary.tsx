"use client";

import { useEffect, useState } from "react";
import { Clock, Heart, ListMusic, Play, Plus, Search, Settings2, Shuffle, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Clip } from "@/lib/clip-schema";
import { clipHref } from "@/lib/display";
import { createPlaylist } from "@/app/playlists/actions";
import { refreshAccount, useAccount } from "@/lib/account-client";
import { requestAutoplay, useFavs, usePlayed, useRecent } from "@/lib/local";
import { shuffled } from "@/lib/shuffle";
import { matchesQuery } from "@/lib/translit";
import { formatLength, thumbnailUrl } from "@/lib/youtube";
import { ClipCard } from "./ClipCard";
import { PlaylistPicker } from "./PlaylistPicker";
import { usePlayer } from "./PlayerProvider";

type Section = "all" | Category;

const chip =
  "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-gold/40 px-3.5 text-[0.92rem] font-semibold text-sandal transition-colors hover:border-gold hover:text-ivory aria-pressed:border-gold aria-pressed:bg-gold aria-pressed:text-shyam aria-selected:border-gold aria-selected:bg-gold aria-selected:text-shyam";

export function KathaLibrary({ clips }: { clips: Clip[] }) {
  const router = useRouter();
  const player = usePlayer();
  const [adding, setAdding] = useState(false);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState("");
  const [k, setK] = useState<string>("all");
  const [section, setSection] = useState<Section>("all");
  const [q, setQ] = useState("");
  const played = usePlayed();
  const [favs] = useFavs();
  const recent = useRecent();
  const acct = useAccount();

  // Filters live in the address bar, so a filtered view can be shared.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- read once from the URL after hydration */
    const key = p.get("k");
    if (key && (key === "fav" || key === "recent" || key === "mine" || key.startsWith("pl:"))) setK(key);
    const s = p.get("s");
    if (s && (CATEGORIES as readonly string[]).includes(s)) setSection(s as Category);
    if (p.get("q")) setQ(p.get("q")!);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (k !== "all") p.set("k", k);
    if (section !== "all") p.set("s", section);
    if (q.trim()) p.set("q", q.trim());
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/kathas?${qs}` : "/kathas");
  }, [k, section, q]);

  const listId = k.startsWith("pl:") ? k.slice(3) : null;
  const playlist = listId ? acct.playlists.find((l) => l.id === listId) ?? null : null;

  const shown = (() => {
    // your own (private) videos can show up in "Recently played" too
    const bySlug = new Map([...clips, ...acct.videos].map((c) => [c.slug, c]));
    const pool =
      listId
        ? (playlist?.items ?? []).map((s) => bySlug.get(s)) // your playlist, in its own order
        : k === "mine"
        ? acct.videos // the videos you added yourself (My videos)
        : k === "fav"
          ? [...favs].map((s) => bySlug.get(s))
          : k === "recent"
            ? recent.map((s) => bySlug.get(s))
            : clips; // everything, newest first
    return pool
      .filter((c): c is Clip => Boolean(c))
      .filter((c) => (section === "all" || c.categories.includes(section)) && matchesQuery(`${c.title} ${c.tags.join(" ")}`, q))
      .map((c) => ({ c }));
  })();

  /** "Play all": the first clip in view, and the rest of the view queued behind it. */
  const publicShown = shown.filter(({ c }) => !c.owner); // private videos play from My videos
  // a playlist can hold your own videos too, so it plays straight from the player (the others use a shareable link)
  const playable = listId ? shown : publicShown;
  const playAllHref = !listId && publicShown.length
    ? `/clip/${publicShown[0].c.slug}?play=1&slugs=${publicShown
        .slice(0, 80)
        .map(({ c }) => c.slug)
        .join(",")}`
    : null;

  /** "Shuffle": the same view in a random order. */
  function playList(list: Clip[]) {
    if (!list.length) return;
    player.play(list, list[0].slug, "library");
    router.push(clipHref(list[0]));
  }
  function shuffleAll() {
    if (!playable.length) return;
    if (listId) return playList(shuffled(playable.map(({ c }) => c)));
    const order = shuffled(publicShown.slice(0, 80).map(({ c }) => c));
    requestAutoplay(order[0].slug);
    router.push(`/clip/${order[0].slug}?play=1&slugs=${order.map((c) => c.slug).join(",")}`);
  }
  async function makePlaylist(e: React.FormEvent) {
    e.preventDefault();
    const res = await createPlaylist(newName);
    if (!res.ok || !res.id) return setNewError(res.error ?? "Couldn't make the playlist.");
    refreshAccount();
    setNaming(false);
    setNewName("");
    setNewError("");
    pickKatha(`pl:${res.id}`);
  }

  const pickKatha = (key: string) => {
    setK(key);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:gap-3 lg:h-[var(--fit-h)] lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      {/* ---------- the lists ---------- */}
      <nav aria-label="Lists" className="max-lg:[body:has([data-mini])_&]:hidden rounded-[5px] bg-[linear-gradient(160deg,#f2cf72,#b8862b_45%,#6e4a10)] p-[6px] shadow-[0_24px_48px_-14px_rgb(0_0_0/0.65)] lg:flex lg:min-h-0 lg:flex-col">
        <div className="rounded-[2px] bg-shyam lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <h1 className="flex items-baseline gap-3 border-b-2 border-gold/40 px-4 pb-2 pt-2.5 lg:pb-3 lg:pt-4">
            <span lang="hi" className="font-display text-[1.75rem] leading-none text-gold">
              कथा संग्रह
            </span>
            <span className="text-[0.95rem] text-sandal">Every katha</span>
          </h1>
          <ul className="flex gap-2 overflow-x-auto p-2 lg:p-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overscroll-contain">
            <li className="shrink-0">
              <KathaButton
                active={k === "all"}
                onClick={() => pickKatha("all")}
                title="All clips"
                sub={`${clips.length} ${clips.length === 1 ? "clip" : "clips"}`}
              />
            </li>
            <li className="shrink-0">
              <KathaButton
                active={k === "mine"}
                onClick={() => pickKatha("mine")}
                title="My bhajans"
                sub={acct.status !== "in" ? "Sign in to add your own" : acct.videos.length ? `${acct.videos.length} added by you` : "Add your own in My videos"}
                icon={<UserRound className="size-5" aria-hidden="true" />}
              />
            </li>
            <li className="shrink-0">
              <KathaButton
                active={k === "fav"}
                onClick={() => pickKatha("fav")}
                title="Liked"
                sub={favs.size ? `${favs.size} hearted` : "Tap ♥ on a bhajan to keep it"}
                icon={<Heart className="size-5 fill-current" aria-hidden="true" />}
              />
            </li>
            <li className="shrink-0">
              <KathaButton
                active={k === "recent"}
                onClick={() => pickKatha("recent")}
                title="Recently played"
                sub={recent.length ? `${recent.length} on this device` : "Nothing played yet"}
                icon={<Clock className="size-5" aria-hidden="true" />}
              />
            </li>
            {acct.playlists.map((l) => (
              <li key={l.id} className="shrink-0">
                <KathaButton
                  active={k === `pl:${l.id}`}
                  onClick={() => pickKatha(`pl:${l.id}`)}
                  title={l.name}
                  sub={`Playlist · ${l.items.length} ${l.items.length === 1 ? "bhajan" : "bhajans"}`}
                  icon={<ListMusic className="size-5" aria-hidden="true" />}
                />
              </li>
            ))}
            <li className="shrink-0">
              {acct.status !== "in" ? (
                <KathaButton active={false} onClick={() => router.push("/my")} title="Playlists" sub="Sign in to make your own" icon={<ListMusic className="size-5" aria-hidden="true" />} />
              ) : naming ? (
                <form onSubmit={makePlaylist} className="flex w-[15.5rem] items-center gap-1.5 p-2 max-lg:w-auto lg:w-full">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Playlist name"
                    aria-label="New playlist name"
                    maxLength={60}
                    className="h-10 min-w-0 flex-1 rounded-full border border-gold/40 bg-shyam-lit px-3.5 text-ivory placeholder:text-mist/80 focus:border-marigold focus:outline-none max-lg:w-40"
                  />
                  <button disabled={!newName.trim()} aria-label="Create the playlist" className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-shyam hover:bg-marigold disabled:opacity-50">
                    <Plus className="size-[18px]" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Cancel" onClick={() => (setNaming(false), setNewError(""))} className="grid size-10 shrink-0 place-items-center rounded-full text-sandal hover:text-ivory">
                    <X className="size-[18px]" aria-hidden="true" />
                  </button>
                  {newError && <span role="alert" className="sr-only">{newError}</span>}
                </form>
              ) : (
                <KathaButton active={false} onClick={() => setNaming(true)} title="New playlist" sub="Make your own list" icon={<Plus className="size-5" aria-hidden="true" />} />
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* ---------- its clips ---------- */}
      <section aria-labelledby="lib-title" className="flex min-w-0 flex-col gap-4 max-lg:min-h-0 max-lg:flex-1 max-lg:gap-2 lg:min-h-0">
        <div className="flex flex-col gap-3 max-lg:gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="lib-title" className="font-serif text-[clamp(1.6rem,1.3rem+1vw,2.2rem)] leading-tight text-ivory">
              {listId ? (playlist?.name ?? "Playlist") : k === "mine" ? "My bhajans" : k === "fav" ? "Liked bhajans" : k === "recent" ? "Recently played" : "All clips"}
            </h2>
            <p className="text-sandal">
              {listId && playlist && (
                <Link href={`/playlists/${playlist.id}`} className="mr-3 inline-flex items-center gap-1.5 text-ivory underline decoration-gold/50 hover:decoration-gold">
                  <Settings2 className="size-4" aria-hidden="true" /> Manage
                </Link>
              )}
              <span className="tabular text-gold">{shown.length}</span> {shown.length === 1 ? "clip" : "clips"}
              {shown.length > 0 && (
                <>
                  {" · "}
                  <span className="tabular text-gold" title="All of these played one after another">
                    {formatLength(shown.reduce((sum, { c }) => sum + (c.end - c.start), 0))}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:items-center">
            <div className="flex w-full gap-1.5 overflow-x-auto sm:w-auto" role="tablist" aria-label="Sections">
              {(["all", ...CATEGORIES] as Section[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={section === s}
                  onClick={() => setSection(s)}
                  className={chip}
                >
                  {s === "all" ? "All" : CATEGORY_LABELS[s].en}
                </button>
              ))}
            </div>
            {listId && playlist && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-gold/60 px-4 font-semibold text-ivory hover:border-gold hover:bg-shyam-lit"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add bhajans
              </button>
            )}
            {listId && playable.length > 0 && (
              <button
                type="button"
                onClick={() => playList(playable.map(({ c }) => c))}
                className="flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-marigold px-4 font-semibold text-velvet-deep hover:bg-[#ffb32e]"
              >
                <Play className="size-4 fill-current" aria-hidden="true" />
                Play all {playable.length}
              </button>
            )}
            {playAllHref && (
              <Link
                href={playAllHref}
                onClick={() => requestAutoplay(publicShown[0].c.slug)}
                className="flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-marigold px-4 font-semibold text-velvet-deep no-underline hover:bg-[#ffb32e]"
              >
                <Play className="size-4 fill-current" aria-hidden="true" />
                Play all {publicShown.length}
              </Link>
            )}
            {playable.length > 1 && (
              <button
                type="button"
                onClick={shuffleAll}
                aria-label="Shuffle and play these"
                title="Shuffle"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/50 text-sandal hover:border-gold hover:text-ivory"
              >
                <Shuffle className="size-[18px]" aria-hidden="true" />
              </button>
            )}
            <label className="relative block min-w-0 flex-1 sm:max-w-sm">
              <span className="sr-only">Search bhajans</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-mist" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search bhajans"
                className="h-10 w-full rounded-full border border-gold/30 bg-shyam pl-10 pr-10 text-ivory placeholder:text-mist/80 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-mist hover:text-ivory"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="min-h-[12rem] flex-1 overflow-y-auto overscroll-contain lg:-mr-2 lg:min-h-0 lg:pr-2" data-may-scroll>
          {shown.length === 0 ? (
            <p className="rounded-[4px] border border-gold/25 px-4 py-10 text-center text-sandal">
              {k === "mine" && !q.trim() && section === "all" ? (
                acct.status === "loading" ? (
                  "Loading…"
                ) : (
                  <>
                    {acct.status === "in" ? "Videos you add in " : "Sign in to add your own videos in "}
                    <Link href="/my" className="underline decoration-gold/50 hover:text-ivory">
                      My videos
                    </Link>{" "}
                    {acct.status === "in" ? "will appear here." : "and they will appear here."}
                  </>
                )
              ) : clips.length === 0
                ? "No clips yet."
                : listId && !q.trim() && section === "all"
                  ? (
                    <>
                      This playlist is empty.
                      <br />
                      <button type="button" onClick={() => setAdding(true)} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 font-semibold text-shyam hover:bg-marigold">
                        <Plus className="size-[18px]" aria-hidden="true" /> Add bhajans
                      </button>
                    </>
                  )
                  : k === "fav" && !q.trim() && section === "all"
                  ? "Tap the heart on a bhajan to keep it here."
                  : k === "recent" && !q.trim() && section === "all"
                    ? "Bhajans you play will be listed here."
                    : "Nothing matches these filters."}
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] content-start gap-x-5 gap-y-7 pb-2 max-sm:grid-cols-1 max-sm:gap-y-4">
              {shown.map(({ c }) => (
                <li key={c.slug} className="flex min-w-0">
                  <ClipCard clip={c} lit={played.has(c.slug)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {adding && playlist && (
        <PlaylistPicker playlistId={playlist.id} name={playlist.name} clips={[...clips, ...acct.videos]} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function KathaButton({
  active,
  onClick,
  title,
  sub,
  meta,
  videoId,
  icon,
}: {
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  meta?: string;
  videoId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex w-[15.5rem] items-center gap-3 rounded-[4px] border border-transparent p-2 text-left transition-colors hover:bg-shyam-lit aria-pressed:border-gold/70 aria-pressed:bg-shyam-lit max-lg:w-auto max-lg:max-w-[13rem] max-lg:gap-2 max-lg:rounded-full max-lg:border-gold/30 max-lg:py-1 max-lg:pr-3 lg:w-full"
    >
      {videoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl(videoId, "mq")} alt="" loading="lazy" className="aspect-video w-[4.5rem] shrink-0 rounded-[3px] object-cover max-lg:w-9 max-lg:rounded-full max-lg:aspect-square" />
      ) : (
        <span className="grid aspect-video w-[4.5rem] shrink-0 place-items-center rounded-[3px] bg-velvet font-display text-[1.3rem] text-gold max-lg:w-9 max-lg:rounded-full max-lg:aspect-square max-lg:text-[1rem]" lang="hi">
          {icon ?? "सब"}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ivory">{title}</span>
        <span className="block truncate text-[0.85rem] text-sandal max-lg:hidden">{sub}</span>
        {meta && <span className="block truncate text-[0.8rem] text-mist max-lg:hidden">{meta}</span>}
      </span>
    </button>
  );
}
