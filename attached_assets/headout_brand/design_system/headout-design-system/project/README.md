# Headout Design System

A brand + UI system recreation for **Headout** — "home to the world's most exceptional experiences." An OTA-style marketplace for tours, tickets, shows, and activities across 200+ cities.

## Sources used

- **Canva brand kit (Headout team):** screenshots of the Colors panel were attached — the hex codes in `colors_and_type.css` are read directly from there. Palettes captured: Primary (Purps `#8000FF`, Candy `#FF0076`, White, Black), Secondary (Dreamy Pale, Peachy Orange, Joy Mustard, Hola Yellow, Subtle Green, Okay Green, Ocean Blue, Link Blue), Backgrounds (cream / peach / mint / sage / blush / pink / lilac tints), Grays.
- **Brand deep-dive page:** https://brand.headout.com — the canonical write-up of the 2021 rebrand (Purps, Candy, the blimp, Halyard type family).
- **Live product:** https://www.headout.com — structure, component patterns, imagery, copy voice.
- **Logo SVG:** `https://cdn-imgix-open.headout.com/logo/svg/Headout_purps.svg` (copied to `assets/logos/headout-purps.svg`).
- **Image CDN:** `cdn-imgix.headout.com` + `cdn-imgix-open.headout.com` — imagery and promo assets were sourced here; representative stills are copied into `assets/images/`.
- **Press kit:** https://drive.google.com/drive/folders/0ByDNVLX3IbQ9Y3FaLVF0ZUhmNzQ (not fetched — Google Drive auth; listed for reference).

> **No private codebase or Figma file was attached.** Core brand tokens are verified from the Canva kit; UI component patterns (buttons, cards, nav) were reconstructed by reading the live headout.com HTML/CSS. If you have the internal Figma component library, attach it and the UI kit can be tightened to pixel parity.

---

## Index

| File / folder | What's in it |
|---|---|
| `README.md` | This file. Brand context, content + visual foundations, iconography notes. |
| `colors_and_type.css` | CSS variables for colors, type scale, spacing, radii, shadows, motion. Import this first. |
| `SKILL.md` | Agent Skill entry point. Cross-compatible with Claude Code. |
| `assets/logos/` | Headout wordmark + lockups (SVG). |
| `assets/images/` | Representative city tiles, experience stills, hero imagery from the live CDN. |
| `preview/` | Small HTML cards used by the Design System tab (type specimens, swatches, components). |
| `ui_kits/web/` | High-fidelity recreation of the Headout.com marketing + booking surfaces. Click-through homepage with nav, hero, value-prop cards, city tiles, experience rows, detail modal, promo strip, themes, trust row, footer. |
| `fonts/` | (empty — see Typography section below for the Halyard → Manrope substitution.) |

**Quick start:** import `colors_and_type.css` at the top of any new HTML file, then use the tokens (`var(--color-purps)`, `var(--font-display)`, `var(--radius-md)`, etc.). Copy assets from `assets/` rather than referencing external CDNs. For full interactive patterns, see `ui_kits/web/`.

---

## Brand at a glance

Headout sells a feeling more than a product: **"unusual and unabashed,"** a rejection of the sea of red and green in the OTA/travel space. The 2021 rebrand was explicitly about picking a **polarising** palette — Purps (violet) + Candy (hot pink) on Slate Black — to stand out among OTAs dominated by reds, greens, and navy blues. The mascot is a softened, window-less **blimp** that sits alongside the wordmark; it predates the rebrand and was retained. Copy is confident, playful, and a little cheeky — see CONTENT FUNDAMENTALS below.

Products represented:
1. **headout.com (web)** — the marketing + booking surface. City landing pages, category pages, product detail pages, checkout. This is what the UI kit in `ui_kits/web/` recreates.
2. **Headout mobile apps** (iOS + Android) — exist but no public codebase/Figma was provided; not built here.
3. **Hub / partner dashboard** (hub.headout.com), **affiliate portal**, **Creators program** — exist as linked surfaces on the footer but are out of scope.

---

## CONTENT FUNDAMENTALS

Headout's voice is **confident, playful, and direct** — written like a smart friend recommending something, not a travel agent upselling you. Copy is short, declarative, and uses sentence case almost everywhere. Punchlines earn their place; there is often a subtitle that reframes the benefit with a wink.

