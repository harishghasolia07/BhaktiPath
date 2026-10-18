---
name: Shravanam Kirtanam
description: Every bhajan is a darshan; the pat opens, it plays, it closes.
colors:
  velvet: "#4b0915"
  velvet-deep: "#2c040b"
  velvet-lit: "#6e1324"
  gold: "#e3b04b"
  brass: "#b8862b"
  brass-dark: "#7a5414"
  marigold: "#f29d16"
  marigold-deep: "#d9700a"
  leaf: "#3f7a35"
  shyam: "#17204a"
  shyam-lit: "#222d63"
  ivory: "#f8e9cb"
  sandal: "#e8cf9e"
  mist: "#c3c8ea"
typography:
  display:
    fontFamily: "Yatra One, Tiro Devanagari Hindi, serif"
    fontSize: "1.9rem"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Tiro Devanagari Hindi, serif"
    fontSize: "clamp(1.75rem, 1.3rem + 1.4vw, 2.4rem)"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Tiro Devanagari Hindi, serif"
    fontSize: "1.2rem"
    fontWeight: 400
    lineHeight: 1.375
  body:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  timing:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 600
    fontFeature: "tnum"
  label:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
    letterSpacing: "0.16em"
rounded:
  row: "3px"
  frame: "4px"
  field: "6px"
  pill: "9999px"
spacing:
  head: "1.5rem"
  block: "clamp(2rem, calc(1.781rem + 0.899vw), 2.5rem)"
  group: "clamp(3rem, calc(2.562rem + 1.798vw), 4rem)"
  section-py: "clamp(2.875rem, calc(1.779rem + 4.494vw), 5.375rem)"
  nav-h: "108px"
  nav-h-phone: "100px"
  fit-h: "calc(100cqh - 2.75rem)"
components:
  section-tab:
    backgroundColor: "transparent"
    textColor: "{colors.sandal}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  section-tab-selected:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.shyam}"
    rounded: "{rounded.pill}"
  darshan-call:
    backgroundColor: "{colors.shyam}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  icon-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.sandal}"
    rounded: "{rounded.pill}"
    size: "44px"
  icon-toggle-pressed:
    backgroundColor: "transparent"
    textColor: "{colors.marigold}"
    rounded: "{rounded.pill}"
    size: "44px"
  button-play:
    backgroundColor: "{colors.marigold}"
    textColor: "{colors.velvet-deep}"
    rounded: "{rounded.pill}"
    size: "48px"
  button-play-all:
    backgroundColor: "{colors.marigold}"
    textColor: "{colors.velvet-deep}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.sandal}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.shyam}"
  nav-link-current:
    backgroundColor: "{colors.shyam}"
    textColor: "{colors.gold}"
    rounded: "{rounded.pill}"
    height: "44px"
  clip-card:
    backgroundColor: "{colors.shyam}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.frame}"
  menu-popover:
    backgroundColor: "{colors.shyam}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.frame}"
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.shyam}"
    rounded: "{rounded.pill}"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.marigold}"
    textColor: "{colors.shyam}"
  button-mark:
    backgroundColor: "{colors.marigold}"
    textColor: "{colors.velvet-deep}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "46px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.sandal}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "46px"
  input-field:
    backgroundColor: "{colors.shyam}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "48px"
  input-search:
    backgroundColor: "{colors.shyam-lit}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.pill}"
    height: "44px"
  timings-board:
    backgroundColor: "{colors.shyam}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.frame}"
---

# Design System: Shravanam Kirtanam

## Overview

**Creative North Star: "Jhanki Darshan"**

The site is a temple jhanki, not a video library. Each bhajan sits behind a velvet pat inside an arched brass mandir; tapping it draws the pat aside to the pillars and the video plays in the sanctum. Around the shrine the world is a festival doorway: a marigold-and-mango-leaf toran across the top of every page, a maroon velvet ground with real pile, and a Shyam-blue timings board in a brass frame listing every darshan by its time in the katha.

