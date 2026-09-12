# personal-website

Complete rebuild of Jon's personal site — resume, portfolio, and creative
showcase (art, photography, code, more TBD).

## Status

This is a bare scaffold, not a design. Structure only: routing, a nav
pattern, an accessible/responsive CSS foundation, a scroll-animation
foundation, and a simple content convention for the photo gallery. No
visual design has been decided yet — that's deliberate, full creative
freedom is still on the table.

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

## Scroll animation foundation

Built for an Apple-product-page style of landing page: scroll-driven,
animation-heavy, highly interactive. The pieces:

- **`components/smooth-scroll.tsx`** — mounts Lenis (inertia-eased
  scrolling) globally, synced to GSAP's ticker so ScrollTrigger and Lenis
  always agree on scroll position. Already wired into `app/layout.tsx`.
- **`lib/gsap.ts`** — registers the GSAP plugins in use (`ScrollTrigger`,
  `useGSAP`) exactly once. Import `gsap`, `ScrollTrigger`, and `useGSAP`
  from here, not directly from `gsap`/`@gsap/react`, so registration stays
  centralized as more plugins get added.
- **`components/scroll-reveal.tsx`** — a real, reusable primitive: fades
  + slides content in once as it scrolls into view. Wrap any section that
  should animate in.
- The old "pin + scrub" reference demo (`components/pinned-scrub-example.tsx`
  and the `/scroll-demo` route) has been removed now that its pattern is
  proven out in `components/horizontal-scroll.tsx`. The pattern itself —
  pin a section, scrub a timeline against `ScrollTrigger`, gate the whole
  thing behind `prefers-reduced-motion` — is what to copy from if a future
  section needs its own pinned/scrubbed animation.

Every animated piece here checks `prefers-reduced-motion` and falls back
to a calm, static state — same rule as everything else on this site. Any
new scroll animation you add should do the same.

Performance note specific to this direction: the goal is a light,
fast-loading shell with rich, deliberately-engineered animation on top —
not a monolithic heavy bundle. As real sections get built, especially any
scroll-scrubbed image/video sequences, keep them code-split/lazy-loaded
and expect a simplified treatment on mobile rather than the full desktop
version everywhere.

## What's intentionally not here yet

- Any visual design system (colors, type, layout language) — wide open.
- Tailwind or any CSS framework — not decided; add it if/when you want it.
- The resume page (planned: auto-synced PDF from a private LaTeX repo).
- Everything beyond Home + the stand-in About Me / Resume / Art pages.