### Tone rules
- **Second person, always.** "We do the hard work so you don't have to."
- **Contractions are fine and encouraged** ("we'll", "don't", "aren't").
- **Sentence case for headings and CTAs.** Never TITLE CASE except for proper nouns and the occasional ALL-CAPS micro label.
- **No hard sell.** Value is stated as a fact, not a promise. "Not cocky, just confident."
- **Brevity > completeness.** Section titles are 2–5 words; supporting sentences are one line.
- **Playful contrasts** — headings often subvert a familiar phrase: _"Greed is good"_, _"No pain, only gain"_, _"Experience every flavour"_.
- **Exclamations used sparingly** — reserved for moments of genuine delight ("We can't wait for you to take it for a spin!"). Not on every heading.

### Concrete examples from the live product
- Hero: "The world's best experiences curated just for you"
- Value prop headings: _"Only the finest"_ / _"Greed is good"_ / _"Experience every flavour"_ / _"No pain, only gain"_
- Trust block: "We've served 50 million+ guests and we are here for you"
- Badges on cards: `Free cancellation` · `Selling out fast` · `20% off` (lowercase sentence case, short)
- Footer quip on app download: "Download the Headout app" (no exclamation, just calm)

### What to avoid
- ❌ TITLE CASE HEADINGS
- ❌ Corporate filler ("seamlessly deliver end-to-end experiences")
- ❌ Over-exclamation. One per screen max.
- ❌ Emoji as decoration in product UI (but emoji DO appear in brand storytelling on brand.headout.com — ✨ 👋 💅 🤗 — as section markers on long-form editorial pages. Don't port this into product UI.)

---

## VISUAL FOUNDATIONS

### Colors
Three pillars + a supporting palette. All tokens live in `colors_and_type.css`.

- **Purps `#8000FF`** — primary brand. Used for the logo, primary CTAs on brand surfaces, links, focus rings, and the purple wash on promotional backgrounds.
- **Candy `#E5006E`** — accent. Used for discount percentages, "selling out fast" badges, some promotional CTAs. Not an alternate brand colour — a _spark_.
- **Slate Black `#1A1A1A`** — all primary text. Never pure `#000`.
- **White `#FFFFFF`** — default page background. Headout is a light-first brand.

Supporting (used for status, illustration accents, soft tints): Dreamy Pale, Peachy Orange, Joy Mustard, Hola Yellow, Subtle Green, Okay Green, Ocean Blue, Link Blue, Warning Red. Soft tints (`--bg-brand-soft`, `--bg-accent-soft`, etc.) are used for section washes and selected/hover states, not as primary fills.

### Typography
Halyard Type Family by Darden Studio — **Halyard Display** for headings (rounded, large x-height, geometric) and **Halyard Text** for body (optimised for small-size reading).

> ⚠️ **Font substitution flagged.** Halyard is a commercial face and is not redistributable. This system uses **Manrope** (Google Fonts) as the substitute — it has a similarly large x-height, geometric-humanist construction, and clean terminals. If you have Halyard licensed, drop the webfont files into `fonts/` and swap `--font-display` / `--font-text` in `colors_and_type.css`.

Headout's type hierarchy runs tight and large on marketing surfaces, then pulls in to a compact 15/16px body inside product cards and detail pages. The type scale in the CSS reflects both.

### Spacing + radii
- **4px grid**, with a preferred scale of 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80.
- **Radii lean medium-soft:** cards are `--radius-lg` (16px), buttons are `--radius-pill` (fully rounded), inputs `--radius-md` (12px), image tiles `--radius-lg` or `--radius-xl`. Never sharp-corner.

### Backgrounds + imagery
- **Light-first.** Pages are white with faint slate-50/100 sections to separate blocks. Dark sections are reserved for promotional/brand moments — purps wash with a product still beneath.
- **Photography is warm, saturated, outdoor/golden-hour.** Shot with real guests or clearly-staged "you could be here" moments. Grain-free, high-contrast, no filters on top. Always full-colour — no B&W.
- **Full-bleed hero imagery** with a gradient protection scrim (`linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)`) when text overlays.
- **No hand-drawn illustrations** in the product. Illustration appears only around the blimp mascot and on brand storytelling pages. Don't invent new illustration.
- **No repeating patterns or textures** in product UI. The purps wash is a flat fill, not a gradient, not noise.

### Motion
- **Fades and gentle slides.** ~200ms with `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-out). No bounces, no springs, no staggered entrances beyond carousels auto-advancing.
- **Hover states:** darker fill on buttons (`--color-purps-hover`), slight lift on cards (`translateY(-2px)` + `--shadow-lg`), no opacity tricks.
- **Press states:** even darker fill (`--color-purps-pressed`), no scale shrink on primary surfaces. On touch/mobile buttons, a subtle `scale(0.98)` is OK.
- **Focus:** `--shadow-focus` (3px purps halo at ~28% opacity). Always visible, never removed.

### Borders, shadows, elevation
- **Hairlines are `--border-1` (`#E6E6E9`)** — borders do the structural work; shadows are subtle.
- **Cards are the dominant primitive.** `background: white; border-radius: 16px; border: 1px solid #E6E6E9;` with `--shadow-sm` at rest and `--shadow-md` on hover. No hard drop shadows — everything is soft, 8–24px blur, y-offset 2–12px, ≤10% black.
- **No inner shadows.** Insets are communicated by background colour, not shadow.
- **No left-border accent cards.** (Common AI-slop tell. Headout doesn't use this pattern.)

### Layout + structure
- **Container max-width ~1232px**, 16–24px side gutters on mobile, 32–48px desktop.
- **Sticky top nav** with white bg + hairline bottom border on scroll.
- **Carousels with arrows**, not grids, for hero content rows. Arrows are white-filled circles with `--shadow-md`, offset inside the row.
- **Cards in grids of 2 (mobile), 3–4 (tablet), 5–6 (desktop)** for city/category tiles.

### Transparency + blur
- Rarely used. Sticky nav scroll state is solid white with hairline, not a blur. Modals use a **flat slate-900 at 40% opacity** overlay, no backdrop-filter blur.
- Text on images uses a **gradient scrim**, not a blur.

---

## ICONOGRAPHY

Headout.com uses a small, consistent set of thin stroke icons (~1.5px stroke, rounded joins) for product affordances — chevrons, close (×), search glass, calendar, clock, user, heart, share, info (i). They're inline SVGs, not a hosted icon font; the set isn't published.

### This system's approach
- **Lucide Icons (via CDN)** is substituted as the default icon set — it is open-source, matches Headout's stroke weight (1.5–2px), rounded corners, and geometric balance. This is flagged as a **substitution** — the real Headout set is custom and slightly more condensed.
- Icons are rendered at **16px / 20px / 24px** depending on context. 16px inside dense meta rows, 20px inside buttons, 24px for standalone navigation.
- **Colour:** icons inherit text colour (`currentColor`). Never use Purps or Candy for generic UI icons — only for indicative moments (active nav, favourited heart → Candy fill).

### Logos + mascot
- `assets/logos/headout-purps.svg` — horizontal wordmark + blimp, in Purps. This is the primary lockup. A white-on-purps variant is used on dark promotional surfaces; render the SVG with `fill: #FFFFFF` via CSS to derive it.
- The blimp alone sometimes acts as an app icon / favicon.

### Emoji
- **Not used in product UI.** Emoji appear in long-form brand/editorial writing (see the blog, brand.headout.com) as playful section markers. Do not port to product.

### Unicode characters
- Bullet: `·` (middle dot) is used between metadata items: `4.4 (39,128) · From $42.31`
- Arrow: `→` occasionally appears in "See all →" links. Not heavily stylised.

---

## Flags / caveats

1. **Halyard → Manrope** font substitution. If you have Halyard licensed, drop the files into `fonts/` and update `--font-display` / `--font-text`.
2. **Lucide → Headout-custom** icon substitution. Replace if the internal set is available.
3. **No mobile app UI kit.** Only the web marketing/booking surface was built — no Android/iOS kit because no source was available.
4. **Colour values inferred from the live site + brand page.** Purps and Candy hex codes are verified via the logo SVG and live CSS; supporting palette hexes are approximations reading from the brand page's rendered swatches. If you have the internal tokens file, reconcile.
5. **Checkout / auth / post-purchase flows** not recreated — only the discovery + product-detail funnel up to the "Book" click.
