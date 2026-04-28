# Headout Web UI Kit

High-fidelity recreation of the **headout.com** marketing + discovery surface (homepage). Built as a click-through prototype.

## What's covered
- Top nav with logo, search affordance, locale, sign-in
- Hero with search box + suggestion chips
- Value-prop row (4 tinted cards)
- City tiles (6-col grid, gradient scrim + label overlay)
- Experience card rows (2 rows, 4 cards each) — image, badge, heart-to-wishlist, rating, price/strike/% off
- Detail modal with features, mobile-ticket affordance, Book Now CTA
- Purple promo strip with Hola-Yellow CTA
- Category tiles (5-col vertical aspect)
- Theme pill filter
- Trust stats row (50M+, 24×7, 200+)
- Dark footer

## What's NOT covered (out of scope without source)
- Actual checkout / date-picker / pax selection
- Post-auth experience (saved trips, account)
- City landing pages (inventory, filters, map)
- Mobile responsive beyond base
- iOS/Android apps (no source)

## Files
- `index.html` — mounts the app
- `styles.css` — all component CSS, imports `../../colors_and_type.css`
- `components.jsx` — all React components exported to window

## Interactions
- Click a heart → toast + wishlist state
- Click an experience card → detail modal
- Click search / chip / city tile → toast confirming action
- Click Book now in modal → toast + close
