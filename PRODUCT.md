# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router, TypeScript, Tailwind v4) deployed on Vercel's free Hobby plan; clips stored in MongoDB Atlas's free cluster. The owner chose Next.js + Vercel and preferred MongoDB; Vercel offers no free first-party database.

## Users

- **The owner**, a devotee who listens to Pujya Shri Indresh Upadhyay Ji Maharaj's Shrimad Bhagwat Katha live streams (2–3 hours each) on phone and laptop, and wants to return to just the bhajans, kirtans and katha passages without scrubbing through the whole stream.
- **People the owner shares links with**: family, friends and satsang groups who open a single clip link from WhatsApp, usually on a phone, often a first visit.

## Product Purpose

A personal collection of clips from long YouTube katha videos. Each clip is a start and end time inside a video on the official @BhaktiPath channel, with a name the owner gives it (the bhajan's name). Nothing is downloaded or re-hosted: YouTube's own player plays the video from the start time and stops by itself at the end time. Success: open the site on any device, find a bhajan, and it plays exactly that part; a shared link opens straight into that bhajan with a proper preview.

## Positioning

YouTube can link to a start time but not an end time, and the bhajans are buried inside multi-hour streams. This site turns each stream into named, separately playable bhajans, kirtans and katha passages, each with its own start and end.

## Operating Context

- Sections: **Bhajan** (every song, kirtan included) and **Katha** (katha passages that are not songs). Clips may also carry free tags.
- Titles are given by the owner and may be Hinglish (Latin script) or Hindi (Devanagari).
- Many clips come from the same day's stream, so they share one YouTube thumbnail.
- Clips are added by the owner from a password-protected admin page (often on a phone, while listening) or by the owner's assistant from the terminal.
- Video quality cannot be forced by the page; the viewer picks 1080p once in YouTube's gear menu and YouTube remembers it per browser.

## Capabilities and Constraints

- Playback uses YouTube's IFrame Player API; some videos may later be made private or have embedding disabled. The site must explain this, not break.
- Free tiers only: Vercel Hobby, MongoDB Atlas free (0.5 GB, pauses after 30 days without connections, so a daily keep-alive runs).
- Kept out of search engines; it is a shared-link site.
- Must work on phones and on short laptop screens (the player fits a 730px-tall viewport).

## Brand Commitments

- Name: **Shravanam Kirtanam** (श्रवणं कीर्तनं), from Shrimad Bhagavatam 7.5.23 ("śravaṇaṁ kīrtanaṁ viṣṇoḥ smaraṇaṁ…"): listening and singing, the first two of the nine forms of bhakti. Listening maps to the katha, singing to the bhajans and kirtans.
- Theme pinned by the owner: devotion to Krishna. Colours, typography and ornament should feel made for Krishna bhakti, bhajans and katha.
- Credit, always visible: the katha is by Pujya Shri Indresh Upadhyay Ji Maharaj; videos belong to the official BhaktiPath YouTube channel (https://www.youtube.com/@BhaktiPath). The site is an unofficial fan collection and must not look like the official channel's site.

## Evidence on Hand

- Four real katha videos (Dhuri, Punjab, 2026, Days 2–5): `fH2lNOThsV0`, `FiGC8c9z-Y8`, `hGPB-CIEQlQ`, `5sH1ivfDrHc`. All embeddable.
- No real bhajan names or clip times yet; the owner will send them. Sample clips used during the build are marked as samples and must be replaced.
- No photos or artwork of Krishna or Maharaj Ji other than YouTube thumbnails. Do not invent quotes attributed to Maharaj Ji.

## Product Principles

1. The bhajan is the unit: one name, one start, one end, one tap to play.
2. Respect the source: credit the speaker and channel, link back, never re-host.
3. Phone first: most plays start from a WhatsApp link on a phone.
4. Calm and devotional, never cluttered: the interface steps back once a bhajan is playing.

## Accessibility & Inclusion

Mixed Latin and Devanagari text must render correctly everywhere (titles, headings, previews). Older family members are likely users: readable text sizes and large tap targets.
