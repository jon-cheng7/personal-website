# personal-website

Complete rebuild of Jon's personal site — resume, portfolio, and creative
showcase (art, photography, code, more TBD).

## Status

This is a bare scaffold, not a design. Structure only: routing, a nav
pattern, an accessible/responsive CSS foundation, and a simple content
convention for the photo gallery. No visual design has been decided yet —
that's deliberate, full creative freedom is still on the table.

## Non-negotiables

- Works well across phones, tablets, laptops, and desktop monitors.
- Fast. No dependency gets added "for free" — every addition should earn
  its weight against this.

## Running it

```
pnpm install
pnpm dev
```

## Adding a photo

1. Drop the image file in `public/photos/` (export around 2400–3000px on
   the long edge — sharp on a retina laptop screen without bloating the
   repo).
2. Add one entry to the `photos` array in `content/photos.ts`.

That's the whole workflow — no CMS, no external service, no build step
beyond the normal `pnpm dev` / deploy.

## Nav

Edit `content/nav.ts` to add, remove, or reorder pages in the nav bar.

## What's intentionally not here yet

- Any visual design system (colors, type, layout language) — wide open.
- Tailwind or any CSS framework — not decided; add it if/when you want it.
- Animation libraries — default posture is plain CSS transitions; add a
  library only when a specific effect earns the extra weight.
- The resume page (planned: auto-synced PDF from a private LaTeX repo).
- Everything beyond Home + one placeholder page.