Density is calm and devotional. One shrine, one board, one credit line; the interface steps back once a bhajan plays. Ornament is authored SVG geometry (cusped nine-lobe arch, lotus-petal moulding, kalash, pillars, toran, diya, mor pankh), never stock imagery or icon-font decoration. Devanagari is a first-class script: display type is Devanagari gold, titles may be Hindi or Hinglish, and both render in the same serif.

The home board and the up-next panel refuse the dark thumbnail grid: clips are listed as names against times. The one place thumbnails appear is the katha library (/kathas), where a small poster card is the honest way to browse many kathas and days; those cards still sit on Shyam with a gold hairline, never as loose cards on the velvet, and the playing surfaces stay thumbnail-free.

**Key Characteristics:**
- Maroon velvet ground (procedural tile plus a lit crown gradient), dark color scheme throughout.
- Two lit materials on the ground: brass/gold (frames, display type, timings) and Shyam blue (the board and panels that hold lists).
- Marigold is the action and state colour: the Play/Pause and Play-all buttons, the focus ring on non-field controls, pressed toggles and hearts (outlined, not filled), progress, hover on titles.
- Timings are a tabular column, always.
- Played rows are lit diyas; unplayed rows are unlit clay diyas.
- Motion is the pat: slow expo-out reveal, a hover peek, a delayed drape; everything else is quiet colour transition.

## Colors

A warm temple palette: velvet maroon ground, brass and gold metal, marigold flame, and one cool field of Krishna's Shyam blue.

### Primary
- **Zari Gold** (gold): display Devanagari, timings, selected section tabs, the zari border on the pat, borders at 20-45% opacity for every hairline and outline on dark grounds.
- **Temple Brass** (brass) and **Dark Brass** (brass-dark): the frame material: the solid 6px border of the up-next panel and editor player, the brass gradient that frames the board, scrollbar thumb, ornament strokes.

### Secondary
- **Marigold** (marigold) and **Deep Marigold** (marigold-deep): action and live state. Text selection, focus outline, the filled Play/Pause button and the "Play all N" pill, pressed icon toggles and the lit heart (marigold line and text on a 15% tint), the progress bar (deep to light gradient), the play triangle, title hover, the focused text-input border, the admin "Mark" button, error, overlap-warning and validation text, the sleep-timer "Cancel" item.

### Tertiary
- **Shyam Blue** (shyam) and **Shyam Lit** (shyam-lit): Krishna's colour, used only for the surfaces that hold lists and controls: the timings board, the up-next panel, the "Open the darshan" call, the katha list and clip cards, the sleep-timer menu, admin fields and lists, the toast. Shyam Lit is the row hover and the search field fill.
- **Mango Leaf** (leaf): toran leaves, garland leaves, kalash leaves, and the admin "Saved" status tint. Never a UI accent beyond confirmation.

### Neutral
- **Velvet** (velvet): the ground and the pat. Also the browser theme colour.
- **Velvet Deep** (velvet-deep): the html background under the tile, text on marigold, the error veil inside the shrine.
- **Velvet Lit** (velvet-lit): hover fill for destructive icon buttons on the velvet ground.
- **Ivory** (ivory): primary text on velvet and on Shyam.
- **Sandalwood** (sandal): secondary text on velvet: metadata lines, captions, footer, unselected tab text, field labels.
- **Mist** (mist): secondary text on Shyam: counts, durations, category tags, placeholders.

### Named Rules
**The Two Grounds Rule.** Text colour follows the ground it sits on: Sandalwood is the secondary text on velvet, Mist is the secondary text on Shyam. Never swap them.

**The Marigold Means Live Rule.** Marigold marks what is happening or what you can act on now (focus, pressed, favourited, progress, play). Gold marks what is (timings, headings, selected section). Don't use marigold as decoration.

