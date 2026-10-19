# Shravanam Kirtanam · श्रवणं कीर्तनं

Bhajans and katha passages from Pujya Shri Indresh Upadhyay Ji Maharaj's Shrimad Bhagwat Katha, each one playing **only its own part** of the long YouTube live stream. Nothing is downloaded: YouTube's own player starts at the clip's start time and stops by itself at its end time.

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

- **Home:** today's bhajan (changes daily, India time) in the shrine, and the timings board (sections, search, ♥ Liked).
- **कथा संग्रह (`/kathas`):** every clip with section filters (Kirtan, Katha), search that works across scripts ("radhe" finds "राधे"), My bhajans (the videos you added), Liked, Recently played, and **Play all**.
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

## Sign-in with Google and "My videos"

Visitors can sign in with Google (header → the person icon, or `/my`). Signed in, their likes and recently
played live in their account instead of the browser, and they can add any YouTube video to a private library
(`/my`), then rename, trim, categorise or add lyrics to it. Only the owner can open, edit or delete them.
Signed-out visitors still work as before, with likes kept in the browser.

Setup (once):
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → *Web application*.
2. Authorised redirect URIs: `http://localhost:3100/api/auth/google/callback` and
   `https://<your-domain>/api/auth/google/callback`.
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local` and to the Vercel project's environment
   variables, then redeploy. `ADMIN_SESSION_SECRET` (32+ characters) also signs the visitor cookie.

Email and password also work, side by side with Google (no setup needed): a "Sign in / Create account" form on `/my`.
Passwords are stored as salted scrypt hashes; five wrong tries pause an account for ten minutes. New password accounts are sent a
"confirm your email" link, and "Forgot your password?" emails a one-hour, single-use reset link. Mail is sent
from a Gmail account: set `SMTP_USER` (the Gmail address) and `SMTP_PASS` (a Gmail *app password*: Google
Account → Security → 2-Step Verification → App passwords). Without them no mail is sent (in development it is
written to `.data/outbox.log` instead). If someone later signs in with
Google using the same email, the accounts merge and the old password is removed. Without the two Google
variables the Google button is hidden and email/password still works. Accounts and videos are stored in the same MongoDB database (`users`, `uservideos`), or in
`.data/users.json` / `.data/uservideos.json` when no database is configured.

## Adding new videos (the routine)

The owner sends notes like:

```
day 1 - https://www.youtube.com/watch?v=XXXXXXXXXXX
15:30 - 26:50 - hey gopal radhe krishna govind govind
2:24:18 - mix - man bhul mat jaaio radha rani ke charan, radhe radhe govind govind radhe
```

1. Save the notes to a file (e.g. `.data/notes.txt`) and run `npm run add-videos -- plan .data/notes.txt`.
   It reads the notes, downloads the video's Hindi captions (yt-dlp), tidies the names, **uses the times exactly as given**,
   finds a missing end from the captions (a missing start can't be guessed: ask the owner), prints what is sung at the start,
   the end and (for mixes) all through the range, warns about a range that starts or ends in speaking, and flags clips that
   are already in the collection (same video, overlapping or within a minute). The plan is written to `.data/add-plan.json`.
2. Correct the titles in the plan from what the captions say (spelling, grammar). For a mix, list the bhajans heard in the
   range; if they can't be told apart, keep the owner's names. Set `allowDuplicate` / `skip` where needed.
3. `npm run add-videos -- save` saves them to the database and refreshes the live site (and a local dev server).
   `--direct` on `plan` saves straight away when there are no problems and no duplicates.

Tests for each part: `lib/addnotes.ts`, `lib/tidy.ts`, `lib/evidence.ts`, `lib/duplicates.ts`.
