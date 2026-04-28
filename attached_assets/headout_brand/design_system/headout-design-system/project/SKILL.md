---
name: headout-design
description: Use this skill to generate well-branded interfaces and assets for Headout — the experiences marketplace — either for production or throwaway prototypes, mocks, slides, and marketing pages. Contains the essential design guidelines, colors, type, fonts, assets, and UI-kit components to prototype anything on-brand.
user-invocable: true
---

# Headout Design Skill

Headout is an experiences marketplace ("home to the world's most exceptional experiences"). The brand is deliberately polarising — **Purps** (violet `#8000FF`) and **Candy** (hot pink `#FF0076`) on Slate Black, with warm pastel section washes. Copy is confident, playful, second-person. The mascot is a softened blimp that sits alongside the wordmark.

## How to work with this skill

1. **Read `README.md`** for the full brand context: sources, content fundamentals (voice, casing, emoji rules), visual foundations (color, type, spacing, motion, hover/press, shadows, radii, imagery), and iconography guidance.
2. **Import `colors_and_type.css`** in any HTML file you create — it defines every color, type, spacing, radius, shadow, and motion token as CSS custom properties.
3. **Reference the preview cards** in `preview/` if you need to see how a token renders.
4. **Lift components from `ui_kits/web/`** when prototyping any Headout surface — it contains a working homepage with nav, hero, experience cards, detail modals, promo strips, trust rows, and footer. Treat it as a parts bin.
5. **Copy assets out of `assets/`** — logos, city photos, experience stills, category tiles. Never draw icons/logos yourself; use what's here or flag a substitution.

## When invoked without further guidance

Ask the user what they want to build or design. Offer concrete options: a marketing page, a product card grid, a city landing page, an email, a social post, a slide deck, a pitch artifact. Then ask the usual design questions (audience, length, tone, variations), and act as an expert Headout designer — outputting either HTML artifacts or production code, depending on the need.

## Rules of the brand

- **Purps (`#8000FF`) is for primary CTAs, links, and active states.** Use it sparingly but confidently.
- **Candy (`#FF0076`) is for urgency, hearts, hot badges.** Not for body text, not for large fills.
- **Hola Yellow (`#FDE74C`) is the CTA color on dark/purple backgrounds.** Keep that pairing.
- **Body copy is Manrope** (or Halyard if licensed). **Display is Manrope 800.** Letter-spacing tightens as size grows.
- **Sentence case almost everywhere.** No all-caps shouting. Contractions are fine.
- **Radii are medium (12–16px) for cards, pill (999px) for buttons + search.** No sharp corners, no heavy borders — the design leans on soft shadows and tinted backgrounds.
- **Imagery is warm, saturated, human.** Real travel photography; no illustrations, no stock-looking renders.
- **No emoji.** No bluish-purple gradients. No rounded-corner-with-left-border-accent cards. No invented SVG icons — use Lucide 1.75px-stroke substitutes if a needed glyph isn't in `assets/`.

## Output conventions

- **HTML artifacts** (slides, mocks, marketing pages): copy assets out of `assets/` into your working folder, import `colors_and_type.css`, and reference the UI-kit components for patterns.
- **Production code:** lift the token values from `colors_and_type.css` into whatever your target system uses (Tailwind config, design tokens, SCSS vars, etc.). The UI kit is cosmetic, not production-grade — use it as a visual reference, not a dependency.
