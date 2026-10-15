# Bhajan Clip Player: handoff notes

Notes for a new chat in a new repo. Everything below was tested on 2026-10-13
in Chrome on localhost (served by a dev server, not opened as a file).

## What we're building

A small static website that plays **clips** of long YouTube videos (mostly
BhaktiPath's Shrimad Bhagwat Katha live streams): each clip starts at a
chosen time and stops on its own at a chosen end time. Hosting: **Vercel**
(static site, no framework, no build step).

Two pieces were prototyped:

1. **Clip maker** (`index.html` or a page of its own): paste a YouTube link
   plus a start and end time, and it plays that clip and makes a shareable
   link like `https://<site>/?v=fH2lNOThsV0&start=21:31&end=30:45`.
2. **Clip cards page**: a grid of clip cards (thumbnail, label, time range).
   Clicking a card opens a large player in an overlay, and closing it
   destroys the player.

## What was confirmed to work

- **Start and end times work.** `start` / `end` in the YouTube IFrame API's
  `playerVars` (and `startSeconds` / `endSeconds` in `loadVideoById`) start
  the clip at the right time and pause it at the end time.
- **The shareable link works**: opening the page with
  `?v=ID&start=mm:ss&end=mm:ss` loads that clip.
- **Times can be written** as `21:31`, `1:05:20` or plain seconds (`1291`).
- **Accepted link formats:** `watch?v=`, `/live/`, `youtu.be/`, `/embed/`,
  `/shorts/`, or a bare 11-character ID.

## Findings

### 1080p quality
- A page **cannot force the quality.** YouTube made `setPlaybackQuality` /
  `suggestedQuality` do nothing in 2019, and the `vq=hd1080` trick no longer
  works. A web page cannot reach inside YouTube's cross-origin iframe.
- The test videos **are** available up to 1440p (checked with
  `yt-dlp -F <url>`), yet the embed still started at 720p on Auto, even in a
  big ~1587x893 player.
- **What works (tested):** choose gear → Quality → 1080p **once**. With the
  "new player for each clip" setup, every clip opened after that also
  started at 1080p. YouTube keeps the choice in the browser.
- The catch: that choice is saved **per browser and per site**. Each viewer
  sets it once, on each device, and probably once more on the Vercel domain
  (localhost counts as a different site). Clearing site data resets it.
- Still worth doing: make the player large. The pages size it to fill the
  screen height: `width: min(1600px, 100%, calc((100vh - 110px) * 16 / 9))`.

### Captions
- The videos have **Hindi (auto-generated)** captions. On youtube.com they
  start off, but in the embed they came up **on**.
- **Not built yet.** Two options:
  1. The viewer clicks CC once (it probably gets remembered like the quality).
  2. Have the page turn them off: call `player.unloadModule('captions')` in
     `onReady` / when playback starts. This isn't a documented option but it's
     widely used. Viewers can still turn captions back on with CC.

### Errors YouTube can return (`onError`)
| Code | Meaning | Fixable by us? |
|---|---|---|
| 2 | Invalid ID or times | yes, check input |
| 5 | Can't play in this browser | no |
| 100 | Video deleted or private | no |
| 101 / 150 | Channel has blocked embedding for this video | **no**, no hosting choice fixes it |
| 153 | YouTube didn't get the page's address (referrer) | yes, see below |

- **Error 153** comes from a `Referrer-Policy` of `no-referrer` (or
  `same-origin`), or from opening the HTML file directly with no web address.
  Keep `strict-origin-when-cross-origin` (the browser default). The page also
  sets `<meta name="referrer" content="strict-origin-when-cross-origin">`.
  **On Vercel:** if you add a `vercel.json` with headers, never set
  `Referrer-Policy: no-referrer`.
- **Check a video can be embedded** before adding it:
  `yt-dlp --skip-download --print "%(playable_in_embed)s %(height)s" <url>`
  (it should print `True` and the maximum height).

### Other notes
- Thumbnails: `https://i.ytimg.com/vi/<ID>/hqdefault.jpg` (4:3 with black
  bars; `object-fit: cover` in a 16:9 box crops them off).
- List a channel's recent streams:
  `yt-dlp --flat-playlist --playlist-end 8 --print "%(id)s | %(title)s" "https://www.youtube.com/@BhaktiPath/streams"`
- The "Playing at: 1080p" label on the cards page uses `getPlaybackQuality()`,
  which YouTube deprecated. Treat it as a hint and trust the gear menu.

## Test videos used (all embeddable, max 1440p)

| ID | Title |
|---|---|
| `fH2lNOThsV0` | Day 5, Shrimad Bhagwat Katha, Dhuri, P.B 2026 |
| `FiGC8c9z-Y8` | Day 4, same katha |
| `hGPB-CIEQlQ` | Day 3, same katha |
| `5sH1ivfDrHc` | Day 2, same katha |

The cards page's clip times (21:31–30:45 etc.) were made up for testing. Swap
in the real clips.

## Deploying on Vercel

1. New GitHub repo with `index.html` (and `cards.html` if you keep both) at
   the root.
2. Import the repo in Vercel and pick Framework Preset **Other**, no build
   command, output directory `.` (root).
3. Test `https://<project>.vercel.app/?v=fH2lNOThsV0&start=21:31&end=21:45`
   (14 seconds: it should stop on its own at 21:45).
4. Set 1080p once in the gear menu on the live domain and check the next clip
   keeps it.

## Next steps

- [ ] Put the real clip list into `CLIPS` on the cards page.
- [ ] Decide on captions (option 1 or 2 above).
- [ ] Decide whether the clip maker and the cards page are one page or two.
- [ ] Deploy to Vercel and run the checks above on the live URL.

---

## Source: clip maker (final tested version)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Bhajan Clip Player</title>
<style>
  body { margin:0; font-family:system-ui,sans-serif; background:#111; color:#eee; display:flex; justify-content:center; padding:16px; }
  .wrap { width:100%; max-width:min(1600px, calc((100vh - 100px) * 16 / 9)); }
  h1 { font-size:1.4rem; margin:0 0 12px; }
  .player { position:relative; padding-top:56.25%; background:#000; border-radius:8px; overflow:hidden; }
  #player { position:absolute; inset:0; width:100%; height:100%; }
  #status { margin:10px 0; color:#f5c26b; min-height:1.2em; }
  form { display:grid; gap:10px; margin-top:12px; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  label { display:grid; gap:4px; font-size:.9rem; color:#bbb; }
  input { padding:10px; border-radius:6px; border:1px solid #444; background:#1c1c1c; color:#eee; font-size:1rem; }
  button { padding:10px 14px; border:0; border-radius:6px; background:#e85d04; color:#fff; font-size:1rem; cursor:pointer; }
  #out { display:flex; gap:8px; margin-top:12px; }
  #out input { flex:1; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Bhajan Clip Player</h1>
  <div class="player"><div id="player"></div></div>
  <p id="status">Paste a YouTube link below to make a clip.</p>
  <button id="replay" type="button" hidden>Replay clip</button>

  <form id="form">
    <label>YouTube link
      <input id="link" placeholder="https://www.youtube.com/live/..." required>
    </label>
    <div class="row">
      <label>Start (mm:ss)<input id="start" placeholder="21:31" required></label>
      <label>End (mm:ss)<input id="end" placeholder="26:40" required></label>
    </div>
    <button type="submit">Play &amp; make link</button>
  </form>

  <div id="out" hidden>
    <input id="shareLink" readonly>
    <button id="copy" type="button">Copy</button>
  </div>
</div>

<script>
  let player = null, apiReady = false, pending = null, current = null;
  const $ = id => document.getElementById(id);

  // "21:31" or "1:05:20" or "1291" -> seconds
  function toSeconds(t) {
    if (t == null || t === '') return null;
    t = String(t).trim();
    if (/^\d+$/.test(t)) return Number(t);
    const parts = t.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  // seconds -> "21:31" or "1:05:20"
  function fmt(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(x).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }

  // Works with watch?v=, /live/, youtu.be/, /embed/, /shorts/ or a bare ID
  function getId(input) {
    input = input.trim();
    const m = input.match(/(?:v=|\/live\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{11}$/.test(input) ? input : null;
  }

  function setStatus(msg) { $('status').textContent = msg; }

  function onErr(ev) {
    const msgs = {
      2: 'Invalid video ID or times.',
      5: "This video can't play in this browser.",
      100: 'Video not found (deleted or private).',
      101: 'The channel has disabled embedding for this video.',
      150: 'The channel has disabled embedding for this video.',
      153: "YouTube didn't receive the page address (referrer). Check the site's Referrer-Policy."
    };
    setStatus('Error ' + ev.data + ': ' + (msgs[ev.data] || 'Unknown error.'));
  }

  function playClip(id, s, e, autoplay) {
    current = { id, s, e };
    setStatus(`Clip: ${fmt(s)} → ${fmt(e)}`);
    $('replay').hidden = false;
    if (!apiReady) { pending = [id, s, e, autoplay]; return; }
    if (player) {
      const opts = { videoId: id, startSeconds: s, endSeconds: e };
      autoplay ? player.loadVideoById(opts) : player.cueVideoById(opts);
      return;
    }
    player = new YT.Player('player', {
      videoId: id,
      playerVars: { start: s, end: e, playsinline: 1, rel: 0, autoplay: autoplay ? 1 : 0, origin: location.origin },
      events: { onError: onErr }
    });
  }

  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;
    if (pending) { const p = pending; pending = null; playClip(...p); }
  };

  // Load YouTube's official player API
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  // If the page was opened with ?v=...&start=...&end=..., load that clip
  const q = new URLSearchParams(location.search);
  const qid = q.get('v'), qs = toSeconds(q.get('start')), qe = toSeconds(q.get('end'));
  if (qid && qs !== null && qe !== null && qe > qs) {
    $('link').value = 'https://www.youtube.com/watch?v=' + qid;
    $('start').value = fmt(qs);
    $('end').value = fmt(qe);
    playClip(qid, qs, qe, false);
  }

  // Pasting a link with ?t=1291 fills in the start time automatically
  $('link').addEventListener('change', () => {
    const t = $('link').value.match(/[?&]t=(\d+)/);
    if (t && !$('start').value) $('start').value = fmt(Number(t[1]));
  });

  $('form').addEventListener('submit', ev => {
    ev.preventDefault();
    const id = getId($('link').value);
    const s = toSeconds($('start').value), e = toSeconds($('end').value);
    if (!id) return setStatus("Couldn't find a video ID in that link.");
    if (s === null || e === null) return setStatus('Times should look like 21:31 or 1:05:20.');
    if (e <= s) return setStatus('End time must be after the start time.');
    const url = `${location.origin}${location.pathname}?v=${id}&start=${fmt(s)}&end=${fmt(e)}`;
    $('shareLink').value = url;
    $('out').hidden = false;
    history.replaceState(null, '', url);
    playClip(id, s, e, true);
  });

  $('replay').addEventListener('click', () => {
    if (player && current) player.loadVideoById({ videoId: current.id, startSeconds: current.s, endSeconds: current.e });
  });

  $('copy').addEventListener('click', () => {
    navigator.clipboard.writeText($('shareLink').value)
      .then(() => setStatus('Link copied!'))
      .catch(() => { $('shareLink').select(); setStatus('Press Ctrl+C to copy.'); });
  });
</script>
</body>
</html>
```

## Source: clip cards page (final tested version)

The tested setup is the default **"New player for each clip"**. The "Keep one
player" mode was built for comparison and was not needed. It can be removed.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Bhajan Clip Cards</title>
<style>
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,sans-serif; background:#111; color:#eee; padding:24px 16px; }
  .wrap { max-width:1200px; margin:0 auto; }
  h1 { font-size:1.4rem; margin:0 0 8px; }
  .hint { color:#aaa; margin:0 0 16px; font-size:.95rem; line-height:1.5; }
  .mode { display:flex; flex-wrap:wrap; gap:16px; margin:0 0 20px; padding:12px 14px; background:#1c1c1c; border:1px solid #333; border-radius:8px; font-size:.95rem; }
  .mode label { display:flex; gap:6px; align-items:center; cursor:pointer; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:16px; }
  .card { display:flex; flex-direction:column; text-align:left; padding:0; border:1px solid #333; border-radius:10px; background:#1a1a1a; color:inherit; font:inherit; cursor:pointer; overflow:hidden; }
  .card:hover, .card:focus-visible { border-color:#e85d04; }
  .thumb { position:relative; aspect-ratio:16/9; background:#000; }
  .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .thumb .time { position:absolute; right:8px; bottom:8px; background:rgba(0,0,0,.8); padding:2px 6px; border-radius:4px; font-size:.8rem; }
  .meta { padding:10px 12px 12px; display:grid; gap:4px; }
  .meta b { font-size:.95rem; }
  .meta span { color:#aaa; font-size:.85rem; }

  .modal { position:fixed; inset:0; background:rgba(0,0,0,.85); display:flex; align-items:center; justify-content:center; padding:16px; z-index:10; }
  .modal[hidden] { display:none; }
  .box { width:min(1600px, 100%, calc((100vh - 110px) * 16 / 9)); }
  .bar { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
  .bar .title { flex:1; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #quality { color:#f5c26b; font-size:.9rem; white-space:nowrap; }
  #close { padding:8px 14px; border:0; border-radius:6px; background:#e85d04; color:#fff; font-size:1rem; cursor:pointer; }
  .player { position:relative; aspect-ratio:16/9; background:#000; border-radius:8px; overflow:hidden; }
  .player iframe, .player > div { position:absolute; inset:0; width:100%; height:100%; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Bhajan Clip Cards</h1>
  <p class="hint">Test: open the first clip, set Quality to 1080p in the gear menu, close it, then open the next clips and see if they stay at 1080p.<br>
    The yellow text above the player shows the quality YouTube reports it is playing at.</p>

  <div class="mode">
    <b>Player mode:</b>
    <label><input type="radio" name="mode" value="new" checked> New player for each clip</label>
    <label><input type="radio" name="mode" value="reuse"> Keep one player and switch clips</label>
  </div>

  <div class="grid" id="grid"></div>
</div>

<div class="modal" id="modal" hidden>
  <div class="box">
    <div class="bar">
      <span class="title" id="modalTitle"></span>
      <span id="quality"></span>
      <button id="close" type="button">Close</button>
    </div>
    <div class="player" id="playerBox"></div>
  </div>
</div>

<script>
  // Test clips: three from Day 5, one each from Days 4, 3 and 2.
  const CLIPS = [
    { id: 'fH2lNOThsV0', label: 'Day 5 · Clip A', start: '21:31',   end: '30:45' },
    { id: 'fH2lNOThsV0', label: 'Day 5 · Clip B', start: '45:00',   end: '50:00' },
    { id: 'fH2lNOThsV0', label: 'Day 5 · Clip C', start: '1:10:00', end: '1:15:00' },
    { id: 'FiGC8c9z-Y8', label: 'Day 4 · Clip',   start: '30:00',   end: '35:00' },
    { id: 'hGPB-CIEQlQ', label: 'Day 3 · Clip',   start: '40:00',   end: '45:00' },
    { id: '5sH1ivfDrHc', label: 'Day 2 · Clip',   start: '50:00',   end: '55:00' },
  ];

  const $ = id => document.getElementById(id);
  const QUALITY = { tiny:'144p', small:'240p', medium:'360p', large:'480p', hd720:'720p', hd1080:'1080p', hd1440:'1440p', hd2160:'2160p', highres:'4K+' };
  let apiReady = false, pending = null, player = null, pollTimer = null;

  function toSeconds(t) {
    return String(t).split(':').map(Number).reduce((acc, p) => acc * 60 + p, 0);
  }
  function mode() { return document.querySelector('input[name="mode"]:checked').value; }

  // Cards
  CLIPS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.type = 'button';
    b.innerHTML =
      `<div class="thumb"><img src="https://i.ytimg.com/vi/${c.id}/hqdefault.jpg" alt="" loading="lazy">` +
      `<span class="time">${c.start} → ${c.end}</span></div>` +
      `<div class="meta"><b>${c.label}</b><span>Clip ${i + 1} of ${CLIPS.length}</span></div>`;
    b.addEventListener('click', () => open(c));
    $('grid').appendChild(b);
  });

  function showQuality() {
    if (!player || typeof player.getPlaybackQuality !== 'function') return;
    const q = player.getPlaybackQuality();
    $('quality').textContent = q && q !== 'unknown' ? 'Playing at: ' + (QUALITY[q] || q) : '';
  }

  function open(c) {
    $('modalTitle').textContent = `${c.label} (${c.start} → ${c.end})`;
    $('quality').textContent = '';
    $('modal').hidden = false;
    if (!apiReady) { pending = c; return; }
    const s = toSeconds(c.start), e = toSeconds(c.end);

    if (mode() === 'reuse' && player) {
      player.loadVideoById({ videoId: c.id, startSeconds: s, endSeconds: e });
    } else {
      if (player) { player.destroy(); player = null; }
      $('playerBox').innerHTML = '<div id="player"></div>';
      player = new YT.Player('player', {
        videoId: c.id,
        playerVars: { start: s, end: e, autoplay: 1, playsinline: 1, rel: 0, origin: location.origin },
        events: { onPlaybackQualityChange: showQuality, onStateChange: showQuality },
      });
    }
    clearInterval(pollTimer);
    pollTimer = setInterval(showQuality, 1000);
  }

  function close() {
    $('modal').hidden = true;
    clearInterval(pollTimer);
    if (!player) return;
    if (mode() === 'reuse') { player.pauseVideo(); }
    else { player.destroy(); player = null; $('playerBox').innerHTML = ''; }
  }

  // Switching mode starts fresh, so the two tests don't mix.
  document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', () => {
    if (player) { player.destroy(); player = null; $('playerBox').innerHTML = ''; }
  }));

  $('close').addEventListener('click', close);
  $('modal').addEventListener('click', ev => { if (ev.target === $('modal')) close(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('modal').hidden) close(); });

  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;
    if (pending) { const c = pending; pending = null; open(c); }
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
</script>
</body>
</html>
```