**The Shyam Holds Lists Rule.** Any list of clips or kathas sits on a Shyam surface (a brass edge on the board, katha list and up-next panel; a gold hairline on the library's poster cards). Lists are never laid directly on the velvet.

## Typography

**Display Font:** Yatra One (with Tiro Devanagari Hindi, serif)
**Title Font:** Tiro Devanagari Hindi (with serif)
**Body Font:** Mukta 400/500/600/700 (with system-ui, sans-serif)

**Character:** A festive hand-painted Devanagari display over a scholarly Devanagari serif for every bhajan name, with Mukta carrying UI and metadata in both scripts. All three load Devanagari and Latin subsets through next/font.

### Hierarchy
- **Display** (Yatra One 400, 1.45-2rem, line-height 1): Devanagari headings only, in Zari Gold: the brand श्रवणं कीर्तनं (1.75rem phone, 2rem desktop), the board title दर्शन समय (1.9rem), आगे के दर्शन (1.45rem). Each is paired with a smaller English gloss in Mukta beside it.
- **Headline** (Tiro 400, clamp(1.6rem..2.4rem), line-height 1.15, balanced wrap): the clip title on the clip page, the featured "आज का भजन" title under the home shrine, the library's selected-katha heading (to 2.2rem); admin page titles at 2rem.
- **Title** (Tiro 400, 1.05-1.2rem, snug): every bhajan name in a list row; Ivory, turning Marigold on hover.
- **Body** (Mukta 400, 1.0625rem, line-height 1.55): metadata lines, credits, tips. Footer credit capped at 60ch.
- **Lyrics** (Tiro 400, 1.2rem, line-height 1.9, whitespace preserved): the "भजन के बोल" panel; the generous leading is for reading verses aloud, and line breaks are the author's.
- **Timing** (Mukta 600, 0.84rem phone / 0.98rem desktop, tabular numerals): start to end times in Zari Gold, with an en dash.
- **Label** (Mukta 600, 0.78-0.85rem, uppercase, 0.12-0.16em tracking): video-group headings in the board and admin list (followed by a gold hairline), category tags under a row and on clip cards (section · length), the English word under each header link, the Latin transliteration of the brand.

### Named Rules
**The Tabular Timings Rule.** Every time and duration uses tabular numerals (the `.tabular` class) and, in lists, sits in its own fixed-width grid column (6.6rem phone, 8.4rem desktop on the board; 9.5rem in admin) so times align top to bottom.

**The Lang Attribute Rule.** Every Devanagari string carries `lang="hi"`; mixed titles take their lang from the title itself, and an English gloss nested inside Hindi carries `lang="en"`.

**The Gloss Rule.** A Devanagari display heading is followed on the same baseline by its plain English meaning in smaller Mukta (Sandalwood on velvet, Mist on Shyam). The Devanagari leads; the English explains. Inside a running meta line the gloss runs the other way: the Yatra One Devanagari word sits inline in Gold at 1.1rem, with no heading or label above it.

## Layout

Two columns on desktop, one stack on phone, inside a 1520px container (16px gutters, 24px from 640px). Home: shrine left at 1.1fr, board right at 1fr from 1024px, shrine column sticky. Clip page: shrine left, a 340px (1024px+) or 380px (1280px+) aside right holding the title, metadata and up-next panel. Phone: shrine first, then the board or aside. Katha library: a 300px (340px from 1280px) list column left, the clip grid right (two columns on phone, auto-fill 220px cards from 640px), both exactly `--fit-h` tall on laptops; on phone the katha list becomes a horizontal scroller of 15.5rem entries. Admin: a single 960px column.

**Height is a hard constraint.** From 1024px the page is exactly one screen tall: the body is `h-svh` with overflow hidden, the header and footer keep their height, and `#content` is the flexible middle and a size container. `--fit-h` there is `100cqh - 2.75rem`, the real room left in `#content`. Only lists scroll inside themselves (board, katha list, clip grid, up-next, lyrics), marked `data-may-scroll` or with `overscroll-contain`. Under 1024px the page scrolls normally and `--fit-h` falls back to `100svh - --nav-h - 2rem`. The header is the toran strip (38px phone, 46px desktop) plus a 62px brand row, `--nav-h` (108px desktop, 100px under 768px). Everything that must be seen whole sizes against `--fit-h`, and must fit a 730px-tall laptop viewport (1536x730, 1486x754) as well as 1920x993.

- The shrine keeps its authored 1000 x 632 geometry plus 4% crown headroom for the kalash. Its width comes from `shrineMaxWidth(reserve)` = min(100%, (fit-h minus reserve) / (0.632 + 0.04)); the reserve is the content that must share the screen below it (4.5rem for the clip controls row, 9.5rem for the home title and meta).
- The clip page aside is capped at `--fit-h`; the up-next list and the lyrics panel scroll inside it (up-next with a 2.5rem fade mask at the bottom). On phone the lyrics panel is capped at 26rem.
- Containers that may scroll are marked `data-may-scroll`.
- Home: the shrine reserves 9.5rem for the featured-bhajan title and meta; there is no board scroll on the page itself.
- A `short:` custom variant (min-width 64rem and max-height 52rem) is declared for short laptop windows; the current build does not use it.

**Vertical rhythm** uses four tokens: head (1.5rem, heading to its content), block (2-2.5rem, between blocks in a group, used by admin forms and lists), group (3-4rem, between groups, used above the footer), and section-py (2.875-5.375rem, section padding, used by the not-found page). Inside the board and lists, spacing is tighter and component-local (12-16px).

### Named Rules
**The Fit-H Rule.** Never give a must-fit element a fixed height. Size it from `--fit-h` minus what must share the screen with it.

**The Shrine Geometry Rule.** The shrine's 1000 x 632 box and 4% crown are fixed; scale the whole shrine, never stretch or crop parts of it.

## Elevation & Depth

Depth is physical and ambient: objects in a dim temple cast soft, long, low shadows downward onto velvet. There are no hard offset shadows and no glow halos on UI surfaces; the only glow is the lit diya's own flame halo. The velvet itself carries depth through a lit radial crown at the top of the viewport falling to shadow at the bottom (background-attachment fixed), and the pat carries it through fold gradients.

### Shadow Vocabulary
- **Shrine cast** (`drop-shadow(0 22px 30px rgb(0 0 0 / 0.55))`): the brass frame on the velvet.
- **Board cast** (`box-shadow: 0 24px 48px -14px rgb(0 0 0 / 0.65)`): the framed timings board.
- **Panel cast** (`box-shadow: 0 18px 36px -10px rgb(0 0 0 / 0.55)`): the up-next panel.
- **Floating pill** (`box-shadow: 0 8px 20px rgb(0 0 0 / 0.45)`; toast at `0 10px 30px rgb(0 0 0 / 0.5)`): the "Open the darshan" call over the thumbnail, and the toast.
- **Menu cast** (`box-shadow: 0 16px 32px rgb(0 0 0 / 0.6)`): the sleep-timer popover, which opens upward from its button.
- **Poster card cast** (`box-shadow: 0 10px 22px -12px rgb(0 0 0 / 0.7)`): library clip cards.
- **Toran cast** (`drop-shadow(0 3px 3px rgb(0 0 0 / 0.45))`): the garland strip over the page.

### Named Rules
**The Hanging Objects Rule.** Only things that hang or stand in the shrine space (frame, board, panel, poster card, popover, toran, floating call) cast shadows, always downward and soft. Rows, tabs, chips, fields and buttons are flat, with one small exception: the round Play/Pause button carries a short contact shadow (`0 6px 14px -4px rgb(0 0 0 / 0.6)`) so it reads as pressed into the control row.

## Shapes

Two shape families. Interactive controls are pills: tabs, buttons, toggles, search, toast, status chips (9999px). Frames and surfaces are nearly square, as metal and wood would be: rows and poster thumbnails 3px, clip cards, popover and framed panels 4-5px, admin fields and notices 6px. The signature silhouette is the cusped nine-lobe mandir arch over straight jambs, with a scalloped tasselled hem on the pat; the loading placeholder echoes it with an arched top. Brass edges are solid borders (6px on the up-next panel, 5px on the editor player) or a 7px brass gradient padding (the board).

## Components

### Buttons
Round, warm and generous, sized for older thumbs.
- **Shape:** full pill (9999px); minimum 44px tall, 46-48px for admin actions.
- **Primary (admin save, sign in, add):** Zari Gold fill, Shyam text, semibold; hover to Marigold.
- **Mark (admin editor):** Marigold fill, Velvet Deep text, 46px; hover to a lighter marigold.
- **Ghost:** transparent with a gold 40% border, Sandalwood text; hover to full gold border and Ivory text.
- **Play / Pause (clip page):** 48px round Marigold fill, Velvet Deep icon, hover to #ffb32e. The single filled action on the page. **Play all N (library):** Marigold pill, 40px, play triangle, same fill.
- **Disabled:** 45-60% opacity, not-allowed cursor. Every pressable (button, tab, role=button, summary, select) shows the pointer cursor (cursor.css).
- **Focus:** a global 2px Marigold outline at 3px offset, declared in the base layer so any component can override it; the outline follows each element's own radius. Text inputs drop the outline and instead take a Marigold border plus a 1px Marigold ring.

### Section tabs
- **Style:** pill, 44px tall, gold 45% border, Sandalwood semibold label with a tabular Mist count.
- **State:** selected fills Zari Gold with Shyam text (count at Shyam 70%); hover lifts border to gold and text to Ivory. Implemented as a real tablist.

### Icon toggles (clip controls)
- **Style:** 44px circle, gold 35% border, Sandalwood 18px line icon.
- **State:** pressed is outlined, not filled: Marigold border, a 15% Marigold tint and Marigold icon; hover lifts to gold border and Ivory. Every toggle has an aria-label and title.
- **Heart (favourite):** an 18px line heart in Sandalwood; on, it fills and turns Marigold (aria-pressed). 44px with a gold 35% border beside the clip title, 40px bare at the end of each board row, 36px on a velvet 85% disc over a clip-card thumbnail.
- **Sleep timer:** a moon toggle opening a 13rem Shyam popover upward, gold 60% border, 4px radius, `menuitem` rows that hover to Shyam Lit, and a Marigold cancel item under a gold 25% rule.

### Chips (library)
- **Style:** 40px pill, gold 40% border, Sandalwood semibold 0.92rem. Used for day filters ("Day 3") and the library's section tabs.
- **State:** pressed or selected fills Zari Gold with Shyam text, matching the board's section tabs; hover lifts border to gold and text to Ivory.

### Cards / Containers
- **Timings board:** a 7px brass gradient frame (light gold to dark brass at 160deg) around a Shyam field with a 2px gold-40% rule under its header. Board cast shadow.
- **Up-next panel:** 6px solid brass border, 4px radius, Shyam field, panel cast.
- **Katha list (library):** the board treatment at 6px brass padding with a Shyam field, the Gold Devanagari "कथा संग्रह" display title and gloss, then entries (4.5rem poster thumbnail in a 3px radius, bold Ivory title, Sandalwood subline, Mist meta). The selected entry takes a Shyam Lit fill with a gold 70% border. Entries "My bhajans" (person: the videos you added), "Liked" (heart) and "Recently played" (clock) sit first.
- **Clip card (library):** 4px radius, gold 30% border on Shyam, 16:9 poster with a Velvet pill for the day (top left) and a Shyam pill for the timing (bottom right, Gold, tabular), then a diya, a Tiro title and a Mist uppercase "section · length" label; the heart rides the top right. Hover lifts the border to Marigold and the title to Marigold, and the poster scales 1.04 over 500ms.
- **Lyrics panel:** inside the aside panel, behind a "भजन के बोल / आगे के दर्शन" tablist (Yatra tab labels 1.15-1.25rem with an English gloss from 640px; selected tab takes a Shyam Lit fill and Gold text); 1.2rem Tiro, 1.9 leading.
- **Admin list:** 6px radius, gold 25% border, Shyam at 70%, gold 15% dividers.

### Inputs / Fields
- **Style:** 48px tall (the lyrics and bulk-paste textareas use the same 6px radius, Shyam fill and gold 35% border; bulk paste is monospace, a 0.95rem exception for pasted columns), 6px radius, gold 35-40% border, Shyam fill, Ivory text, Mist placeholder; Marigold caret.
- **Search:** pill, 44px (40px in the library), Shyam Lit fill, leading Mist search icon, clear button when filled.
- **Focus:** the border goes to Marigold with a 1px Marigold ring and no outline (library and board search, bulk paste); admin text fields still go to full Zari Gold.
- **Error:** border Marigold (aria-invalid), message in Marigold below.

### Navigation
The header is the toran strip and a brand row: mor pankh feather (tilts on hover), श्रवणं कीर्तनं in Yatra gold, the Latin name as a tracked uppercase label from 640px; the brand returns home. At the right sit two pill links, दर्शन समय and कथा संग्रह (Yatra gold, 0.98rem phone / 1.15rem desktop, with a small tracked English word beneath from 640px). Idle they carry a transparent border; hover shows a gold 50% border; the current page takes a gold 70% border and a Shyam 70% fill (aria-current). A skip-to-content link appears on focus as a Gold pill at the top left. The footer credit (speaker, channel link, unofficial-fan line, and the Bhagavatam 7.5.23 verse in Tiro) sits under a gold 20% top rule on every page.

### Board row (signature)
A link row in a grid: diya (22-24px), timing column, title (Tiro, Ivory) with a category label under it when unfiltered, and duration in Mist on desktop. Hover fills Shyam Lit and turns the title Marigold. Rows are grouped under their source video with a label heading and a gold hairline.

### Featured bhajan (home)
Under the shrine, a centred block: "आज का भजन" is carried by the inline Yatra gloss inside the meta line (no kicker above the title), the title in Tiro headline that turns Marigold on hover, then a Sandalwood line with the tabular Gold time, length, and a katha link, and the credit line. Max width 34rem.

### The Shrine (signature)
Brass mandir frame (cusped arch, lotus moulding, kalash crown, pillars, plinth), a three-swag marigold garland always in front, the video rectangle inside a sanctum gradient, and two velvet pat halves clipped to the arch. Closed, a floating "Open the darshan" pill (Shyam 90%, gold 80% border, marigold play triangle) sits over the thumbnail. Hover peeks the halves apart 7%. Opening slides each half 102% aside over 1.15s on an expo-out curve, then the gathered drapes fade and drop in over each pillar after 0.35s. Reduced motion makes both instant. Errors replace the video with a Velvet Deep veil and an "Open on YouTube" link.

### Diya (signature)
A clay lamp beside every row. Unlit: dark clay with a bare wick. Lit (played on this device): warm clay with a two-layer flame flickering on a 2.6s loop, stopped under reduced motion.

## Do's and Don'ts

### Do:
- **Do** size every must-fit element (shrine, controls row, aside, any modal) from `--fit-h` and check it at 1920x993, 1728x960, 1486x754 and 1536x730 plus phone widths.
- **Do** keep the shrine at its 1000 x 632 geometry with 4% crown headroom, scaled through `shrineMaxWidth(reserve)`.
- **Do** keep timings in one tabular column, Zari Gold, start to end with an en dash.
- **Do** put `lang="hi"` on every Devanagari string.
- **Do** put lists of clips on Shyam inside a brass edge, with diyas marking played state.
- **Do** use the head, block, group and section-py tokens for vertical spacing between blocks and sections.
- **Do** keep tap targets at 44px or more (40px is the floor for dense library chips and search; hearts on rows are 40px).
- **Do** keep laptops exactly one screen tall and let only lists scroll inside themselves.
- **Do** use the one filled Marigold control per surface for the primary action (Play/Pause, Play all); every toggle stays outlined.
- **Do** keep the credit to Pujya Shri Indresh Upadhyay Ji Maharaj and the BhaktiPath channel visible on every page.

### Don't:
- **Don't** let the pat cover the video once it is open; the opened pat hangs only over the pillars.
- **Don't** list clips on the home board or in up-next as a thumbnail grid; there they are names against times. Poster cards belong to the katha library only, and never sit loose on the velvet.
- **Don't** put a kicker or eyebrow label above a heading; uppercase tracked labels are for video-group headings, category tags and the brand transliteration only.
- **Don't** use hard offset shadows or glowing UI; shadows are soft, downward and only on hanging objects (a lit diya's flame halo is the flame, not a UI glow).
- **Don't** use marigold decoratively, or swap Sandalwood and Mist between grounds.
- **Don't** give a must-fit element a fixed pixel height that only fits a tall screen.
- **Don't** replace authored SVG ornament with icon-font glyphs, emoji or stock art.
