# Shravanam Kirtanam · श्रवणं कीर्तनं

Bhajans, kirtans and katha passages from Pujya Shri Indresh Upadhyay Ji Maharaj's Shrimad Bhagwat Katha, each one playing **only its own part** of the long YouTube live stream. Nothing is downloaded: YouTube's own player starts at the clip's start time and stops by itself at its end time.

An unofficial fan collection. Every video plays from the official [BhaktiPath YouTube channel](https://www.youtube.com/@BhaktiPath).

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind v4 · MongoDB Atlas (free tier) · Vercel (Hobby).

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in ADMIN_PASSWORD etc.
npm run dev                  # http://localhost:3100
```

Without `MONGODB_URI`, clips are read from and saved to `.data/clips.json` (seeded from `data/sample-clips.json`), so everything works before the database exists.

## Adding clips

**From the site:** open `/admin`, sign in, then **Add a clip**: paste the YouTube link, play it, tap **Mark start here** / **Mark end here**, name the bhajan, pick its section, and save. Optional: the **lyrics** (shown beside the player), and a **place / day** override if a video's YouTube title is read wrongly. A warning appears when the clip overlaps another of the same video.

**Many at once:** **Add many** takes one clip per line, `link | name | start | end | section` (section optional; start optional when the link has `?t=`), shows a preview table, and saves them together.

**Find the bhajans in a new katha video:** `npm run find -- <link>` reads YouTube's auto-captions (music and singing are marked there) and prints suggested bhajans with start, end, length and the first sung words. Save the ones you like:

```bash
npm run find -- "https://www.youtube.com/live/fH2lNOThsV0"
npm run find -- <link> --add "3=Radhe Radhe Japo,5=Govind Bolo"     # suggestions 3 and 5, with these names
npm run find -- <link> --gap 120 --min 90                            # tune: pause allowed inside one bhajan / shortest clip
```

**From the terminal:**

```bash
npm run clip -- add --url "https://www.youtube.com/live/fH2lNOThsV0?t=1291" \
  --title "Radhe Radhe Japo" --end 30:45 --category bhajan --tags "Radha" [--lyrics "..."] [--place Sikar --day 5]
npm run clip -- list
npm run clip -- remove <slug>
npm run clip -- export            # JSON backup (also: Download backup in /admin)
npm run clip -- import backup.json
npm run clip -- clear-samples     # remove the sample clips
```

`--start` can be left out when the link has `t=`. Times can be written `21:31`, `1:05:20` or `1291`. With `SITE_URL` and `REVALIDATE_SECRET` set, the live site refreshes right after the change.

Which katha a clip belongs to (place, state, year, day) is read from the source video's YouTube title (`lib/katha.ts`), so clips sort themselves into the katha library.

## On the site

- **Home:** today's bhajan (changes daily, India time) in the shrine, and the timings board (sections, search, ♥ My bhajans).
- **कथा संग्रह (`/kathas`):** every katha by place and year, with day / section filters, search that works across scripts ("radhe" finds "राधे"), My bhajans, Recently played, and **Play all**.
- **Clip page:** play/pause, repeat, play-next (stays within the same katha first), sleep timer, lyrics, share. Keys: Space or K play/pause, ← → 5 seconds, N next, L repeat.
- Favourites and recently played are kept per device (no login).

## Deploy (one time)

1. **MongoDB Atlas:** create a free cluster (choose Mumbai / `ap-south-1` if offered). Under *Network Access* allow `0.0.0.0/0` (Vercel's addresses change). Create a database user and copy the connection string.
2. **Vercel:** *Add New → Project*, import the GitHub repo (framework preset Next.js, defaults are fine).
3. In *Settings → Environment Variables* add every key from `.env.example`:
   `MONGODB_URI`, `MONGODB_DB`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (32+ random characters), `REVALIDATE_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` and `SITE_URL` (both = the site's address, e.g. `https://shravanam-kirtanam.vercel.app`).
4. Redeploy. Then move clips in: `npm run clip -- import <export.json>` with `MONGODB_URI` in `.env.local`, or add them from `/admin`.

`vercel.json` runs the functions in Mumbai (`bom1`) and calls `/api/cron/keepalive` once a day, so the free Atlas cluster never sits 30 days without a connection (it would pause).

## Checks

```bash
npm test                 # unit tests: parsing, schema, katha grouping, finder, search, bulk lines
npm run typecheck
npm run lint
npm run build
npm run check:fit        # laptops: no page scrollbar, nothing under the footer (needs the site running)
npm run check:screens    # every page at 16 phone/tablet/laptop sizes (needs the site running)
node scripts/e2e-player.mjs   # real YouTube: starts at start, stops at end, loop, autoplay next
```

## Good to know

- **Video quality** can't be set by a website. Choose 1080p once in YouTube's settings menu inside the player; YouTube remembers it per browser.
- **Hindi auto-captions** are switched off when a clip starts; the CC button turns them back on.
- If a video is deleted, made private, or the channel blocks embedding, the clip shows a message with an **Open on YouTube** link.
- On phones, YouTube embeds stop when the screen locks (YouTube's rule for embedded players); every clip page has an "open in YouTube" button for listening with the screen off.
- Atlas's free tier has no backups: use **Download backup** in `/admin` now and then.
- If stylesheet edits don't show up in `npm run dev` on an NTFS disk, restart it (dev mode polls for changes to cope with this).
