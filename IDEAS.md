# Ideas and future work

Things we talked about but chose not to do yet. Nothing here is broken; each item says what it
would take. Move an item out of this file when it is built.

## Built, waiting only for a setting

- **Email confirmation and "Forgot your password?"** The code is finished and tested. It switches on when
  the mail account is configured: set `SMTP_USER` (a Gmail address) and `SMTP_PASS` (a Gmail *app
  password*: Google Account → Security → 2-Step Verification → App passwords) in `.env.local` and in the
  Vercel project's Production environment variables, then redeploy. Until then the confirm-email banner
  is hidden and the reset page says it isn't set up. Gmail sends about 500 emails a day; past that,
  use a mail service on a domain of our own.
- **Open sign-in to everyone with Google.** Google Cloud → Google Auth Platform → Audience →
  *Publish app* was greyed out ("complete the Branding page"). While the app is in "Testing", only the
  emails on the *Test users* list (up to 100) can use "Continue with Google"; everyone else can use
  email and password. Publishing probably also wants a privacy-policy page (see below).

## Accounts and My videos

- A start/end preview player with "Mark start here / Mark end here" buttons in the My videos editor
  (the admin editor already has one in `components/admin/ClipEditor.tsx`).
- Show a person's own videos in "Recently played" and in a favourites view. Today those lists only look up
  the public clips; hearts are hidden on private videos because they are all in My videos already.
- Let a signed-in person delete their account and download their data.
- A short privacy-policy and terms page (needed if we publish the Google app, and good practice anyway).
- Limit sign-ups per address (today only repeated wrong passwords on one account are slowed).
- Optional: let a person make one video public (with admin approval).

## Player and playback

- **Background play** with the screen locked: not possible in an embedded YouTube player, even with
  YouTube Premium (Premium applies inside YouTube's own app and site). The "Open in YouTube" button uses it.
- **YouTube watch history:** plays here don't appear in a person's YouTube history. It depends on the browser
  sending their YouTube login to the embedded player (third-party cookies, autoplay). There is no official
  way to write to someone's history.
- Sharper card pictures: use YouTube's 480×360 thumbnail instead of 320×180 (about 3× the download).

## Content and data

- Fix the capitalisation of "Aarti ati paavan puran ki".
- Weekly automatic backup of the database (Atlas free tier has none); the admin page already offers a
  manual backup download.
- Delete the unused `MONGODB_USERNAME` and `MONGODB_PASSWORD` lines from `.env.local` and `.env.vercel`.

## Small design notes

- At 320 px wide the header shows only the person icon with no "Sign in" label.
- The Google and the email "Sign in" buttons are both gold; an outlined email button would show which is
  the main choice.
- The small diya (lamp) beside each card's name now only shows above 1700 px wide.

## Suggested at the end of the 2026-10-19 session

- Use the stronger duplicate check (`lib/duplicates.ts`: same video within a minute, same name) in the admin editor and the
  Public-request review, not only in `npm run add-videos`.
- A "bottom sheet" version of the ⋯ menu on phones (easier with a thumb than the small pop-up).
- Group playlists under a "Playlists" heading in the library list once there are many.
- Hide the speed button's "1×" unless the speed was changed (tidier controls).
- Fill in lyrics for the most-played bhajans (the lyrics panel exists; most clips have none).
- A contact line on the privacy page.
- Re-run the long all-screens check (`npm run check:screens`) once; it was stopped before finishing this session.
